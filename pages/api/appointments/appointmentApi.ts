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
          status: 'confirmed', // Explicitly set status to 'pending'
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
};
