// src/api/clientLocationApi.ts
import { supabase } from '../../../lib/supabase'; // Adjust path as needed
import { ClientLocation, UUID } from '../../../types/database'; // Import ClientLocation and UUID types

export const clientLocationApi = {
  /**
   * Creates a new client location.
   * @param newLocationData The data for the new client location.
   * @returns The created ClientLocation object.
   */
  createClientLocation: async (newLocationData: Omit<ClientLocation, 'id' | 'created_at' | 'updated_at'>): Promise<ClientLocation> => {
    // Supabase will automatically generate 'id', 'created_at', 'updated_at'
    // 'is_primary' defaults to false as per your database schema
    const { data, error } = await supabase
      .from('client_locations')
      .insert([
        {
          client_id: newLocationData.client_id,
          name: newLocationData.name,
          address_line1: newLocationData.address_line1,
          street: newLocationData.street,
          barangay: newLocationData.barangay,
          city: newLocationData.city,
          landmark: newLocationData.landmark,
          is_primary: newLocationData.is_primary ? newLocationData.is_primary : false, // Default as per your database schema
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating client location:', error);
      throw new Error(error.message);
    }
    return data as ClientLocation;
  },

  /**
   * Fetches all client locations for a specific client ID.
   * This queries the Supabase 'client_locations' table.
   * @param clientId The UUID of the client.
   * @returns A promise that resolves to an array of ClientLocation objects.
   */
  getByClientId: async (clientId: UUID): Promise<ClientLocation[]> => {
    const { data, error } = await supabase
      .from('client_locations')
      .select('*')
      .eq('client_id', clientId); // Filter by the client_id

    if (error) {
      console.error('Error fetching client locations:', error);
      throw new Error(error.message);
    }
    return data as ClientLocation[];
  },

  /**
   * Updates an existing client location.
   * @param id The UUID of the location to update.
   * @param data The data to update.
   * @returns The updated ClientLocation object.
   */
  updateClientLocation: async (id: UUID, data: Partial<ClientLocation>): Promise<ClientLocation> => {
    const { data: updatedData, error } = await supabase
      .from('client_locations')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating client location:', error);
      throw new Error(error.message);
    }
    return updatedData as ClientLocation;
  }
};
