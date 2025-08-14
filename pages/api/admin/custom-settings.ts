import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase, handleSupabaseError } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      // Check for a new query parameter to determine if we should get all settings
      if (req.query.getAll === 'true') {
        const { data, error } = await supabase
          .from('custom_settings')
          .select('*')
          .order('setting_category', { ascending: true })
          .order('setting_key', { ascending: true })

        if (error) return handleSupabaseError(error, res)
        return res.status(200).json({ data, total: data.length })
      }

      // Existing paginated GET request logic
      const page = Number(req.query.page || '1')
      const pageSize = Number(req.query.pageSize || '10')
      const search = String(req.query.search || '').trim()
      const category = String(req.query.category || '').trim()
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let query = supabase
        .from('custom_settings')
        .select('*', { count: 'exact' })
        .order('setting_category', { ascending: true })
        .order('setting_key', { ascending: true })

      if (search) {
        query = query.or(`setting_key.ilike.%${search}%,setting_value.ilike.%${search}%,description.ilike.%${search}%`)
      }

      if (category) {
        query = query.eq('setting_category', category)
      }

      const { data, error, count } = await query.range(from, to)
      if (error) return handleSupabaseError(error, res)
      return res.status(200).json({ data, total: count || 0 })
    }

    if (req.method === 'POST') {
      const { setting_key, setting_value, setting_type, description, setting_category } = req.body as {
        setting_key: string
        setting_value: string
        setting_type: string
        description?: string
        setting_category: string
      }
      
      if (!setting_key || !setting_key.trim()) {
        return res.status(400).json({ error: 'Setting key is required' })
      }
      if (!setting_value || !setting_value.trim()) {
        return res.status(400).json({ error: 'Setting value is required' })
      }
      if (!setting_type || !setting_type.trim()) {
        return res.status(400).json({ error: 'Setting type is required' })
      }
      if (!setting_category || !setting_category.trim()) {
        return res.status(400).json({ error: 'Setting category is required' })
      }

      // Duplicate check (case-insensitive exact match for key within same category)
      const { data: existing, error: existErr } = await supabase
        .from('custom_settings')
        .select('id')
        .eq('setting_category', setting_category.trim())
        .ilike('setting_key', setting_key.trim())
        .limit(1)
      if (existErr) return handleSupabaseError(existErr, res)
      if (existing && existing.length > 0) {
        return res.status(409).json({ error: 'Setting key already exists in this category' })
      }

      const { data, error } = await supabase
        .from('custom_settings')
        .insert({
          setting_key: setting_key.trim(),
          setting_value: setting_value.trim(),
          setting_type: setting_type.trim(),
          description: description?.trim() || null,
          setting_category: setting_category.trim()
        })
        .select('*')
        .single()
      if (error) return handleSupabaseError(error, res)
      return res.status(201).json({ data })
    }

    if (req.method === 'PATCH') {
      const { id, setting_key, setting_value, setting_type, description, setting_category } = req.body as {
        id: string
        setting_key?: string
        setting_value?: string
        setting_type?: string
        description?: string
        setting_category?: string
      }
      
      if (!id) return res.status(400).json({ error: 'id is required' })
      
      const payload: any = {}
      if (typeof setting_key !== 'undefined') payload.setting_key = String(setting_key)
      if (typeof setting_value !== 'undefined') payload.setting_value = String(setting_value)
      if (typeof setting_type !== 'undefined') payload.setting_type = String(setting_type)
      if (typeof description !== 'undefined') payload.description = description
      if (typeof setting_category !== 'undefined') payload.setting_category = String(setting_category)
      
      // If updating key or category, check for duplicates
      if (payload.setting_key || payload.setting_category) {
        const currentCategory = payload.setting_category || (await supabase
          .from('custom_settings')
          .select('setting_category')
          .eq('id', id)
          .single())?.data?.setting_category
        
        const currentKey = payload.setting_key || (await supabase
          .from('custom_settings')
          .select('setting_key')
          .eq('id', id)
          .single())?.data?.setting_key

        if (currentCategory && currentKey) {
          const { data: existing, error: existErr } = await supabase
            .from('custom_settings')
            .select('id')
            .eq('setting_category', currentCategory)
            .ilike('setting_key', currentKey)
            .neq('id', id)
            .limit(1)
          if (existErr) return handleSupabaseError(existErr, res)
          if (existing && existing.length > 0) {
            return res.status(409).json({ error: 'Setting key already exists in this category' })
          }
        }
      }

      const { data, error } = await supabase
        .from('custom_settings')
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
      const { error } = await supabase.from('custom_settings').delete().in('id', ids)
      if (error) return handleSupabaseError(error, res)
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  } catch (e: any) {
    return handleSupabaseError(e, res)
  }
}
