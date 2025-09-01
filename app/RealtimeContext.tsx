"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type RealtimeContextType = {
  refreshKey: number;
};

const RealtimeContext = createContext<RealtimeContextType>({ refreshKey: 0 });

export const RealtimeProvider = ({ children }: { children: React.ReactNode }) => {
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const channel = supabase
      .channel("all-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => setRefreshKey((prev) => prev + 1)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointment_devices" },
        () => setRefreshKey((prev) => prev + 1)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "devices" },
        () => setRefreshKey((prev) => prev + 1)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => setRefreshKey((prev) => prev + 1)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <RealtimeContext.Provider value={{ refreshKey }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => useContext(RealtimeContext);
