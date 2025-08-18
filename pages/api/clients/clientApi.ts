// src/pages/api/clients/clientApi.ts
import { supabase } from '../../../lib/supabase'; // Adjust path as needed
import { Client, Device, DeviceWithLocation, UUID } from '../../../types/database'; // Import Client and UUID types

export const clientApi = {
  /**
   * Fetches a client by their mobile number.
   */
  getClientByMobile: async (mobile: string): Promise<Client | null> => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('mobile', mobile)
      .single(); // Use single() to expect one record or null

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is not an error for this check
      console.error('Error fetching client by mobile:', error);
      throw new Error(error.message);
    }
    return data as Client | null;
  },

  /**
   * Creates a new client.
   */
  createClient: async (newClientData: Omit<Client, 'id' | 'created_at' | 'updated_at'  | 'points' | 'points_expiry' | 'discounted'>): Promise<Client> => {
    // Supabase will automatically generate 'id', 'created_at', 'updated_at'
    // 'points', 'points_expiry', 'discounted' have default values in DB
    const { data, error } = await supabase
      .from('clients')
      .insert([
        {
          name: newClientData.name,
          mobile: newClientData.mobile,
          email: newClientData.email,
          sms_opt_in: true, // Default to true as per requirement
          ref_id : newClientData.ref_id,
          qr_code: newClientData.qr_code
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating client:', error);
      throw new Error(error.message);
    }
    return data as Client;
  },

  /**
   * Updates an existing client by ID.
   */
  updateClient: async (id: UUID, updatedData: Partial<Client>): Promise<Client> => {
    const { data, error } = await supabase
      .from('clients')
      .update(updatedData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating client:', error);
      throw new Error(error.message);
    }
    return data as Client;
  },


  /**
   * Fetches a client by ID.
   */
  getClientById: async (id: UUID): Promise<Client | null> => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching client by ID:', error);
      throw new Error(error.message);
    }
    return data as Client | null;
  },

   getDevicesByClientId: async (clientId: string): Promise<DeviceWithLocation[]> => {
    const { data, error } = await supabase
      .from("devices")
      .select(`
        id,
        name,
        horsepower_id,
        location_id,
       client_locations (
          id,
          address_line1,
          street,
          landmark,
          barangays ( id, name ),
          cities ( id, name )
        )
      `)
      .eq("client_id", clientId);

    if (error) {
      console.error("Error fetching devices:", error);
      throw new Error(error.message);
    }

    return data as unknown as DeviceWithLocation[];
  }
};