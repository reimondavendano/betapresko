"use client";

import { useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRealtime } from "@/app/RealtimeContext";
import { toast } from "sonner"; // or "react-hot-toast"

// Convert VAPID base64 key to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Notifications({
  client_id,
  admin_id,
}: {
  client_id?: string;
  admin_id?: string;
}) {
  const { refreshKey } = useRealtime();

  useEffect(() => {

    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(async (registration) => {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") return;

          const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
          const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

          // ✅ Check if already subscribed
          let subscription = await registration.pushManager.getSubscription();
          if (!subscription) {
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: convertedVapidKey,
            });
          }

          // ✅ Upsert instead of insert (prevents duplicates)
        const payload: any = {
          subscription: subscription.toJSON(),
        };

        let onConflict: string | undefined;

        if (client_id) {
          payload.client_id = client_id;
          onConflict = "client_id";
        } else if (admin_id) {
          payload.admin_id = admin_id;
          onConflict = "admin_id";
        }

        const { data, error } = await supabase
          .from("push_subscriptions")
          .upsert(payload, onConflict ? { onConflict } : undefined)
          .select();

        if (error) {
          console.error("❌ Failed to save subscription:", error);
        } else {
          console.log("✅ Subscription saved/upserted:", data);
        }


        })
        .catch((err) => {
          console.error("❌ SW registration failed:", err);
        });

      // ✅ Attach listener when SW controller is ready
      const attachListener = () => {
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.addEventListener("message", (event) => {
            if (event.data?.type === "PUSH_NOTIFICATION") {
              const { title, body } = event.data.payload;
              console.log("📩 Push message received in React:", event.data);
              toast.success(`${title}: ${body}`);
            }
          });
          return true;
        }
        return false;
      };

      if (!attachListener()) {
        const interval = setInterval(() => {
          if (attachListener()) clearInterval(interval);
        }, 1000);
      }
    } else {
      console.warn("🚫 Push not supported in this browser");
    }
  }, [client_id, admin_id, refreshKey]);

  return null;
}
