import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase, handleSupabaseError } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { client_id } = req.query as { client_id: string }
      if (!client_id) {
        return res.status(400).json({ error: 'client_id is required' })
      }

      let query = supabase
        .from('devices')
        .select(`
          id,
          name,
          brands(name),
          ac_types(name),
          horsepower_options(display_name)
        `)
        .eq('client_id', client_id)
        .order('created_at', { ascending: false })

      const { data, error } = await query
      if (error) return handleSupabaseError(error, res)
      return res.status(200).json({ data })
    }

    res.setHeader('Allow', ['GET'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  } catch (e: any) {
    return handleSupabaseError(e, res)
  }
}
