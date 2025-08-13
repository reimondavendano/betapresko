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
        .from('cities')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (search) {
        query = query.or(`name.ilike.%${search}%,province.ilike.%${search}%`)
      }

      const { data, error, count } = await query.range(from, to)
      if (error) return handleSupabaseError(error, res)
      return res.status(200).json({ data, total: count || 0 })
    }

    if (req.method === 'POST') {
      const { name, province } = req.body as { name: string; province: string }
      if (!name?.trim() || !province?.trim()) {
        return res.status(400).json({ error: 'Name and province are required' })
      }
      // Duplicate check: same name and province (case-insensitive)
      const { data: existing, error: existErr } = await supabase
        .from('cities')
        .select('id')
        .ilike('name', name.trim())
        .ilike('province', province.trim())
        .limit(1)
      if (existErr) return handleSupabaseError(existErr, res)
      if (existing && existing.length > 0) {
        return res.status(409).json({ error: 'City already exists' })
      }
      const { data, error } = await supabase
        .from('cities')
        .insert({ name: name.trim(), province: province.trim() })
        .select('*')
        .single()
      if (error) return handleSupabaseError(error, res)
      return res.status(201).json({ data })
    }

    if (req.method === 'PATCH') {
      const { id, name, province } = req.body as { id: string; name?: string; province?: string }
      if (!id) return res.status(400).json({ error: 'id is required' })

      const payload: any = {}
      if (typeof name !== 'undefined') payload.name = String(name)
      if (typeof province !== 'undefined') payload.province = String(province)

      // Optional duplicate check when both fields provided
      if (payload.name && payload.province) {
        const { data: existing, error: existErr } = await supabase
          .from('cities')
          .select('id')
          .ilike('name', payload.name)
          .ilike('province', payload.province)
          .neq('id', id)
          .limit(1)
        if (existErr) return handleSupabaseError(existErr, res)
        if (existing && existing.length > 0) {
          return res.status(409).json({ error: 'City already exists' })
        }
      }

      const { data, error } = await supabase
        .from('cities')
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
      const { error } = await supabase.from('cities').delete().in('id', ids)
      if (error) return handleSupabaseError(error, res)
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  } catch (e: any) {
    return handleSupabaseError(e, res)
  }
}


