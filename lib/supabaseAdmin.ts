import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export let supabaseAdmin: SupabaseClient<Database> | null = null

if (url && serviceRoleKey) {
  try {
    supabaseAdmin = createClient<Database>(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  } catch (e) {
    supabaseAdmin = null
  }
}


