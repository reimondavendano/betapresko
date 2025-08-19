// src/api/appointmentApi.ts
import { supabase } from '../../../lib/supabase'; // Adjust path as needed
import { Appointment, UUID } from '../../../types/database'; // Import Appointment and UUID types

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
          total_units: newAppointmentData.total_units,
          notes: newAppointmentData.notes || null, // Allow null
          status: 'confirmed',
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
        clients:client_id(name, mobile),
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
