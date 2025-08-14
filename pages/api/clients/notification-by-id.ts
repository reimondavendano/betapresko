import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase, handleSupabaseError } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { clientId } = req.query; // Extract clientId from query

      if (!clientId) {
        // Return a specific error if clientId is missing, as it's required for this route
        return res.status(400).json({ error: 'Client ID is missing from query' });
      }

      // 1. Get notifications for the specific client, joined with client & appointment data
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
        .eq('send_to_admin', false)
        .eq('send_to_client', true)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (notifErr) return handleSupabaseError(notifErr, res);

      // 2. Get all custom settings
      const { data: settings, error: settingsErr } = await supabase
        .from('custom_settings')
        .select('setting_key, setting_value');

      if (settingsErr) return handleSupabaseError(settingsErr, res);

      const settingsMap: Record<string, string> = {};
      settings?.forEach(s => {
        settingsMap[s.setting_key] = s.setting_value;
      });

      // 3. Process notifications with rules
      const enhanced = (notifications || []).map(n => {
        const clientName = n.clients?.name || 'Client';
        let message = '';

        // === CLIENT VIEW ===
        // Your existing logic for client view is now inside a loop that only gets client's notifications
         if (n.send_to_admin === false && n.send_to_client === true) {
          if (n.is_referral === true) {
            message = settingsMap['notif_referral']?.replace('{0}', clientName) || '';
          } else { // Handles the case where is_referral is false
            message = settingsMap['notif_completed']?.replace('{0}', clientName) || '';
          }
        }

        return {
          ...n,
          display_message: message
        };
      });

      // Filter out notifications with empty messages before sending the response
      const clientNotifications = enhanced.filter(n => n.display_message !== '');

      return res.status(200).json({ data: clientNotifications });
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
            send_to_admin: send_to_admin,
            send_to_client: send_to_client,
            is_referral: is_referral,
            date: date,
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
