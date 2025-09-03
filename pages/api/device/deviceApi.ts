// src/api/deviceApi.ts
import { supabase } from '../../../lib/supabase'; // Adjust path as needed
import { Device, DeviceRedeem, UUID } from '../../../types/database'; // Import Device and UUID types

export const deviceApi = {
  /**
   * Creates a new device.
   * The 'due_X_months' fields are now GENERATED ALWAYS in the database.
   */
  createDevice: async (newDeviceData: Omit<Device, 'id' | 'created_at' | 'updated_at' | 'due_3_months' | 'due_4_months' | 'due_6_months' | 'appointment_id'>): Promise<Device> => {
    const { data, error } = await supabase
      .from('devices')
      .insert([
        {
          client_id: newDeviceData.client_id,
          location_id: newDeviceData.location_id,
          name: newDeviceData.name,
          brand_id: newDeviceData.brand_id || null,
          ac_type_id: newDeviceData.ac_type_id || null,
          horsepower_id: newDeviceData.horsepower_id || null,
          last_cleaning_date: newDeviceData.last_cleaning_date || null, // Pass the date from the client
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating device:', error);
      throw new Error(error.message);
    }
    return data as Device;
  },

  /**
   * Fetches all devices for a given client ID.
   */
  getByClientId: async (clientId: UUID): Promise<Device[]> => {
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error(`Error fetching devices for client ${clientId}:`, error);
      throw new Error(error.message);
    }
    return data as Device[];
  },

   getByClientIdForRedeemed: async (clientId: string): Promise<DeviceRedeem[]> => {
    const { data, error } = await supabase
      .from("devices")
      .select(`
        id,
        name,
        brand:brands(id, name),
        ac_type:ac_types(id, name),
        horsepower:horsepower_options(id, display_name)
      `)
      .eq("client_id", clientId);

    if (error) {
      console.error("Error fetching devices:", error);
      throw new Error(error.message);
    }

    // 🔥 normalize so brand/ac_type/horsepower are single objects
    return (data || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      brand: d.brand?.[0] || null,
      ac_type: d.ac_type?.[0] || null,
      horsepower: d.horsepower?.[0] || null,
    })) as DeviceRedeem[];
  },

  




  /**
   * Updates an existing device.
   * The 'due_X_months' fields are now GENERATED ALWAYS in the database.
   */
  updateDevice: async (id: UUID, updateData: Partial<Omit<Device, 'id' | 'created_at' | 'updated_at' | 'due_3_months' | 'due_4_months' | 'due_6_months'>>): Promise<Device> => {
    const { data, error } = await supabase
      .from('devices')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating device ${id}:`, error);
      throw new Error(error.message);
    }
    return data as Device;
  },

  /**
   * Updates the location of a specific device.
   */
  updateDeviceLocation: async (deviceId: UUID, locationId: UUID): Promise<Device> => {
    const { data, error } = await supabase
      .from('devices')
      .update({ 
        location_id: locationId,
        updated_at: new Date().toISOString()
      })
      .eq('id', deviceId)
      .select()
      .single();

    if (error) {
      console.error(`Error updating device location ${deviceId}:`, error);
      throw new Error(error.message);
    }
    return data as Device;
  },

  /**
   * Deletes a device.
   */
  deleteDevice: async (id: UUID): Promise<boolean> => {
    const { error } = await supabase
      .from('devices')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting device ${id}:`, error);
      throw new Error(error.message);
    }
    return true; // Indicate success
  },
};
