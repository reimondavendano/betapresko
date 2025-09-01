// src/api/loyaltyPointsApi.ts
import { supabase } from "@/lib/supabase";

export const loyaltyPointsApi = {
  /**
   * Fetch paginated loyalty points history for a client
   */
  getLoyaltyPoints: async (clientId: string, page = 1, pageSize = 5) => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from("loyalty_points")
      .select(
    `
      id,
      points,
      status,
      date_earned,
      date_expiry,
      client:clients (id, name),
      appointment:appointments (
        id,
        service:services (id, name),
        devices:appointment_devices (
          device:devices (
            id,
            name,
            brand:brands (name),
            ac_type:ac_types (name),
            horsepower:horsepower_options (display_name)
          )
        )
      )
        `,
        { count: "exact" }
      )
      .eq("client_id", clientId)
      .order("date_earned", { ascending: false })
      .range(from, to);

    if (error) throw error;

    return { data, count: count || 0 };
  },

      /**
     * Get latest expiry date for client's earned points
     * (you can choose min or max depending on business rules)
     */
    getClientPointsExpiry: async (clientId: string): Promise<string | null> => {
      const today = new Date().toISOString().split("T")[0]; // yyyy-mm-dd

      const { data, error } = await supabase
        .from("loyalty_points")
        .select("date_expiry")
        .eq("client_id", clientId)
        .eq("status", "Earned")
        .gt("date_expiry", today);

      if (error) throw error;

      if (!data || data.length === 0) return null;

      // 🟢 Option A: earliest expiry (soonest expiring points)
      const earliest = data.reduce((min, row) => {
        return row.date_expiry < min ? row.date_expiry : min;
      }, data[0].date_expiry);

      return earliest;

      // 🔵 Option B: if you prefer latest expiry
      // const latest = data.reduce((max, row) =>
      //   row.date_expiry > max ? row.date_expiry : max,
      // data[0].date_expiry);
      // return latest;
    },


  /**
   * Sum of valid earned points (active balance)
   */
  getClientPoints: async (clientId: string): Promise<number> => {
    const today = new Date().toISOString().split("T")[0]; // yyyy-mm-dd

    const { data, error } = await supabase
      .from("loyalty_points")
      .select("points, status, date_expiry")
      .eq("client_id", clientId)
      .eq("status", "Earned")
      .gt("date_expiry", today);

    if (error) throw error;

    return (data || []).reduce((sum, p) => sum + (p.points || 0), 0);
  },

  /**
   * Count number of referrals (appointment_id == null && is_referral == true)
   */
  getReferralCount: async (clientId: string): Promise<number> => {
    const { count, error } = await supabase
      .from("loyalty_points")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .is("appointment_id", null)
      .eq("is_referral", true);

    if (error) throw error;

    return count || 0;
  },
};
