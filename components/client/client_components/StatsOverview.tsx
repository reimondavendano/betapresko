"use client";

import { Card } from "@/components/ui/card";
import { Appointment } from "@/types/database";
import { Star, Calendar as CalendarIcon, AirVent, Wallet, User, MapPin } from "lucide-react"; 
import React from "react";

interface StatItem {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accentClass: string;
}

interface StatsOverviewProps {
  loyaltyPoints: number;
  bookingsCount: number;
  devicesCount: number;
  appointments?: Appointment[];
  referralCount: number;
}

export function StatsOverview({  
  referralCount, 
  loyaltyPoints, 
  bookingsCount, 
  devicesCount, 
  appointments = [] 
}: StatsOverviewProps) {
  // 🟢 Calculate total revenue (sum of `amount` where status = completed)
  const totalCompletedAmount = appointments
    .filter((a) => a.status === "completed")
    .reduce((sum, a) => sum + (a.amount || 0), 0);

  // 🟢 Distinct count of locations
  const uniqueLocationIds = new Set(
    appointments
      .map((a) => a.location_id)
      .filter((id) => id !== null && id !== undefined)
  );
  const locationCount = uniqueLocationIds.size;

  const items: StatItem[] = [
    { label: "Total Bookings", value: bookingsCount, icon: <CalendarIcon className="w-10 h-10 text-green-600" />, accentClass: "text-green-600" },
    { label: "Registered AC Units", value: devicesCount, icon: <AirVent className="w-10 h-10 text-purple-600" />, accentClass: "text-purple-600" },
    // { label: "Completed Amount", value: `₱${totalCompletedAmount.toLocaleString()}`, icon: <Wallet className="w-10 h-10 text-teal-600" />, accentClass: "text-teal-600" },
    { label: "No. of Referrals", value: referralCount, icon: <User className="w-10 h-10 text-pink-600" />, accentClass: "text-pink-600" },
    { label: "No. of Locations", value: locationCount, icon: <MapPin className="w-10 h-10 text-red-600" />, accentClass: "text-red-600" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {items.map((it) => (
        <Card
          key={it.label}
          className="rounded-xl shadow-lg p-6 flex items-center justify-between bg-gradient-to-r border-teal-400"
        >
          <div>
            <p className="text-sm font-medium text-gray-700">{it.label}</p>
            <p className={`text-3xl font-bold ${it.accentClass}`}>{it.value}</p>
          </div>
          {it.icon}
        </Card>
      ))}
    </div>
  );
}
