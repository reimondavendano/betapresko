import { supabase } from '../../../lib/supabase';
import { AppointmentDevice, UUID } from '../../../types/database';

export const appointmentDevicesApi = {
  createMany: async (
    rows: Array<Omit<AppointmentDevice, 'id'>>
  ): Promise<AppointmentDevice[]> => {
    if (!rows.length) return [];
    const { data, error } = await supabase
      .from('appointment_devices')
      .insert(rows)
      .select();

    if (error) {
      console.error('Error inserting appointment_devices:', error);
      throw new Error(error.message);
    }
    return data as AppointmentDevice[];
  },

  getByAppointmentId: async (appointmentId: UUID): Promise<AppointmentDevice[]> => {
    const { data, error } = await supabase
      .from('appointment_devices')
      .select('*')
      .eq('appointment_id', appointmentId);

    if (error) {
      console.error(`Error fetching appointment_devices for appointment ${appointmentId}:`, error);
      throw new Error(error.message);
    }
    return data as AppointmentDevice[];
  },

  getByDeviceIds: async (deviceIds: UUID[]): Promise<AppointmentDevice[]> => {
    if (!deviceIds.length) return [];
    const { data, error } = await supabase
      .from('appointment_devices')
      .select('*')
      .in('device_id', deviceIds);

    if (error) {
      console.error('Error fetching appointment_devices by device ids:', error);
      throw new Error(error.message);
    }
    return data as AppointmentDevice[];
  },
};


