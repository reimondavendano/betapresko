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
  is_referral?: boolean;
  appointment?: {
    id: string;
    service?: { id: string; name: string } | null;
  } | null;
}

interface PointsCardProps {
  clientId: string;
  itemsPerPage?: number;
  onPointsChanged?: () => void;
}

export function PointsCard({ 
  clientId, 
  itemsPerPage = 5,
  onPointsChanged 
}: PointsCardProps) {
  const [statusFilter, setStatusFilter] = useState<"all" | "Earned" | "Expired">("all");
  const [dateFilter, setDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [points, setPoints] = useState<LoyaltyPoint[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Modal state
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
      console.log('Fetching points with filters:', { 
        clientId, 
        page, 
        itemsPerPage, 
        statusFilter, 
        dateFilter 
      });

      const { data, count } = await loyaltyPointsApi.getLoyaltyPoints(
        clientId,
        page,
        itemsPerPage,
        statusFilter,
        dateFilter
      );

      console.log('Raw API response:', { data, count });

      // Improved data normalization with better error handling
      const normalized: LoyaltyPoint[] = (data || []).map((p: any) => {
        // More robust status normalization
        let normalizedStatus: "Earned" | "Redeemed" | "Expired" = "Earned";
        if (p.status) {
          const statusLower = p.status.toString().toLowerCase();
          if (statusLower === "earned") {
            normalizedStatus = "Earned";
          } else if (statusLower === "redeemed") {
            normalizedStatus = "Redeemed";
          } else if (statusLower === "expired") {
            normalizedStatus = "Expired";
          }
        }

        const normalized = {
          id: p.id?.toString() || "",
          points: Number(p.points) || 0,
          status: normalizedStatus,
          date_earned: p.date_earned || "",
          date_expiry: p.date_expiry || null,
          notes: p.notes || null,
          is_referral: Boolean(p.is_referral),
          appointment: p.appointment || null,
        };

        console.log('Normalized point:', normalized);
        return normalized;
      })
      // Filter out redeemed points from the display
      .filter(p => p.status !== "Redeemed");

      setPoints(normalized);
      setTotalCount(normalized.length); // Update count to reflect filtered results
      setTotalPages(Math.ceil(normalized.length / itemsPerPage));

      console.log('Final state:', { 
        pointsCount: normalized.length, 
        totalCount: normalized.length, 
        totalPages: Math.ceil(normalized.length / itemsPerPage) 
      });

    } catch (err) {
      console.error("Error fetching Presko Reward Points:", err);
      // Reset state on error
      setPoints([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchPoints(currentPage);
    }
  }, [clientId, currentPage, statusFilter, dateFilter]);

  // Add function to handle successful redemption
  const handleRedemptionSuccess = () => {
    console.log('Redemption successful, refreshing data...');
    // Refresh the points data
    fetchPoints(currentPage);
    // Notify parent component
    onPointsChanged?.();
  };

  const getServiceDisplayName = (point: LoyaltyPoint) => {
    // If appointment service name exists, use it
    if (point.appointment?.service?.name) {
      return point.appointment.service.name;
    }
    
    // If no service name, check is_referral flag
    if (point.is_referral === true) {
      return "Referral Bonus";
    } else {
      return "Cleaning";
    }
  };

  // Helper function to safely format dates
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch (error) {
      console.error('Date formatting error:', error, 'for date:', dateString);
      return dateString; // Return original string if formatting fails
    }
  };

  // Calculate pagination info
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalCount);

  return (
    <Card className="rounded-xl shadow-lg p-6 bg-white">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-xl font-bold">Presko Reward Earned Points</CardTitle>
        
      </CardHeader>
      <CardContent className="p-0">
        
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-4 px-6">
          <select
            value={statusFilter}
            onChange={(e) => {
              const newFilter = e.target.value as "all" | "Earned" | "Expired";
              console.log('Status filter changed to:', newFilter);
              setStatusFilter(newFilter);
              setCurrentPage(1); // Reset to first page when filtering
            }}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value="Earned">Earned</option>
            <option value="Expired">Expired</option>
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              console.log('Date filter changed to:', e.target.value);
              setDateFilter(e.target.value);
              setCurrentPage(1); // Reset to first page when filtering
            }}
            className="border rounded px-3 py-2 text-sm"
            placeholder="Filter by date"
          />

          {/* Clear filters button */}
          {(statusFilter !== "all" || dateFilter) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('Clearing filters');
                setStatusFilter("all");
                setDateFilter("");
                setCurrentPage(1);
              }}
            >
              Clear Filters
            </Button>
          )}
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
                  Expiry Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    Loading...
                  </td>
                </tr>
              ) : points.length > 0 ? (
                points.map((p) => (
                  <tr key={p.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getServiceDisplayName(p)}
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
                            : "bg-red-100 text-red-800"
                        }
                      >
                        {p.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    {statusFilter !== "all" || dateFilter 
                      ? `No Presko reward points found for the selected filters.`
                      : `No Presko reward points found for this client.`
                    }
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
              <span>Prev</span>
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

        {/* Results summary - Fixed calculation */}
        {!loading && totalCount > 0 && (
          <div className="px-6 mt-2 text-sm text-gray-600">
            Showing {startIndex} to {endIndex} of {totalCount} entries
            {(statusFilter !== "all" || dateFilter) && " (filtered)"}
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