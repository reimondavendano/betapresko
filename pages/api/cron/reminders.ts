// pages/api/cron/reminders.ts - FIXED VERSION
import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { data: settings, error: settingsErr } = await supabase
      .from("custom_settings")
      .select("setting_value")
      .eq("setting_key", "cron_reminders")
      .single();

    if (settingsErr || !settings) {
      return res.status(500).json({ error: "Missing cron_reminders template" });
    }

    const template = settings.setting_value as string;

    // --- Fetch clients with devices + last_cleaning_date + due columns ---
    const { data: devices, error: devErr } = await supabase
      .from("devices")
      .select(`
        id, name, last_cleaning_date, due_3_months, due_4_months, due_6_months,
        client_id,
        clients (id, name, mobile, email, sms_opt_in),
        client_locations (id, name),
        brands (name),
        ac_types (name),
        horsepower_options (value, display_name)
      `);

    if (devErr) return res.status(500).json({ error: devErr.message });

    const clientsMap: Record<
      string,
      {
        name: string;
        mobile: string;
        locations: Record<string, { count: number; devices: string[] }>;
      }
    > = {};

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    for (const dev of devices || []) {
      const client = (dev as any).clients;
      if (!client?.id || !client.mobile) continue;

      // Skip if client didn't opt in
      if (!client.sms_opt_in) continue;

      // Check if this device is due today (3, 4, or 6 months)
      let dueLabel: string | null = null;
      if (dev.due_3_months === today) dueLabel = "3 months";
      else if (dev.due_4_months === today) dueLabel = "4 months";
      else if (dev.due_6_months === today) dueLabel = "6 months";

      if (!dueLabel) continue;

      const brand = (dev as any).brands?.name || "Unknown Brand";
      const acType = (dev as any).ac_types?.name || "Unknown Type";
      const hp = (dev as any).horsepower_options?.display_name || "Unknown HP";

      const deviceInfo = `${brand} ${acType} ${hp} - Due: ${dueLabel}`;

      if (!clientsMap[client.id]) {
        clientsMap[client.id] = {
          name: client.name,
          mobile: client.mobile,
          locations: {},
        };
      }

      const locationName = (dev as any).client_locations?.name || "Unknown Location";
      if (!clientsMap[client.id].locations[locationName]) {
        clientsMap[client.id].locations[locationName] = {
          count: 0,
          devices: []
        };
      }
      
      clientsMap[client.id].locations[locationName].count++;
      clientsMap[client.id].locations[locationName].devices.push(deviceInfo);
    }

    // --- Send one SMS per client ---
    const sent: any[] = [];

    for (const [clientId, info] of Object.entries(clientsMap)) {
      const clientName = info.name || "Customer";
      const clientMobile = info.mobile;

      let totalUnits = 0;
      let locationDetails = "";

      // Build detailed location and device info
      for (const [locationName, locationData] of Object.entries(info.locations)) {
        totalUnits += locationData.count;
        
        locationDetails += `\n${locationName}\n`;
        locationDetails += `${locationData.count} unit(s):\n`;
        locationDetails += locationData.devices.join("\n") + "\n";
      }

      // Start with the template and replace placeholders step by step
      let message = template;
      
      // Replace simple placeholders first
      message = message.replace(/\{0\}/g, clientName);
      message = message.replace(/\{total_units\}/g, String(totalUnits));
      message = message.replace(/\{client_id\}/g, clientId);
      
      // Replace the complex location placeholder
      // Look for the pattern and replace it with our formatted details
      const locationPattern = /\{location\}\n\{no_of_units\} \{brand\} \{types\} \{horsepower\} - \{due_date\}/g;
      message = message.replace(locationPattern, locationDetails.trim());

      // --- Send via Semaphore API ---
      const apikey = process.env.SEMAPHORE_API_KEY!;
      const sendername = process.env.SEMAPHORE_SENDER_NAME || "SEMAPHORE";

      try {
        const url = "https://api.semaphore.co/api/v4/messages";
        const params = new URLSearchParams({
          apikey: String(apikey),
          number: String(clientMobile),
          message: String(message),
          sendername: String(sendername),
        });

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString(),
        });

        const responseData = await response.text();
        console.log("📡 Semaphore response:", responseData);

        sent.push({ 
          clientId, 
          mobile: clientMobile, 
          totalUnits,
          locations: Object.keys(info.locations),
          status: response.ok ? 'sent' : 'failed'
        });
      } catch (smsError) {
        console.error("❌ Failed to send SMS to:", clientMobile, smsError);
        sent.push({ 
          clientId, 
          mobile: clientMobile, 
          totalUnits,
          locations: Object.keys(info.locations),
          status: 'error',
          error: smsError instanceof Error ? smsError.message : 'Unknown error'
        });
      }
    }

    return res.status(200).json({ success: true, message: "Reminders processed", sent });
  } catch (err) {
    console.error("Cron error:", err);
    return res.status(500).json({ error: "Cron failed", details: err instanceof Error ? err.message : 'Unknown error' });
  }
}