import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase, handleSupabaseError } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      // 1. Get notifications joined with client & appointment data
      const { data: notifications, error: notifErr } = await supabase
        .from('notifications')
        .select(`
          *,
          clients:client_id (
            id,
            name,
            appointments:appointments_client_id_fkey (
              status
            )
          )
        `)
        .eq('send_to_admin', true)
        .eq('send_to_client', false)
        .order('created_at', { ascending: false })

      if (notifErr) return handleSupabaseError(notifErr, res)

      // 2. Get all custom settings
      const { data: settings, error: settingsErr } = await supabase
        .from('custom_settings')
        .select('setting_key, setting_value')

      if (settingsErr) return handleSupabaseError(settingsErr, res)

      const settingsMap: Record<string, string> = {}
      settings?.forEach(s => {
        settingsMap[s.setting_key] = s.setting_value
      })

      // 3. Process notifications with rules
      const enhanced = (notifications || []).map(n => {
        const clientName = n.clients?.name || 'Client'
        const appointmentStatus = n.clients?.appointments?.[0]?.status || ''
        let message = ''

        // === ADMIN VIEW ===
        if (n.send_to_admin === true && n.send_to_client === false && n.is_referral === false) {
          message = settingsMap['notif_confirmed']?.replace('{0}', clientName) || ''
        }
        else if (n.send_to_admin === true && n.send_to_client === false && n.is_referral === true) {
          message = settingsMap['notif_confirmed']?.replace('{0}', clientName) || ''
        }

        

        return {
          ...n,
          display_message: message
        }
      })

      return res.status(200).json({ data: enhanced })
    }

    if (req.method === 'POST') {
      const { client_id, send_to_admin, send_to_client, is_referral, date } = req.body

      if (!client_id) {
        return res.status(400).json({ error: 'client_id is required' })
      }

      const { data, error } = await supabase
        .from('notifications')
        .insert([
          {
            client_id,
            send_to_admin: !!send_to_admin,
            send_to_client: !!send_to_client,
            is_referral: !!is_referral,
            date: !!date,
          }
        ])
        .select('*')
        .single()

      if (error) return handleSupabaseError(error, res)

      return res.status(201).json({ data })
    }

    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  } catch (err) {
    return handleSupabaseError(err, res)
  }
}
