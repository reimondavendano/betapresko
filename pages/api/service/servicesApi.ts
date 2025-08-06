// src/api/servicesApi.ts
import { supabase } from '../../../lib/supabase'; // Adjust path to your Supabase client setup
import { Service, UUID } from '../../../types/database'; // Import Service type

export const servicesApi = {
  /**
   * Fetches all active services from the 'services' table, ordered by name.
   */
  getServices: async (): Promise<Service[]> => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true) // Fetch only active services
      .order('name', { ascending: true }); // Order by service name

    if (error) {
      console.error('Error fetching services:', error);
      throw new Error(error.message);
    }
    return data as Service[];
  },

  // You can add more service-related API functions here (e.g., getServiceById, createService)
};
