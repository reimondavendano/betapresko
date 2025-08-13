import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase, handleSupabaseError } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const page = Number(req.query.page || '1')
      const pageSize = Number(req.query.pageSize || '10')
      const search = String(req.query.search || '').trim()
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let query = supabase
        .from('horsepower_options')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (search) {
        // Search by display_name or value text match
        const val = Number(search)
        if (!Number.isNaN(val)) {
          query = query.or(`display_name.ilike.%${search}%,value.eq.${val}`)
        } else {
          query = query.ilike('display_name', `%${search}%`)
        }
      }

      const { data, error, count } = await query.range(from, to)
      if (error) return handleSupabaseError(error, res)
      return res.status(200).json({ data, total: count || 0 })
    }

    if (req.method === 'POST') {
      const { value, display_name, is_active } = req.body as { value: number; display_name: string; is_active?: boolean }
      if (value === undefined || value === null || display_name === undefined || display_name === null || String(display_name).trim() === '') {
        return res.status(400).json({ error: 'value and display_name are required' })
      }
      // Duplicate check: value or display_name matches existing
      const { data: existing, error: existErr } = await supabase
        .from('horsepower_options')
        .select('id')
        .or(`display_name.ilike.${String(display_name).trim()},value.eq.${value}`)
        .limit(1)
      if (existErr) return handleSupabaseError(existErr, res)
      if (existing && existing.length > 0) {
        return res.status(409).json({ error: 'Horsepower option already exists' })
      }
      const { data, error } = await supabase
        .from('horsepower_options')
        .insert({ value, display_name: String(display_name).trim(), is_active: typeof is_active === 'boolean' ? is_active : true })
        .select('*')
        .single()
      if (error) return handleSupabaseError(error, res)
      return res.status(201).json({ data })
    }

    if (req.method === 'PATCH') {
      const { id, value, display_name, is_active } = req.body as { id: string; value?: number; display_name?: string; is_active?: boolean }
      if (!id) return res.status(400).json({ error: 'id is required' })
      const payload: any = {}
      if (typeof value !== 'undefined') payload.value = value
      if (typeof display_name !== 'undefined') payload.display_name = String(display_name)
      if (typeof is_active !== 'undefined') payload.is_active = !!is_active
      const { data, error } = await supabase
        .from('horsepower_options')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single()
      if (error) return handleSupabaseError(error, res)
      return res.status(200).json({ data })
    }

    if (req.method === 'DELETE') {
      const { ids } = req.body as { ids: string[] }
      if (!ids || ids.length === 0) return res.status(400).json({ error: 'ids is required' })
      const { error } = await supabase.from('horsepower_options').delete().in('id', ids)
      if (error) return handleSupabaseError(error, res)
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  } catch (e: any) {
    return handleSupabaseError(e, res)
  }
}


