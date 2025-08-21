import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../../lib/supabase";

// Types
type ReminderKeys = "month_3_reminder" | "month_4_reminder" | "month_6_reminder";

// Utility: format date as yyyy-mm-dd
function formatDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Utility: subtract months
function minusMonths(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return formatDate(d);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. Fetch custom settings (templates)
    const { data: settings, error: settingsErr } = await supabase
      .from("custom_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["month_3_reminder", "month_4_reminder", "month_6_reminder"]);

    if (settingsErr) throw settingsErr;

    const templates: Record<ReminderKeys, string> = {
      month_3_reminder:
        settings?.find(s => s.setting_key === "month_3_reminder")?.setting_value || "",
      month_4_reminder:
        settings?.find(s => s.setting_key === "month_4_reminder")?.setting_value || "",
      month_6_reminder:
        settings?.find(s => s.setting_key === "month_6_reminder")?.setting_value || "",
    };

    // 2. Compute due dates (devices that last_cleaning_date === dueDate)
    const dueDates: Record<ReminderKeys, string> = {
      month_3_reminder: minusMonths(3),
      month_4_reminder: minusMonths(4),
      month_6_reminder: minusMonths(6),
    };

    // 3. Fetch devices with clients
    const { data: devices, error: devErr } = await supabase
      .from("devices")
      .select(
        `
        id,
        client_id,
        last_cleaning_date,
        clients ( id, name, mobile )
      `
      );

    if (devErr) throw devErr;

    let sent: any[] = [];

    // 4. Loop reminders
    for (const [key, dueDate] of Object.entries(dueDates) as [ReminderKeys, string][]) {
      const dueDevices = devices?.filter(d => d.last_cleaning_date === dueDate) || [];

      for (const dev of dueDevices) {
        const clientObj = Array.isArray(dev.clients) ? dev.clients[0] : dev.clients;
        const clientName = clientObj?.name ?? "Customer";
        const clientMobile = clientObj?.mobile ?? null;
        if (!clientMobile) continue;

        const message = templates[key]
          .replace("{0}", clientName)
          .replace("{1}", dev.client_id);

        // Send SMS via Semaphore API
        const response = await fetch("https://api.semaphore.co/api/v4/messages", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            apikey: process.env.SEMAPHORE_API_KEY!,
            number: String(clientMobile),
            message,
            sendername: process.env.SEMAPHORE_SENDER_NAME || "SEMAPHORE",
          }).toString(),
        });

        const smsResult = await response.json();
        sent.push({ client: clientName, number: clientMobile, result: smsResult });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Reminders sent",
      sent,
    });
  } catch (err) {
    console.error("CRON Reminder Error:", err);
    return res.status(500).json({ error: "Server error", details: err });
  }
}
