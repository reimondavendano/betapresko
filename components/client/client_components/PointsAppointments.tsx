// PointsAppointments.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RecentAppointmentsTable } from "./RecentAppointmentsTable";
import { PointsCard } from "./PointsCard";
import { Appointment, ClientLocation, UUID } from "../../../types/database";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PointsAppointmentsProps {
    appointments: Appointment[];
    points: number;
    pointsExpiry?: string | null;
    getServiceName: (id: UUID | null) => string;
    locations: ClientLocation[];
    onReferClick: () => void;
}

export function PointsAppointments({
  appointments,
  points,
  pointsExpiry,
  getServiceName,
  locations,
  onReferClick,
}: PointsAppointmentsProps) {
  
const itemsPerPage = 5;
const [activeTab, setActiveTab] = useState<"appointments" | "points">("points");
const [currentPage, setCurrentPage] = useState(1);


const totalPages = Math.ceil(appointments.length / itemsPerPage);

const paginatedAppointments = appointments.slice(
  (currentPage - 1) * itemsPerPage,
  currentPage * itemsPerPage
);

  return (
    <div className="bg-white rounded-xl shadow-md p-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b mb-4">
        <Button
          variant={activeTab === "points" ? "default" : "outline"}
          className={`rounded-t-md px-4 py-2 ${
            activeTab === "points"
              ? "bg-teal-500 text-white shadow-md"
              : "border-teal-400 text-teal-600"
          }`}
          onClick={() => setActiveTab("points")}
        >
          Points
        </Button>
        <Button
          variant={activeTab === "appointments" ? "default" : "outline"}
          className={`rounded-t-md px-4 py-2 ${
            activeTab === "appointments"
              ? "bg-teal-500 text-white shadow-md"
              : "border-teal-400 text-teal-600"
          }`}
          onClick={() => setActiveTab("appointments")}
        >
          Appointments
        </Button>

      </div>

      {/* Tab Content */}
      <div>
         {activeTab === "points" && (
          <PointsCard points={points} pointsExpiry={pointsExpiry} onReferClick={onReferClick} />
        )}
        {activeTab === "appointments" && (
          <>
            <RecentAppointmentsTable
               appointments={appointments} // full list, not sliced
                getServiceName={getServiceName}
                locations={locations}
                itemsPerPage={5}
            />
          </>
        )}

       
      </div>
    </div>
  );
}
