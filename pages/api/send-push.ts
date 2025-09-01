// pages/api/send-push.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

// Setup web-push with your VAPID keys
webpush.setVapidDetails(
  "mailto:reimondavendano@gmail.com",
  process.env.VAPID_PUBLIC_KEY!,    // public key
  process.env.VAPID_PRIVATE_KEY!    // private key
);

// Supabase server client (must use SERVICE_ROLE_KEY here)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // 🔑 service role
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { mode, client_id, admin_id, client_name, title } = req.body;
    console.log("📥 Incoming push request:", req.body);

    // 1. Pick correct custom_settings key
    const settingKey =
      mode === "client_to_admin"
        ? "notif_confirmed"  // client → admin
        : "notif_completed"; // admin → client

    // 2. Fetch template message from custom_settings
    const { data: settingRow, error: settingError } = await supabase
      .from("custom_settings")
      .select("setting_value")
      .eq("setting_key", settingKey)
      .maybeSingle();

    if (settingError) {
      console.error("❌ Template fetch error:", settingError);
      return res.status(500).json({ error: "Failed to fetch template", details: settingError });
    }

    if (!settingRow) {
      return res.status(400).json({ error: "Notification template not found", settingKey });
    }

    // Replace {0} in the template with client_name (fallback "Client")
    let message = settingRow.setting_value || "";
    message = message.replace("{0}", client_name || "Client");

    // 3. Select subscriptions based on mode
    let subs: any[] = [];

    if (mode === "client_to_admin") {
      if (admin_id) {
        // notify one specific admin
        const { data, error } = await supabase
          .from("push_subscriptions")
          .select("subscription")
          .eq("admin_id", admin_id);
        if (error) throw error;
        subs = data || [];
      } else {
        // notify ALL admins
        const { data, error } = await supabase
          .from("push_subscriptions")
          .select("subscription")
          .not("admin_id", "is", null);
        if (error) throw error;
        subs = data || [];
      }
    } else if (mode === "admin_to_client" && client_id) {
      // notify the specific client
      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("subscription")
        .eq("client_id", client_id);
      if (error) throw error;
      subs = data || [];
    }

    if (!subs.length) {
      return res.status(200).json({ success: false, message: "No subscriptions found" });
    }

    // 4. Send push notifications
    let sentCount = 0;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          sub.subscription,
          JSON.stringify({ title, body: message })
        );
        sentCount++;
      } catch (err) {
        console.error("❌ Push send failed:", err);
      }
    }

    return res.status(200).json({ success: true, sent: sentCount });
  } catch (err: any) {
    console.error("💥 API error:", err);
    return res.status(500).json({ error: err.message });
  }
}
