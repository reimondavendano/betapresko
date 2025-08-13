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
        .from('blocked_dates')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (search) {
        query = query.or(`name.ilike.%${search}%,reason.ilike.%${search}%`)
      }

      const { data, error, count } = await query.range(from, to)
      if (error) return handleSupabaseError(error, res)
      return res.status(200).json({ data, total: count || 0 })
    }

    if (req.method === 'POST') {
      const { name, reason, from_date, to_date } = req.body as { name: string; reason?: string | null; from_date: string; to_date: string }
      if (!name?.trim() || !from_date || !to_date) {
        return res.status(400).json({ error: 'Name, from_date and to_date are required' })
      }
      // Duplicate check: same name and same date range
      const { data: existing, error: existErr } = await supabase
        .from('blocked_dates')
        .select('id')
        .ilike('name', name.trim())
        .eq('from_date', from_date)
        .eq('to_date', to_date)
        .limit(1)
      if (existErr) return handleSupabaseError(existErr, res)
      if (existing && existing.length > 0) {
        return res.status(409).json({ error: 'Blocked date already exists for this range' })
      }

      const { data, error } = await supabase
        .from('blocked_dates')
        .insert({ name: name.trim(), reason: reason ?? null, from_date, to_date })
        .select('*')
        .single()
      if (error) return handleSupabaseError(error, res)
      return res.status(201).json({ data })
    }

    if (req.method === 'PATCH') {
      const { id, name, reason, from_date, to_date } = req.body as { id: string; name?: string; reason?: string | null; from_date?: string; to_date?: string }
      if (!id) return res.status(400).json({ error: 'id is required' })
      const payload: any = {}
      if (typeof name !== 'undefined') payload.name = String(name)
      if (typeof reason !== 'undefined') payload.reason = reason === null ? null : String(reason)
      if (typeof from_date !== 'undefined') payload.from_date = from_date
      if (typeof to_date !== 'undefined') payload.to_date = to_date

      // Duplicate check if name and dates supplied
      if (payload.name && payload.from_date && payload.to_date) {
        const { data: existing, error: existErr } = await supabase
          .from('blocked_dates')
          .select('id')
          .ilike('name', payload.name)
          .eq('from_date', payload.from_date)
          .eq('to_date', payload.to_date)
          .neq('id', id)
          .limit(1)
        if (existErr) return handleSupabaseError(existErr, res)
        if (existing && existing.length > 0) {
          return res.status(409).json({ error: 'Blocked date already exists for this range' })
        }
      }

      const { data, error } = await supabase
        .from('blocked_dates')
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
      const { error } = await supabase.from('blocked_dates').delete().in('id', ids)
      if (error) return handleSupabaseError(error, res)
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  } catch (e: any) {
    return handleSupabaseError(e, res)
  }
}


