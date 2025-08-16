"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, X } from "lucide-react";
import { format } from "date-fns";
import { BlockedDate } from "../../../types/database";

interface BlockedDateModalProps {
  blockedDate: BlockedDate;
  onClose: () => void;
}

export function BlockedDateModal({ blockedDate, onClose }: BlockedDateModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-sm rounded-lg shadow-lg relative">
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-bold text-red-600 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 mr-2" />
            Date Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-3">
          <p className="text-gray-800 font-medium text-lg">{blockedDate.name}</p>
          <p className="text-gray-600 text-sm">
            From: {format(new Date(blockedDate.from_date), 'MMM d, yyyy')}
          </p>
          <p className="text-gray-600 text-sm">
            To: {format(new Date(blockedDate.to_date), 'MMM d, yyyy')}
          </p>
          {blockedDate.reason && (
            <p className="text-gray-700 text-base mt-2">
              Reason: <span className="font-normal">{blockedDate.reason}</span>
            </p>
          )}
          <Button onClick={onClose} className="mt-4 bg-red-600 hover:bg-red-700 w-full">
            Got It
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

