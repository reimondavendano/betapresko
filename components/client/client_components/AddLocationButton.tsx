"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface AddLocationButtonProps {
  onClick: () => void;
}

export function AddLocationButton({ onClick }: AddLocationButtonProps) {
  return (
    <Card className="rounded-xl shadow-lg p-6 bg-white">
      <CardContent className="p-0">
        <Button
          variant="outline"
          className="w-full border-blue-600 text-blue-600 hover:bg-blue-50 py-4 text-lg font-medium"
          onClick={onClick}
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Location
        </Button>
      </CardContent>
    </Card>
  );
}

