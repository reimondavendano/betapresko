import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase, handleSupabaseError } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const filter = String(req.query.status || '').trim()
      let query = supabase
        .from('appointments')
        .select(`
          id, appointment_date, appointment_time, status, amount, total_units,
          clients:client_id(id, name, mobile),
          client_locations:location_id(
            id, name, address_line1, street, barangay_id, city_id,
            cities:city_id(name, province),
            barangays:barangay_id(name)
          ),
          appointment_devices:appointment_devices(id, device_id,
            devices:device_id(id, name, last_cleaning_date, due_3_months, due_4_months, due_6_months,
              brands:brand_id(name),
              horsepower_options:horsepower_id(value, display_name),
              ac_types:ac_type_id(name)
            )
          )
        `)
        .order('appointment_date', { ascending: true })

      if (filter === 'confirmed' || filter === 'completed') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query
      if (error) return handleSupabaseError(error, res)
      return res.status(200).json({ data })
    }

    if (req.method === 'PATCH') {
      const { id, status, appointment_time, appointment_date } = req.body as {
        id: string
        status?: 'completed' | 'confirmed'
        appointment_time?: string | null
        appointment_date?: string | null
      }

      const updatePayload: any = { updated_at: new Date().toISOString() }
      if (typeof status !== 'undefined') updatePayload.status = status
      if (typeof appointment_time !== 'undefined') updatePayload.appointment_time = appointment_time
      if (typeof appointment_date !== 'undefined') updatePayload.appointment_date = appointment_date

      // Update appointment fields and fetch needed data for downstream logic
      const { data: appt, error: updateErr } = await supabase
        .from('appointments')
        .update(updatePayload)
        .eq('id', id)
        .select('id, status, appointment_date, client_id')
        .single()

      if (updateErr) return handleSupabaseError(updateErr, res)

      // If marked completed, update linked devices' last_cleaning_date to the date it was marked
      if (status === 'completed' && appt) {
        // Build yyyy-mm-dd for "date it marked"
        const now = new Date()
        const yyyy = now.getFullYear()
        const mm = String(now.getMonth() + 1).padStart(2, '0')
        const dd = String(now.getDate()).padStart(2, '0')
        const completedDate = `${yyyy}-${mm}-${dd}`

        // Find device ids linked to this appointment
        const { data: joins, error: joinErr } = await supabase
          .from('appointment_devices')
          .select('device_id')
          .eq('appointment_id', appt.id)

        if (joinErr) return handleSupabaseError(joinErr, res)
        const deviceIds = (joins || []).map((j: any) => j.device_id)
        if (deviceIds.length > 0) {
          const { error: devUpdateErr } = await supabase
            .from('devices')
            .update({ last_cleaning_date: completedDate, updated_at: new Date().toISOString() })
            .in('id', deviceIds)
          if (devUpdateErr) return handleSupabaseError(devUpdateErr, res)
        }

        // Referral logic: award point to referrer if present, then clear ref_id
        if (appt.client_id) {
          const { data: client, error: clientErr } = await supabase
            .from('clients')
            .select('id, ref_id, points')
            .eq('id', appt.client_id)
            .single()
          if (clientErr) return handleSupabaseError(clientErr, res)

          if (client?.ref_id) {
            // Find referrer by id == ref_id
            const { data: referrer, error: refErr } = await supabase
              .from('clients')
              .select('id, points')
              .eq('id', client.ref_id)
              .single()
            if (refErr) return handleSupabaseError(refErr, res)

            if (referrer?.id) {
              // Increment referrer's points by 1
              const { error: incErr } = await supabase
                .from('clients')
                .update({ points: (referrer.points || 0) + 1, updated_at: new Date().toISOString() as any })
                .eq('id', referrer.id)
              if (incErr) return handleSupabaseError(incErr, res)
            }

            // Clear ref_id on original client so it won't be reused
            const { error: clearErr } = await supabase
              .from('clients')
              .update({ ref_id: null, updated_at: new Date().toISOString() as any })
              .eq('id', client.id)
            if (clearErr) return handleSupabaseError(clearErr, res)
          }
        }
      }

      return res.status(200).json({ data: appt })
    }

    res.setHeader('Allow', ['GET', 'PATCH'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  } catch (e: any) {
    return handleSupabaseError(e, res)
  }
}


