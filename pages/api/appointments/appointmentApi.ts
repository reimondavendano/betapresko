// src/api/appointmentApi.ts
import { supabase } from '../../../lib/supabase'; // Adjust path as needed
import { Appointment, AppointmentWithDetails, UUID } from '../../../types/database'; // Import Appointment and UUID types


interface AppointmentQuery {
  clientId?: string;
  status?: string;
  dateFilter?: "all" | "today" | "incoming" | "previous";
  specificDate?: string;
  page?: number;
  limit?: number;
}

export const appointmentApi = {
  /**
   * Creates a new appointment.
   */
  createAppointment: async (newAppointmentData: Omit<Appointment, 'id' | 'created_at' | 'updated_at' | 'status'>): Promise<Appointment> => {
    // Supabase will automatically generate 'id', 'created_at', 'updated_at'
    // 'status' defaults to 'pending' as per your database schema
    const { data, error } = await supabase
      .from('appointments')
      .insert([
        {
          client_id: newAppointmentData.client_id,
          location_id: newAppointmentData.location_id,
          service_id: newAppointmentData.service_id,
          appointment_date: newAppointmentData.appointment_date,
          appointment_time: newAppointmentData.appointment_time || null, // Allow null
          amount: newAppointmentData.amount,
          stored_discount: newAppointmentData.stored_discount, // Default to false if not provided
          total_units: newAppointmentData.total_units,
          notes: newAppointmentData.notes || null, // Allow null
          status: 'confirmed',
          discount_type: newAppointmentData.discount_type || 'Standard',
          stored_loyalty_points: newAppointmentData.stored_loyalty_points || 0,
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating appointment:', error);
      throw new Error(error.message);
    }
    return data as Appointment;
  },

  createAppointmentRedeem: async (newAppointmentData: Omit<Appointment, 'id' | 'created_at' | 'updated_at' >): Promise<Appointment> => {
    // Supabase will automatically generate 'id', 'created_at', 'updated_at'
    // 'status' defaults to 'pending' as per your database schema
    const { data, error } = await supabase
      .from('appointments')
      .insert([
        {
          client_id: newAppointmentData.client_id,
          location_id: newAppointmentData.location_id,
          service_id: newAppointmentData.service_id,
          appointment_date: newAppointmentData.appointment_date,
          appointment_time: newAppointmentData.appointment_time || null, // Allow null
          amount: 0,
          stored_discount: 0, // Default to false if not provided
          total_units: 1,
          notes: newAppointmentData.notes || null, // Allow null   
          status: 'redeemed',
          discount_type: "Standard",

          
          
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating appointment:', error);
      throw new Error(error.message);
    }
    return data as Appointment;
  },

  /**
   * Fetches all appointments for a given client ID.
   */
  getByClientId: async (clientId: UUID): Promise<Appointment[]> => {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('client_id', clientId)
      .order('appointment_date', { ascending: false }); // Order by most recent appointments first

    if (error) {
      console.error(`Error fetching appointments for client ${clientId}:`, error);
      throw new Error(error.message);
    }
    return data as Appointment[];
  },

    getAppointments: async ({
        clientId,
        status,
        dateFilter,
        page = 1,
        limit = 10,
      }: {
        clientId: string;
        status?: string;
        dateFilter?: "all" | "today" | string;
        page?: number;
        limit?: number;
      }) => {
        const offset = (page - 1) * limit;
        const today = new Date().toISOString().split("T")[0];

        let query = supabase
          .from("appointments")
          .select(
            `
              id, appointment_date, appointment_time, status, amount, total_units, notes, stored_discount, discount_type, stored_loyalty_points,
              clients:client_id(id, name, mobile, email),
              client_locations:location_id(id, name, address_line1),
              services:service_id(id, name),
              appointment_devices:appointment_devices(
                devices:device_id(
                  id,
                  name,
                  brands:brand_id(id, name),
                  ac_types(id, name),
                  horsepower_options(id, value, display_name)
                )
              )
            `,
            { count: "exact" }
          )
          .eq("client_id", clientId)
          .eq("status", status);

        // Filter by status
        if (status) {
          query = query.eq("status", status);
        }

        // Date filters
        if (dateFilter === "today") {
          query = query.eq("appointment_date", today);
        }  else if (dateFilter && dateFilter !== "all") {
          // 👈 Only run when it's an actual date string like "2025-08-25"
          query = query.eq("appointment_date", dateFilter);
        }

        // Pagination + ordering
        query = query.range(offset, offset + limit - 1);
        query = query.order("appointment_date", { ascending: false });

        const { data, error, count } = await query;

        if (error) throw error;

        // ✅ Normalize single-object relations
        const normalized = (data || []).map((a: any) => ({
          ...a,
          clients: a.clients || null,
          client_locations: a.client_locations || null,
          services: a.services || null,
          appointment_devices: a.appointment_devices || [],
        }));

        return {
          data: normalized as AppointmentWithDetails[],
          pagination: {
            page,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit),
          },
        };
    },




  /**
   * Updates appointment fields (for general appointment updates like rescheduling)
   */
  updateAppointment: async (appointmentId: UUID, updateData: Partial<Omit<Appointment, 'id' | 'created_at'>>): Promise<Appointment> => {
    const { data, error } = await supabase
      .from('appointments')
      .update({ 
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) {
      console.error(`Error updating appointment ${appointmentId}:`, error);
      throw new Error(error.message);
    }

    return data as Appointment;
  },

  getAppointment: async (appointmentId: UUID): Promise<Appointment | null> => {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (error) {
      console.error(`Error fetching appointment ${appointmentId}:`, error);
      return null;
    }
    return data as Appointment;
  },

  /**
   * Updates appointment status and sets device cleaning dates when status becomes 'completed'
   */
  updateAppointmentStatus: async (appointmentId: UUID, status: 'pending' | 'confirmed' | 'completed' | 'voided'): Promise<Appointment> => {
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .select()
      .single();

    if (appointmentError) {
      console.error(`Error updating appointment status ${appointmentId}:`, appointmentError);
      throw new Error(appointmentError.message);
    }

    // If appointment is marked as completed, update all associated devices' last_cleaning_date
    if (status === 'completed') {
      // fetch device ids from appointment_devices join table
      const { data: joins, error: joinError } = await supabase
        .from('appointment_devices')
        .select('device_id')
        .eq('appointment_id', appointmentId);
      if (joinError) {
        console.error(`Error fetching appointment_devices for appointment ${appointmentId}:`, joinError);
        throw new Error(joinError.message);
      }
      const deviceIds = (joins ?? []).map((j: any) => j.device_id);
      if (deviceIds.length > 0) {

        const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('id, name')
        .eq('id', appointment.service_id)
        .single();

        if (serviceError) {
          console.error(`Error fetching service for appointment ${appointmentId}:`, serviceError);
          throw new Error(serviceError.message);
        }

       if (service) {
          if (service.name.toLowerCase().includes('clean')) {
            // ✅ Cleaning → update last_cleaning_date
            const { error: deviceUpdateError } = await supabase
              .from('devices')
              .update({
                last_cleaning_date: appointment.appointment_date,
                updated_at: new Date().toISOString(),
              })
              .in('id', deviceIds);

            if (deviceUpdateError) {
              console.error(`Error updating device cleaning dates for appointment ${appointmentId}:`, deviceUpdateError);
              throw new Error(`Failed to update device cleaning dates: ${deviceUpdateError.message}`);
            }
          } else if (
            service.name.toLowerCase().includes('repair') ||
            service.name.toLowerCase().includes('maintenance')
          ) {
            // ✅ Repair/Maintenance → update last_repair_date
            const { error: deviceUpdateError } = await supabase
              .from('devices')
              .update({
                last_repair_date: appointment.appointment_date,
                updated_at: new Date().toISOString(),
              })
              .in('id', deviceIds);

            if (deviceUpdateError) {
              console.error(`Error updating device repair dates for appointment ${appointmentId}:`, deviceUpdateError);
              throw new Error(`Failed to update device repair dates: ${deviceUpdateError.message}`);
            }
          }
        }
      }
    }

    return appointment as Appointment;
  },

  /**
   * Fetches all appointments (for admin use)
   */
  getAllAppointments: async (): Promise<Appointment[]> => {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        clients:client_id(name, mobile, email),
        client_locations:location_id(name, address_line1, barangay_id, city_id,
          cities:city_id(name),
          barangays:barangay_id(name)
        ),
        services:service_id(name)
      `)
      .order('appointment_date', { ascending: false });

    if (error) {
      console.error('Error fetching all appointments:', error);
      throw new Error(error.message);
    }
    return data as Appointment[];
  },
};
