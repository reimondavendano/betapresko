"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { format } from "date-fns";

interface PointsCardProps {
  points: number;
  pointsExpiry?: string | null;
  onReferClick: () => void;
}

export function PointsCard({ points, pointsExpiry, onReferClick }: PointsCardProps) {
  return (
    <Card className="rounded-xl shadow-lg p-6 bg-white">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-xl font-bold flex items-center">
          <Star className="w-5 h-5 mr-2 text-yellow-500" />
          Your Points
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 space-y-4">
        <div className="flex justify-between items-center text-gray-700">
          <p className="text-2xl font-bold text-blue-600">{points}</p>
          {points > 0 && pointsExpiry && (
            <Badge variant="outline" className="text-sm border-yellow-500 text-yellow-700">
              Expires on: {format(new Date(pointsExpiry), 'MMM d, yyyy')}
            </Badge>
          )}
        </div>
        <Button variant="outline" className="w-full rounded-lg border-teal-400 text-teal-600 shadow-md hover:opacity-90 shadow-md" 
         onClick={() => {
          console.log("Refer button clicked");
          onReferClick();
        }}>
          Refer A Friend
        </Button>
        <p className="text-xs text-gray-500 mt-2">
          Note: Points will be credited after the completion of your booking or referrals booking.
        </p>
      </CardContent>
    </Card>
  );
}

