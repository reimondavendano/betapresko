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
          className="w-full rounded-lg w-full rounded-lg border-teal-400 text-teal-600 shadow-md py-4"
          onClick={onClick}
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Location
        </Button>
      </CardContent>
    </Card>
  );
}

