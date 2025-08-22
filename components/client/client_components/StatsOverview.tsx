"use client";

import { Card } from "@/components/ui/card";
import { Star, Calendar as CalendarIcon, AirVent } from "lucide-react";
import React from "react";

interface StatItem {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accentClass: string;
}

interface StatsOverviewProps {
  points: number;
  bookingsCount: number;
  devicesCount: number;
}

export function StatsOverview({ points, bookingsCount, devicesCount }: StatsOverviewProps) {
  const items: StatItem[] = [
    { label: "Total Points", value: points, icon: <Star className="w-10 h-10 text-yellow-500" />, accentClass: "text-blue-600" },
    { label: "Total Bookings", value: bookingsCount, icon: <CalendarIcon className="w-10 h-10 text-green-600" />, accentClass: "text-green-600" },
    { label: "Registered AC Units", value: devicesCount, icon: <AirVent className="w-10 h-10 text-purple-600" />, accentClass: "text-purple-600" },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {items.map((it) => (
        <Card key={it.label} className="rounded-xl shadow-lg p-6 flex items-center justify-between bg-gradient-to-r from-[#B7DEE1] via-[#A9CDD0] to-[#99BCC0]">
          <div>
            <p className="text-sm font-medium text-white">{it.label}</p>
            <p className={`text-3xl font-bold ${it.accentClass}`}>{it.value}</p>
          </div>
          {it.icon}
        </Card>
      ))}
    </div>
  );
}

