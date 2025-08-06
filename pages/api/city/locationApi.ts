// src/api/locationApi.ts
import { supabase } from '../../../lib/supabase'; // Adjust path as needed
import { City, Barangay, UUID } from '../../../types/database'; // Import types

export const locationApi = {
  /**
   * Fetches all cities, ordered by name.
   */
  getCities: async (): Promise<City[]> => {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching cities:', error);
      throw new Error(error.message);
    }
    return data as City[];
  },

   /**
   * Fetches all barangays, ordered by name.
   * This is useful for lookup tables where you need all names,
   * for example, in a client dashboard to map IDs to names.
   */
  getAllBarangays: async (): Promise<Barangay[]> => {
    const { data, error } = await supabase
      .from('barangays')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching all barangays:', error);
      throw new Error(error.message);
    }
    return data as Barangay[];
  },

  /**
   * Fetches barangays for a specific city ID, ordered by name.
   */
  getBarangaysByCityId: async (cityId: UUID): Promise<Barangay[]> => {
    const { data, error } = await supabase
      .from('barangays')
      .select('*')
      .eq('city_id', cityId) // Filter by city_id
      .order('name', { ascending: true });

    if (error) {
      console.error(`Error fetching barangays for city ${cityId}:`, error);
      throw new Error(error.message);
    }
    return data as Barangay[];
  },
};
