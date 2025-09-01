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
        .from('services')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
      }

      const { data, error, count } = await query.range(from, to)
      if (error) return handleSupabaseError(error, res)
      return res.status(200).json({ data, total: count || 0 })
    }

    if (req.method === 'POST') {
      const { name, description, is_active } = req.body as { name: string; description?: string | null; is_active?: boolean }
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Name is required' })
      }
      // Duplicate check (case-insensitive exact match on name)
      const { data: existing, error: existErr } = await supabase
        .from('services')
        .select('id')
        .ilike('name', name.trim())
        .limit(1)
      if (existErr) return handleSupabaseError(existErr, res)
      if (existing && existing.length > 0) {
        return res.status(409).json({ error: 'Service already exists' })
      }
      const { data, error } = await supabase
        .from('services')
        .insert({ name: name.trim(), description: description ?? null, is_active: typeof is_active === 'boolean' ? is_active : true })
        .select('*')
        .single()
      if (error) return handleSupabaseError(error, res)
      return res.status(201).json({ data })
    }

    if (req.method === 'PATCH') {
      const { id, name, description, is_active, set_inactive } = req.body as { id: string; name?: string; description?: string | null; is_active?: boolean, set_inactive?: boolean }
      if (!id) return res.status(400).json({ error: 'id is required' })
      const payload: any = {}
      if (typeof name !== 'undefined') payload.name = String(name)
      if (typeof description !== 'undefined') payload.description = description === null ? null : String(description)
      if (typeof is_active !== 'undefined') payload.is_active = !!is_active
      if (typeof set_inactive !== 'undefined') payload.set_inactive = !!set_inactive

      // Optional duplicate check when name provided
      if (payload.name) {
        const { data: existing, error: existErr } = await supabase
          .from('services')
          .select('id')
          .ilike('name', payload.name)
          .neq('id', id)
          .limit(1)
        if (existErr) return handleSupabaseError(existErr, res)
        if (existing && existing.length > 0) {
          return res.status(409).json({ error: 'Service already exists' })
        }
      }

      const { data, error } = await supabase
        .from('services')
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
      const { error } = await supabase.from('services').delete().in('id', ids)
      if (error) return handleSupabaseError(error, res)
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  } catch (e: any) {
    return handleSupabaseError(e, res)
  }
}


