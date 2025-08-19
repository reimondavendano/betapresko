"use client";

import Image from "next/image";
import { Card } from "@/components/ui/card";

interface DashboardHeaderProps {
  clientName: string;
  locationLabel: string;
}

export function DashboardHeader({ clientName, locationLabel }: DashboardHeaderProps) {
  return (
    <Card className="rounded-xl shadow-lg overflow-hidden text-white relative p-6 md:p-8" style={{ backgroundColor: "#99BCC0" }}>
      <div className="absolute inset-0 opacity-10" style={{ backgroundColor: "#99BCC0" }}></div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24"></div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between">
        <div className="text-center md:text-left mb-4 md:mb-0">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Welcome, {clientName}!</h1>
          <p className="text-lg opacity-90">{locationLabel}</p>
        </div>
        <div className="flex-shrink-0">
          <Image
            src={`/assets/images/icon.jpg`}
            alt="Welcome Illustration"
            width={150}
            height={150}
            className="w-24 h-24 md:w-36 md:h-36 rounded-full object-cover shadow-xl"
          />
        </div>
      </div>
    </Card>
  );
}

