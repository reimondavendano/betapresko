import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  clientName: string;
  locationLabel: string;
  points: number;
  loyaltyPoints: number;
  onViewProfile: () => void; // ✅ new prop
}

export function DashboardHeader({
  clientName,
  locationLabel,
  points,
  loyaltyPoints,
  onViewProfile,
}: DashboardHeaderProps) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Welcome Header Card - Larger */}
      <Card
        className="md:col-span-2 rounded-xl shadow-lg overflow-hidden text-white relative p-6 md:p-8"
        style={{ backgroundColor: "#99BCC0" }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundColor: "#99BCC0" }}
        ></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-extrabold mb-2">
              Welcome, {clientName}!
            </h1>
            <p className="text-lg opacity-90 mb-4">{locationLabel}</p>

            <Button
              onClick={onViewProfile}
              className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-semibold px-6 py-2 rounded-full shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-transform transform hover:scale-105"
            >
              View Profile
            </Button>
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

      {/* Loyalty Points Card - Smaller */}
      <Card className="md:col-span-1 border-0 shadow-lg bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl overflow-hidden">
        <CardContent className="p-6 flex flex-col items-center justify-center text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-full mb-4">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Presko Reward Points
          </h3>
          <div className="text-4xl font-bold text-orange-600 mb-2">{loyaltyPoints}</div>
          <p className="text-sm text-gray-600">Total earned points</p>
          <div className="mt-4 p-3 bg-white/60 rounded-lg">
            <div className="flex items-center justify-center space-x-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-gray-700">
                Valued Customer
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
