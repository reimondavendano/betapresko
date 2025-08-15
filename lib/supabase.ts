// src/lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database'; // Import your generated database types

// Get environment variables with proper validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate that required environment variables are present
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing required Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.'
  );
}

// Validate that the URL is properly formatted
try {
  new URL(supabaseUrl);
} catch (error) {
  throw new Error(
    `Invalid NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl}. Please check your environment variables.`
  );
}

export const supabase: SupabaseClient<Database> = createClient(supabaseUrl, supabaseAnonKey);

export const handleSupabaseError = (error: any, res: any) => {
  console.error('Supabase Error:', error);
  return res.status(error.status || 500).json({ error: error.message || 'An unknown error occurred' });
};