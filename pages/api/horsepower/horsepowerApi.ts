// src/api/horsepowerApi.ts
import { supabase } from '../../../lib/supabase'; // Adjust path to your Supabase client setup
import { HorsepowerOption } from '../../../types/database'; // Import HorsepowerOption type

export const horsepowerApi = {
  /**
   * Fetches all active horsepower options from the 'horsepower_options' table, ordered by value.
   */
  getHorsepowerOptions: async (): Promise<HorsepowerOption[]> => {
    const { data, error } = await supabase
      .from('horsepower_options')
      .select('*')
      .eq('is_active', true) // Fetch only active options
      .order('value', { ascending: true }); // Order by numeric value

    if (error) {
      console.error('Error fetching horsepower options:', error);
      throw new Error(error.message);
    }
    return data as HorsepowerOption[];
  },
};
