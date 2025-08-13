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
        .from('barangays')
        .select('id, name, city_id, is_set, cities:city_id(name, province)', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (search) {
        query = query.ilike('name', `%${search}%`)
      }

      const { data, error, count } = await query.range(from, to)
      if (error) return handleSupabaseError(error, res)
      return res.status(200).json({ data, total: count || 0 })
    }

    if (req.method === 'POST') {
      const { name, city_id, is_set } = req.body as { name: string; city_id: string; is_set?: boolean }
      if (!name?.trim() || !city_id) {
        return res.status(400).json({ error: 'Name and city are required' })
      }
      // Duplicate check for same city + name
      const { data: existing, error: existErr } = await supabase
        .from('barangays')
        .select('id')
        .eq('city_id', city_id)
        .ilike('name', name.trim())
        .limit(1)
      if (existErr) return handleSupabaseError(existErr, res)
      if (existing && existing.length > 0) {
        return res.status(409).json({ error: 'Barangay already exists for this city' })
      }
      const { data, error } = await supabase
        .from('barangays')
        .insert({ name: name.trim(), city_id, is_set: typeof is_set === 'boolean' ? is_set : true })
        .select('id')
        .single()
      if (error) return handleSupabaseError(error, res)
      return res.status(201).json({ data })
    }

    if (req.method === 'PATCH') {
      const { id, name, city_id, is_set } = req.body as { id: string; name?: string; city_id?: string; is_set?: boolean }
      if (!id) return res.status(400).json({ error: 'id is required' })
      const payload: any = {}
      if (typeof name !== 'undefined') payload.name = String(name)
      if (typeof city_id !== 'undefined') payload.city_id = String(city_id)
      if (typeof is_set !== 'undefined') payload.is_set = !!is_set

      // Duplicate check when setting both fields
      if (payload.name || payload.city_id) {
        const { data: current, error: currErr } = await supabase
          .from('barangays')
          .select('city_id, name')
          .eq('id', id)
          .single()
        if (currErr) return handleSupabaseError(currErr, res)
        const newName = (payload.name ?? current?.name) as string
        const newCity = (payload.city_id ?? current?.city_id) as string
        if (newName && newCity) {
          const { data: existing, error: existErr } = await supabase
            .from('barangays')
            .select('id')
            .eq('city_id', newCity)
            .ilike('name', newName)
            .neq('id', id)
            .limit(1)
          if (existErr) return handleSupabaseError(existErr, res)
          if (existing && existing.length > 0) {
            return res.status(409).json({ error: 'Barangay already exists for this city' })
          }
        }
      }

      const { data, error } = await supabase
        .from('barangays')
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
      const { error } = await supabase.from('barangays').delete().in('id', ids)
      if (error) return handleSupabaseError(error, res)
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  } catch (e: any) {
    return handleSupabaseError(e, res)
  }
}


