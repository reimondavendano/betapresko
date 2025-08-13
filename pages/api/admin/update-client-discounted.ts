import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase, handleSupabaseError } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'PATCH') {
      const { id, discounted } = req.body

      if (!id || typeof discounted !== 'boolean') {
        return res.status(400).json({ error: 'Invalid request body. id and discounted are required.' })
      }

      const { data, error } = await supabase
        .from('clients')
        .update({ discounted })
        .eq('id', id)
        .select()
        .single()

      if (error) return handleSupabaseError(error, res)

      return res.status(200).json({ data })
    }

    res.setHeader('Allow', ['PATCH'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  } catch (e: any) {
    return handleSupabaseError(e, res)
  }
}
