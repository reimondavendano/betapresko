// src/api/brandsApi.ts
import { supabase } from '../../../lib/supabase'; // Adjust path to your Supabase client setup
import { Brand } from '../../../types/database'; // Import Brand type

export const brandsApi = {
  /**
   * Fetches all active brands from the 'brands' table, ordered by name.
   */
  getBrands: async (): Promise<Brand[]> => {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('is_active', true) // Fetch only active brands
      .order('name', { ascending: true }); // Order by brand name

    if (error) {
      console.error('Error fetching brands:', error);
      throw new Error(error.message);
    }
    return data as Brand[];
  },
};
