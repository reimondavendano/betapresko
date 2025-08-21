// pages/api/cron/reminders.ts
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
        clients (id, name, mobile),
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
        locations: Record<string, string[]>;
      }
    > = {};

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    for (const dev of devices || []) {
      const client = (dev as any).clients;
      if (!client?.id || !client.mobile) continue;

      // Check if this device is due today (3, 4, or 6 months)
      let dueLabel: string | null = null;
      if (dev.due_3_months === today) dueLabel = "3 mos";
      else if (dev.due_4_months === today) dueLabel = "4 mos";
      else if (dev.due_6_months === today) dueLabel = "6 mos";

      if (!dueLabel) continue;

      const brand = (dev as any).brands?.name || "";
      const type = (dev as any).ac_types?.name || "";
      const hp = (dev as any).horsepower_options?.display_name || "";
      const unitDesc = `1× ${brand} ${type} ${hp} – ${dueLabel}`;

      if (!clientsMap[client.id]) {
        clientsMap[client.id] = {
          name: client.name,
          mobile: client.mobile,
          locations: {},
        };
      }
      const locName = (dev as any).client_locations?.name || "Unknown location";
      if (!clientsMap[client.id].locations[locName]) {
        clientsMap[client.id].locations[locName] = [];
      }
      clientsMap[client.id].locations[locName].push(unitDesc);
    }

    // --- Send one SMS per client ---
    const sent: any[] = [];

    for (const [clientId, info] of Object.entries(clientsMap)) {
      const clientName = info.name || "Customer";
      const clientMobile = info.mobile;

      let unitDetails = "";
      let totalUnits = 0;
      for (const [loc, units] of Object.entries(info.locations)) {
        unitDetails += `\n${loc}\n${units.join("\n")}\n\n`;
        totalUnits += units.length;
      }

      // Fill placeholders in template
      let message = template
        .replace("{0}", clientName)
        .replace("{total_units}", String(totalUnits))
        .replace("{client_id}", clientId)
        .replace("{location}\n{no_of_units} {brand} {types} {horsepower} - {due_date}", unitDetails.trim());

      // --- Send via Semaphore API ---
      const apikey = process.env.SEMAPHORE_API_KEY!;
      const sendername = process.env.SEMAPHORE_SENDER_NAME || "SEMAPHORE";

      const url = "https://api.semaphore.co/api/v4/messages";
      const params = new URLSearchParams({
        apikey: String(apikey),
        number: String(clientMobile),
        message: String(message),
        sendername: String(sendername),
      });

      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      sent.push({ clientId, mobile: clientMobile, totalUnits });
    }

    return res.status(200).json({ success: true, message: "Reminders sent", sent });
  } catch (err) {
    console.error("Cron error:", err);
    return res.status(500).json({ error: "Cron failed" });
  }
}
