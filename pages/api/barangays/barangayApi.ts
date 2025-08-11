// src/pages/api/barangays/barangayApi.ts
import { supabase } from '../../../lib/supabase'; // Adjust path to your Supabase client setup
import { Barangay, UUID } from '../../../types/database'; // Import Barangay and UUID types

export const barangayApi = {
  /**
   * Fetches all barangays for a given city, ordered by name.
   */
  getBarangaysByCity: async (cityId: UUID): Promise<Barangay[]> => {
    const { data, error } = await supabase
      .from('barangays')
      .select('*')
      .eq('city_id', cityId)
      .eq('is_set', true)
      .order('name', { ascending: true }); // Order by barangay name

    if (error) {
      console.error('Error fetching barangays by city:', error);
      throw new Error(error.message);
    }
    return data as Barangay[];
  },
  /**
   * Fetches a single barangay by its name and city ID.
   */
  getBarangayByNameAndCity: async (name: string, cityId: UUID): Promise<Barangay | null> => {
    const { data, error } = await supabase
      .from('barangays')
      .select('*')
      .eq('name', name)
      .eq('city_id', cityId)
      .eq('is_set', true)
      .single();

    if (error) {
      console.error('Error fetching barangay by name and city:', error);
      return null;
    }
    return data as Barangay;
  }
};
