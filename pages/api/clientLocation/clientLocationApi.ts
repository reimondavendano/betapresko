// src/api/clientLocationApi.ts
import { supabase } from '../../../lib/supabase'; // Adjust path as needed
import { ClientLocation, UUID } from '../../../types/database'; // Import ClientLocation and UUID types

export const clientLocationApi = {
  /**
   * Creates a new client location.
   * @param newLocationData The data for the new client location.
   * @returns The created ClientLocation object.
   */
  createClientLocation: async (newLocationData: Omit<ClientLocation, 'id' | 'created_at' | 'updated_at' | 'barangay_name' | 'city_name'>): Promise<ClientLocation> => {
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
          barangay_id: newLocationData.barangay_id,
          city_id: newLocationData.city_id,
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
      .select(`
        id, client_id, name, is_primary, address_line1, street, landmark,
        barangay_id, city_id, created_at, updated_at,
        cities:city_id(name),
        barangays:barangay_id(name)
      `)
      .eq('client_id', clientId);

    if (error) {
      console.error('Error fetching client locations:', error);
      throw new Error(error.message);
    }

    // Enrich with human-readable names for viewing
    const enriched = (data || []).map((row: any) => ({
      id: row.id,
      client_id: row.client_id,
      name: row.name,
      is_primary: row.is_primary,
      address_line1: row.address_line1,
      street: row.street,
      landmark: row.landmark,
      barangay_id: row.barangay_id,
      barangay_name: row.barangays?.name ?? null,
      city_id: row.city_id,
      city_name: row.cities?.name ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    })) as ClientLocation[];

    return enriched;
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
