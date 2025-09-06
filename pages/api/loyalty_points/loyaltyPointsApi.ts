// src/api/loyaltyPointsApi.ts
import { supabase } from "@/lib/supabase";

export const loyaltyPointsApi = {
  /**
   * Fetch paginated loyalty points history for a client
   */
  getLoyaltyPoints: async (
    clientId: string, 
    page = 1, 
    pageSize = 5,
    statusFilter?: "all" | "Earned" | "Redeemed" | "Expired",
    dateFilter?: string
  ) => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
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
      .eq("client_id", clientId);

    // Apply status filter if not "all"
    if (statusFilter && statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    // Apply date filter if provided
    if (dateFilter) {
      query = query.gte("date_earned", `${dateFilter}T00:00:00`)
                   .lt("date_earned", `${dateFilter}T23:59:59`);
    }

    const { data, error, count } = await query
      .order("date_earned", { ascending: false }) // Show newest first
      .range(from, to);

    if (error) throw error;

    return { data, count: count || 0 };
  },

  createLoyaltyPoint: async (loyaltyPointData: {
      client_id: string;
      appointment_id?: string;
      points: number;
      status: "Earned" | "Redeemed" | "Expired";
      date_earned: string;
      date_expiry: string;
      is_referral?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("loyalty_points")
        .insert([loyaltyPointData])
        .select()
        .single();

      if (error) throw error;
      return data;
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

    },

  getRedemptionEventCount: async (clientId: string): Promise<number> => {
    const currentYear = new Date().getFullYear();
    
    // Get all redeemed points for current year
    // Use updated_at to track when the redemption actually happened
    const { data, error } = await supabase
      .from("loyalty_points")
      .select("date_earned, created_at, updated_at, status")
      .eq("client_id", clientId)
      .eq("status", "Redeemed")
      // Check when the redemption happened (updated_at), not when points were earned
      .gte("updated_at", `${currentYear}-01-01T00:00:00`)
      .lt("updated_at", `${currentYear + 1}-01-01T00:00:00`);

    if (error) throw error;

    // Group by redemption date (when status was changed to Redeemed)
    // Points redeemed in the same transaction are counted as one event
    const redemptionDates = new Map<string, number>();
    
    data?.forEach(point => {
      // Use updated_at as the redemption date
      const redemptionDate = new Date(point.updated_at).toDateString();
      redemptionDates.set(redemptionDate, (redemptionDates.get(redemptionDate) || 0) + 1);
    });

    // Count unique redemption events (unique dates)
    return redemptionDates.size;
  },

  getRedemptionEventCountAccurate: async (clientId: string): Promise<number> => {
    const currentYear = new Date().getFullYear();
    
    const { data, error } = await supabase
      .from("loyalty_points")
      .select("updated_at, status")
      .eq("client_id", clientId)
      .eq("status", "Redeemed")
      .gte("updated_at", `${currentYear}-01-01T00:00:00`)
      .lt("updated_at", `${currentYear + 1}-01-01T00:00:00`)
      .order("updated_at", { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return 0;

    // Group redemptions that happened within 5 minutes of each other as one event
    let eventCount = 1;
    let lastRedemptionTime = new Date(data[0].updated_at);

    for (let i = 1; i < data.length; i++) {
      const currentTime = new Date(data[i].updated_at);
      const timeDiff = (currentTime.getTime() - lastRedemptionTime.getTime()) / 1000 / 60; // in minutes
      
      if (timeDiff > 5) {
        // If more than 5 minutes apart, count as a new redemption event
        eventCount++;
        lastRedemptionTime = currentTime;
      }
    }

    return eventCount;
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

   getReferralCountByUniqueDate: async (clientId: string): Promise<number> => {
    const { data, error } = await supabase
      .from("loyalty_points")
      .select("date_earned")
      .eq("client_id", clientId)
      .is("appointment_id", null)
      .eq("is_referral", true);

    if (error) throw error;

    // Count unique dates (assuming one referral per date)
    const uniqueDates = new Set((data || []).map(point => point.date_earned));
    return uniqueDates.size;
  },

  updateLoyaltyPointStatus: async (id: string, status: "Earned" | "Redeemed" | "Expired") => {
    const { data, error } = await supabase
      .from("loyalty_points")
      .update({ status })
      .eq("id", id)
      .select();

    if (error) throw error;
    return data?.[0];
  },

  /**
   * NEW: Get multiple redeemable loyalty points up to the total points needed
   * This handles fractional points by finding multiple records that sum to the target
   */
  getRedeemablePoints: async (clientId: string, targetPoints: number) => {
  // Only allow multiples of 5 points
    const redeemableTargetPoints = Math.floor(targetPoints / 5) * 5;
    
    if (redeemableTargetPoints < 5) return []; // Must have at least 5 points to redeem
    
    const { data, error } = await supabase
      .from("loyalty_points")
      .select("id, points, status, date_earned")
      .eq("client_id", clientId)
      .eq("status", "Earned")
      .order("date_earned", { ascending: true });

    if (error) throw error;

    const currentYear = new Date().getFullYear();
    
    // Find points to redeem that sum up to exactly redeemableTargetPoints
    const earnedPoints = data.filter(
      (p) =>
        p.status === "Earned" &&
        new Date(p.date_earned).getFullYear() === currentYear
    );

    const pointsToRedeem = [];
    let currentSum = 0;

    for (const point of earnedPoints) {
      if (currentSum >= redeemableTargetPoints) break;
      
      const pointsNeeded = redeemableTargetPoints - currentSum;
      
      if (point.points <= pointsNeeded) {
        // Take the entire point record
        pointsToRedeem.push({
          ...point,
          pointsToRedeem: point.points
        });
        currentSum += point.points;
      } else {
        // Take only part of this point record
        pointsToRedeem.push({
          ...point,
          pointsToRedeem: pointsNeeded
        });
        currentSum += pointsNeeded;
        break;
      }
    }

    // Only return if we have exactly the points needed
    return currentSum >= redeemableTargetPoints ? pointsToRedeem : [];
  },

  /**
   * NEW: Update multiple loyalty points to "Redeemed" status
   */
  // Alternative cleaner version - delete records with 0 points
  redeemMultiplePoints: async (pointsData: Array<{id: string, pointsToRedeem: number, points: number}>) => {
    if (pointsData.length === 0) return [];

    const updates = [];
    
    for (const pointData of pointsData) {
      if (pointData.pointsToRedeem === pointData.points) {
        // Redeem entire point record
        updates.push(
          supabase
            .from("loyalty_points")
            .update({ status: "Redeemed" })
            .eq("id", pointData.id)
        );
      } else {
        // Partial redemption
        const remainingPoints = pointData.points - pointData.pointsToRedeem;
        
        // Get original record to copy its data
        const { data: originalRecord, error: fetchError } = await supabase
          .from("loyalty_points")
          .select("*")
          .eq("id", pointData.id)
          .single();
          
        if (fetchError) throw fetchError;
        
        // Create new redeemed record
        updates.push(
          supabase
            .from("loyalty_points")
            .insert({
              client_id: originalRecord.client_id,
              appointment_id: originalRecord.appointment_id,
              points: pointData.pointsToRedeem,
              status: "Redeemed",
              date_earned: originalRecord.date_earned,
              date_expiry: originalRecord.date_expiry,
              is_referral: originalRecord.is_referral || false
            })
        );
        
        if (remainingPoints > 0) {
          // Update original record with remaining points
          updates.push(
            supabase
              .from("loyalty_points")
              .update({ points: remainingPoints })
              .eq("id", pointData.id)
          );
        } else {
          // Delete the original record if no points remain
          updates.push(
            supabase
              .from("loyalty_points")
              .delete()
              .eq("id", pointData.id)
          );
        }
      }
    }
    
    // Execute all updates
    const results = await Promise.all(updates);
    
    // Check for errors
    for (const result of results) {
      if (result.error) throw result.error;
    }
    
    return results.map(r => r.data).flat().filter(Boolean);
  },

  // Keep the old method for backward compatibility
  getNextRedeemable: async (clientId: string) => {
    const { data, error } = await supabase
      .from("loyalty_points")
      .select("id, status, date_earned")
      .eq("client_id", clientId)
      .order("date_earned", { ascending: true });

    if (error) throw error;

    const currentYear = new Date().getFullYear();
    const redeemedThisYear = data.filter(
      (p) =>
        p.status === "Redeemed" &&
        new Date(p.date_earned).getFullYear() === currentYear
    ).length;

    if (redeemedThisYear >= 3) return null;

    const oldest = data.find(
      (p) =>
        p.status === "Earned" &&
        new Date(p.date_earned).getFullYear() === currentYear
    );

    return oldest?.id || null;
  },
};