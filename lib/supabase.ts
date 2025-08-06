// src/lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database'; // Import your generated database types

// These variables would typically be loaded from environment variables
// For demonstration, placeholders are used. Replace with your actual Supabase URL and Anon Key.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

export const supabase: SupabaseClient<Database> = createClient(supabaseUrl, supabaseAnonKey);

export const handleSupabaseError = (error: any, res: any) => {
  console.error('Supabase Error:', error);
  return res.status(error.status || 500).json({ error: error.message || 'An unknown error occurred' });
};
