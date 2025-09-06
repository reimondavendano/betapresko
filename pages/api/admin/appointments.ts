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
          id, appointment_date, appointment_time, status, amount, total_units, notes, stored_discount, discount_type, stored_loyalty_points,
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
      const { id, status, appointment_time, appointment_date, amount, stored_discount, discount_type, stored_loyalty_points } = req.body as {
        id: string
        status?: 'completed' | 'confirmed'
        appointment_time?: string | null
        appointment_date?: string | null
        amount?: number
        stored_discount?: number
        discount_type?: 'Standard' | 'Family/Friends'
        stored_loyalty_points?: number | null
      }

      const updatePayload: any = { updated_at: new Date().toISOString() }
      if (typeof status !== 'undefined') updatePayload.status = status
      if (typeof appointment_time !== 'undefined') updatePayload.appointment_time = appointment_time
      if (typeof appointment_date !== 'undefined') updatePayload.appointment_date = appointment_date
      if (typeof amount !== 'undefined') updatePayload.amount = amount
      if (typeof stored_discount !== 'undefined') updatePayload.stored_discount = stored_discount
      if (typeof discount_type !== 'undefined') updatePayload.discount_type = discount_type
       if (typeof stored_loyalty_points !== 'undefined') updatePayload.stored_loyalty_points = stored_loyalty_points

      // Update appointment fields and fetch needed data for downstream logic
      const { data: appt, error: updateErr } = await supabase
        .from('appointments')
        .update(updatePayload)
        .eq('id', id)
        .select(`
          id,
          status,
          appointment_date,
          client_id,
          service_id,
          amount,
          stored_discount,
          discount_type,
          clients:client_id(id, name, mobile),
          stored_loyalty_points
        `)
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

      // Fetch the service linked to this appointment
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

      // --- Updated Points calculation logic ---
     // Updated points calculation logic section


      if (appt.client_id) {
        // First, fetch client data including the discount flag
        const { data: client, error: clientErr } = await supabase
          .from("clients")
          .select("id, ref_id, points, discounted")
          .eq("id", appt.client_id)
          .single();

        if (clientErr) return handleSupabaseError(clientErr, res);

        const transactionAmount = appt.amount || 0;
        let pointsToAdd = 0;
        
        // Calculate points based on transaction amount
        if (transactionAmount >= 500 && transactionAmount <= 999) {
          pointsToAdd = 0.5;
        } else if (transactionAmount >= 1000 && transactionAmount < 2000) {
          pointsToAdd = 1;
        } else if (transactionAmount >= 2000 && transactionAmount < 3000) {
          pointsToAdd = 2;
        } else if (transactionAmount >= 3000) {
          pointsToAdd = 3;
        }

        // NEW LOGIC: Check if client has friends/family discount
        const isFriendsAndFamily = client?.discounted === true;
        
        // NEW LOGIC: Check if loyalty points were redeemed for this appointment
        const hasRedeemedPoints = appt.stored_loyalty_points && appt.stored_loyalty_points !== 0;
        
        // Only award points to the client if they DON'T have friends/family discount 
        // AND they didn't redeem loyalty points for this appointment
        if (!isFriendsAndFamily && !hasRedeemedPoints && pointsToAdd > 0) {
          // Add points to client
          const { error: clientUpdateErr } = await supabase
            .from("clients")
            .update({
              points: (client.points || 0) + pointsToAdd,
              updated_at: new Date().toISOString() as any,
            })
            .eq("id", client.id);

          if (clientUpdateErr) return handleSupabaseError(clientUpdateErr, res);

          // Insert loyalty points record for the client
          const { data: loyaltyData, error: loyaltyErr } = await supabase
            .from("loyalty_points")
            .insert([
              {
                client_id: appt.client_id,
                appointment_id: appt.id,
                points: pointsToAdd,
                date_earned: appt.appointment_date,
                is_referral: false
              },
            ])
            .select();

          if (loyaltyErr) return handleSupabaseError(loyaltyErr, res);
        }

        // Handle referral points - this happens regardless of client's discount status
        // BUT also check if loyalty points were redeemed
        if (client?.ref_id && !hasRedeemedPoints) {
          const { data: referrer, error: refErr } = await supabase
            .from("clients")
            .select("id, points")
            .eq("id", client.ref_id)
            .single();
            
          if (refErr) return handleSupabaseError(refErr, res);

          if (referrer?.id) {
            // Referrer gets 1 point regardless of transaction amount or client's discount status
            const referralPoints = 1;
            
            const { error: incErr } = await supabase
              .from("clients")
              .update({
                points: (referrer.points || 0) + referralPoints,
                updated_at: new Date().toISOString() as any,
              })
              .eq("id", referrer.id);
              
            if (incErr) return handleSupabaseError(incErr, res);

            // Insert referral loyalty points record
            const { data: referrerLoyaltyData, error: referrerLoyaltyErr } = await supabase
              .from("loyalty_points")
              .insert([
                {
                  client_id: referrer.id,
                  appointment_id: appt.id, // Link to the appointment that triggered the referral
                  points: referralPoints,
                  date_earned: appt.appointment_date,
                  is_referral: true,
                },
              ])
              .select();
              
            if (referrerLoyaltyErr) return handleSupabaseError(referrerLoyaltyErr, res);

            console.log("Referral points added:", referrerLoyaltyData);
          }

          // Clear the ref_id after processing referral
          const { error: clearErr } = await supabase
            .from("clients")
            .update({ ref_id: null, updated_at: new Date().toISOString() as any })
            .eq("id", client.id);
            
          if (clearErr) return handleSupabaseError(clearErr, res);
        }
      }

      // Send push notification
      try {
        await fetch(`${process.env.BASE_URL}/api/send-push`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "admin_to_client",
            client_id: appt.client_id,
            client_name: appt?.clients?.[0]?.name || "Client",
            title: "✅ Appointment Completed",
          }),
        });
        console.log("📩 Push notification sent to client:", appt.client_id);
      } catch (err) {
        console.error("❌ Failed to send push to client:", err);
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