import type { NextApiRequest, NextApiResponse } from "next";
import { supabase, handleSupabaseError } from "@/lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { notificationId } = req.body;

    if (!notificationId) {
      return res.status(400).json({ error: "Missing notificationId" });
    }

    const { data, error } = await supabase
      .from("notifications")
      .update({ is_new: false })
      .eq("id", notificationId)
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return handleSupabaseError(res, error);
    }

    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    console.error("API error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
