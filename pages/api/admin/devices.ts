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
        .order('updated_at', { ascending: false })

      const { data, error } = await query
      if (error) return handleSupabaseError(error, res)
      return res.status(200).json({ data })
    }

    if (req.method === "PATCH") {
      const { id, brand_id, ac_type_id, horsepower_id } = req.body;

      if (!id) {
        return res.status(400).json({ error: "Device id is required" });
      }

      const { data, error } = await supabase
        .from("devices")
        .update({
          brand_id,
          ac_type_id,
          horsepower_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()

      if (error) throw error;

      return res.status(200).json(data);
    }

    res.setHeader('Allow', ['GET', 'PATCH'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  } catch (e: any) {
    return handleSupabaseError(e, res)
  }
}
