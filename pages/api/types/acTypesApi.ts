// src/api/acTypesApi.ts
import { supabase } from '../../../lib/supabase'; // Adjust path to your Supabase client setup
import { ACType } from '../../../types/database'; // Import ACType type

export const acTypesApi = {
  /**
   * Fetches all active AC types from the 'ac_types' table, ordered by name.
   */
  getACTypes: async (): Promise<ACType[]> => {
    const { data, error } = await supabase
      .from('ac_types')
      .select('*')
      .eq('is_active', true) // Fetch only active AC types
      .order('name', { ascending: true }); // Order by name

    if (error) {
      console.error('Error fetching AC types:', error);
      throw new Error(error.message);
    }
    return data as ACType[];
  },
};
