import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase, handleSupabaseError } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const filter = String(req.query.status || '').trim()
      const dateFilter = String(req.query.dateFilter || '').trim()
      const specificDate = String(req.query.date || '').trim()
      const page = parseInt(String(req.query.page || '1'))
      const limit = parseInt(String(req.query.limit || '15'))
      const offset = (page - 1) * limit
      
      let query = supabase
        .from('appointments')
        .select(`
          id, appointment_date, appointment_time, status, amount, total_units, notes,
          clients:client_id(id, name, mobile),
          services:service_id(id, name, description, base_price),
          client_locations:location_id(
            id, name, address_line1, street, barangay_id, city_id,
            cities:city_id(name, province),
            barangays:barangay_id(name)
          ),
         appointment_devices:appointment_devices(
            id, device_id,
            devices:device_id(
              id, name, brand_id, ac_type_id, horsepower_id,
              last_cleaning_date, due_3_months, due_4_months, due_6_months,
              brands:brand_id(name),
              horsepower_options:horsepower_id(value, display_name),
              ac_types:ac_type_id(name)
            )
          )
        `, { count: 'exact' })

      // Status filter
      if (filter === 'confirmed' || filter === 'completed') {
        query = query.eq('status', filter)
      }

      // Date filtering
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
      
      if (specificDate) {
        query = query.eq('appointment_date', specificDate)
      } else if (dateFilter === 'today') {
        query = query.eq('appointment_date', today)
      } else if (dateFilter === 'incoming') {
        query = query.gte('appointment_date', today)
      } else if (dateFilter === 'previous') {
        query = query.lt('appointment_date', today)
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1)
      
      // Order by appointment_date and time
      query = query.order('appointment_date', { ascending: true })
      query = query.order('appointment_time', { ascending: true })

      const { data, error, count } = await query
      if (error) return handleSupabaseError(error, res)
      
      return res.status(200).json({ 
        data,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      })
    }

    if (req.method === 'PATCH') {
      const { id, status, appointment_time, appointment_date, amount } = req.body as {
        id: string
        status?: 'completed' | 'confirmed'
        appointment_time?: string | null
        appointment_date?: string | null
        amount?: number
      }

      const updatePayload: any = { updated_at: new Date().toISOString() }
      if (typeof status !== 'undefined') updatePayload.status = status
      if (typeof appointment_time !== 'undefined') updatePayload.appointment_time = appointment_time
      if (typeof appointment_date !== 'undefined') updatePayload.appointment_date = appointment_date
      if (typeof amount !== 'undefined') updatePayload.amount = amount

      // Update appointment fields and fetch needed data for downstream logic
      const { data: appt, error: updateErr } = await supabase
        .from('appointments')
        .update(updatePayload)
        .eq('id', id)
        .select('id, status, appointment_date, client_id, service_id, amount')
        .single()

      if (updateErr) return handleSupabaseError(updateErr, res)

      // If marked completed, update linked devices' last_cleaning_date to the date it was marked
      if (status === 'completed' && appt) {
        // Build yyyy-mm-dd for "date it marked"
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const completedDate = `${yyyy}-${mm}-${dd}`;

        // ✅ Fetch the service linked to this appointment
        const { data: service, error: serviceErr } = await supabase
          .from("services")
          .select("id, name")
          .eq("id", appt.service_id)
          .single();

        if (serviceErr) return handleSupabaseError(serviceErr, res);

        // Find device ids linked to this appointment
        const { data: joins, error: joinErr } = await supabase
          .from("appointment_devices")
          .select("device_id")
          .eq("appointment_id", appt.id);

        if (joinErr) return handleSupabaseError(joinErr, res);

        const deviceIds = (joins || []).map((j: any) => j.device_id);

        if (deviceIds.length > 0 && service) {
          const serviceName = service.name.toLowerCase();
         

          let updatePayload: any = {
            updated_at: new Date().toISOString(),
          };

          if (serviceName.includes("cleaning")) {
            updatePayload.last_cleaning_date = completedDate;
          } else if (
            serviceName.includes("repair") ||
            serviceName.includes("maintenance")
          ) {
            updatePayload.last_repair_date = completedDate;
          }

          if (Object.keys(updatePayload).length > 1) {
            const { error: devUpdateErr } = await supabase
              .from("devices")
              .update(updatePayload)
              .in("id", deviceIds);

            if (devUpdateErr) return handleSupabaseError(devUpdateErr, res);
          }
        }

        // --- Referral logic ---
        if (appt.client_id) {
          const { data: client, error: clientErr } = await supabase
            .from("clients")
            .select("id, ref_id, points")
            .eq("id", appt.client_id)
            .single();

          if (clientErr) return handleSupabaseError(clientErr, res);

          if (client?.ref_id) {
            const { data: referrer, error: refErr } = await supabase
              .from("clients")
              .select("id, points")
              .eq("id", client.ref_id)
              .single();
            if (refErr) return handleSupabaseError(refErr, res);

            if (referrer?.id) {
              const { error: incErr } = await supabase
                .from("clients")
                .update({
                  points: (referrer.points || 0) + 1,
                  updated_at: new Date().toISOString() as any,
                })
                .eq("id", referrer.id);
              if (incErr) return handleSupabaseError(incErr, res);
            }

            const { error: clearErr } = await supabase
              .from("clients")
              .update({ ref_id: null, updated_at: new Date().toISOString() as any })
              .eq("id", client.id);
            if (clearErr) return handleSupabaseError(clearErr, res);
          }
        }

        // --- Loyalty Points logic ---
        if (appt.client_id) {
          const { data: loyaltyData, error: loyaltyErr } = await supabase
            .from("loyalty_points")
            .insert([
              {
                client_id: appt.client_id,
                appointment_id: appt.id,
                points: 1,
                date_earned: appt.appointment_date 
              },
            ])
            .select();

          if (loyaltyErr) {
            console.error("Loyalty insert failed:", loyaltyErr);
            return handleSupabaseError(loyaltyErr, res);
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


