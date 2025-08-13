import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { handleSupabaseError } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    const { id, username } = req.query as { id?: string; username?: string }
    const client = supabaseAdmin || supabase

    if (!id && !username) {
      return res.status(400).json({ error: 'id or username is required' })
    }

    let query = client.from('admin_users').select('*').limit(1)
    if (id) query = query.eq('id', id)
    else if (username) query = query.or(`username.eq.${username},email.eq.${username}`)

    const { data, error } = await query.maybeSingle()
    if (error) return handleSupabaseError(error, res)
    if (!data) return res.status(404).json({ error: 'Not found' })

    const { password_hash, ...safe } = data
    return res.status(200).json(safe)
  } catch (e: any) {
    return handleSupabaseError(e, res)
  }
}


