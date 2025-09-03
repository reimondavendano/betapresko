"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Gem } from "lucide-react";
import { format } from "date-fns";
import React, { useEffect, useState } from "react";
import { loyaltyPointsApi } from "@/pages/api/loyalty_points/loyaltyPointsApi";
import { RedeemBookingModal } from "./RedeemBookingModal";

export interface LoyaltyPoint {
  id: string;
  points: number;
  status: "Earned" | "Redeemed" | "Expired";
  date_earned: string;
  date_expiry?: string | null;
  notes?: string | null;
  appointment?: {
    id: string;
    service?: { id: string; name: string } | null;
  } | null;
}

interface PointsCardProps {
  clientId: string;
  itemsPerPage?: number;
}

export function PointsCard({ clientId, itemsPerPage = 5 }: PointsCardProps) {
  const [statusFilter, setStatusFilter] = useState<"all" | "Earned" | "Redeemed" | "Expired">("all");
  const [dateFilter, setDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [points, setPoints] = useState<LoyaltyPoint[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // ✅ State for Redeem FIFO & yearly cap
  const [nextRedeemableId, setNextRedeemableId] = useState<string | null>(null);
  const [redeemedThisYear, setRedeemedThisYear] = useState(0);

  // ✅ Modal state
  const [redeemModal, setRedeemModal] = useState<{
    isOpen: boolean;
    point: LoyaltyPoint | null;
  }>({
    isOpen: false,
    point: null,
  });

  const fetchPoints = async (page: number) => {
    setLoading(true);
    try {
      const { data, count } = await loyaltyPointsApi.getLoyaltyPoints(
        clientId,
        page,
        itemsPerPage
      );

      let normalized: LoyaltyPoint[] = (data || []).map((p: any) => ({
        id: p.id,
        points: p.points,
        status:
          p.status?.toLowerCase() === "earned"
            ? "Earned"
            : p.status?.toLowerCase() === "redeemed"
            ? "Redeemed"
            : p.status?.toLowerCase() === "expired"
            ? "Expired"
            : "Earned",
        date_earned: p.date_earned || null,
        date_expiry: p.date_expiry || null,
        notes: p.notes || null,
        appointment: p.appointment || null,
      }));

      // ✅ Filters
      if (statusFilter !== "all") {
        normalized = normalized.filter((p) => p.status === statusFilter);
      }
      if (dateFilter) {
        normalized = normalized.filter(
          (p) =>
            p.date_earned &&
            format(new Date(p.date_earned), "yyyy-MM-dd") === dateFilter
        );
      }

      setPoints(normalized);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));

      // ✅ Update FIFO + yearly cap
      const earnedPoints = normalized.filter((p) => p.status === "Earned");
      setNextRedeemableId(earnedPoints.length > 0 ? earnedPoints[0].id : null);

      const currentYear = new Date().getFullYear();
      const redeemedCount = normalized.filter(
        (p) =>
          p.status === "Redeemed" &&
          p.date_earned &&
          new Date(p.date_earned).getFullYear() === currentYear
      ).length;
      setRedeemedThisYear(redeemedCount);
    } catch (err) {
      console.error("Error fetching loyalty points:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoints(currentPage);
  }, [clientId, currentPage, statusFilter, dateFilter]);

  return (
    <Card className="rounded-xl shadow-lg p-6 bg-white">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-xl font-bold">Loyalty Points</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        
        {/* <div className="px-6 py-2 mb-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
          You have used {redeemedThisYear}/3 free cleanings this year.
        </div> */}

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-4 px-6">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="Earned">Earned</option>
            <option value="Redeem">Redeem</option>
            <option value="Expired">Expired</option>
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="border rounded px-3 py-2 text-sm"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Points
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date Earned
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Expired
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Action
                </th> */}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    Loading...
                  </td>
                </tr>
              ) : points.length > 0 ? (
                points.map((p) => (
                  <tr key={p.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {p.appointment?.service?.name || "Referral"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
                      {p.points}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {p.date_earned ? format(new Date(p.date_earned), "MMM d, yyyy") : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {p.date_expiry ? format(new Date(p.date_expiry), "MMM d, yyyy") : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Badge
                        className={
                          p.status === "Earned"
                            ? "bg-green-100 text-green-800"
                            : p.status === "Redeemed"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-red-100 text-red-800"
                        }
                      >
                        {p.status}
                      </Badge>
                    </td>
                    {/* <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {p.status === "Earned" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={p.id !== nextRedeemableId || redeemedThisYear >= 3}
                          onClick={() => setRedeemModal({ isOpen: true, point: p })}
                          className="border-teal-600 bg-white text-teal-500 hover:bg-teal-700"
                        >
                          <Gem className="w-4 h-4 text-teal-500" />
                          Redeem
                        </Button>
                      ) : (
                        "-"
                      )}
                    </td> */}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    No loyalty points found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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

        {/* Redeem Modal */}
        {redeemModal.isOpen && redeemModal.point && (
          <RedeemBookingModal
            isOpen={redeemModal.isOpen}
            onClose={() => setRedeemModal({ isOpen: false, point: null })}
            clientId={clientId}
            point={redeemModal.point}
          />
        )}
      </CardContent>
    </Card>
  );
}