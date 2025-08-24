import { supabase } from "@/lib/supabase";

export const loyaltyPointsApi = {
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

          client:clients (
            id, name
          ),

          location:client_locations (
            id, name, address_line1,
            barangay:barangays(name),
            city:cities(name)
          ),

          appointment:appointments (
            id,
            service:services(id, name),
            devices:appointment_devices (
              device:devices (
                id,
                name,
                brand:brands(name),
                ac_type:ac_types(name),
                horsepower:horsepower_options(display_name)
              )
            )
          )
        `,
        { count: "exact" }
      )
      .eq("client_id", clientId)
      .range(from, to);

    if (error) throw error;

    return { data, count: count || 0 };
  },
};
