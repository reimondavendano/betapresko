"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import React from "react";
import { Appointment, ClientLocation } from "../../../types/database";

interface RecentAppointmentsTableProps {
  appointments: Appointment[];
  getServiceName: (id: string | null) => string;
  locations: ClientLocation[];
  itemsPerPage?: number;
}

export function RecentAppointmentsTable({
  appointments,
  getServiceName,
  locations,
  itemsPerPage = 5,
}: RecentAppointmentsTableProps) {
  const [statusFilter, setStatusFilter] = React.useState<"all" | "confirmed" | "completed">("all");
  const [dateFilter, setDateFilter] = React.useState<string>("");
  const [currentPage, setCurrentPage] = React.useState(1);

  // ✅ Apply filters
  const filteredAppointments = appointments.filter((appointment) => {
    const matchStatus =
      statusFilter === "all" ? true : appointment.status === statusFilter;

    const matchDate = dateFilter
      ? format(new Date(appointment.appointment_date), "yyyy-MM-dd") === dateFilter
      : true;

    return matchStatus && matchDate;
  });

  // ✅ Pagination based on filtered data
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage) || 1;

  React.useEffect(() => {
    setCurrentPage(1); // reset when filters change
  }, [statusFilter, dateFilter]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAppointments = filteredAppointments.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  return (
    <Card className="rounded-xl shadow-lg p-6 bg-white">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-xl font-bold flex items-center">
          Recent Appointments
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">

        {/* ✅ Filters */}
        <div className="flex flex-wrap gap-4 mb-4 px-6">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          />
        </div>

        {/* ✅ Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedAppointments.length > 0 ? (
                paginatedAppointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(appointment.appointment_date), "MMM d, yyyy")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getServiceName(appointment.service_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {appointment.location_id
                        ? locations.find((loc) => loc.id === appointment.location_id)?.name || "-"
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {appointment.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Badge
                        className={
                          appointment.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : appointment.status === "confirmed"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-yellow-100 text-yellow-800"
                        }
                      >
                        {appointment.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {appointment.notes || "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    No recent appointments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ✅ Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4 px-6">
            <Button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </Button>
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
