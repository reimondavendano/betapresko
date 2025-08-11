// src/pages/api/cities/cityApi.ts
import { supabase } from '../../../lib/supabase'; // Adjust path to your Supabase client setup
import { City, UUID } from '../../../types/database'; // Import City type

export const cityApi = {
  /**
   * Fetches all cities from the 'cities' table, ordered by name.
   */
  getCities: async (): Promise<City[]> => {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .order('name', { ascending: true }); // Order by city name

    if (error) {
      console.error('Error fetching cities:', error);
      throw new Error(error.message);
    }
    return data as City[];
  },
  /**
   * Fetches a single city by its ID.
   */
  getCityById: async (id: UUID): Promise<City | null> => {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching city by ID:', error);
      return null;
    }
    return data as City;
  },
};
