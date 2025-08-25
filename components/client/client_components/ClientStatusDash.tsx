'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Clock,
  Plus,
  Home,
  Edit,
  ChevronLeft,
  ChevronRight,
  Pencil
} from 'lucide-react';
import { format } from 'date-fns';
import {
  ClientLocation,
  UUID
} from '../../../types/database';
import { Dialog, DialogContent, DialogFooter, DialogHeader } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

// Helper function to format the full address
const formatAddress = (location: ClientLocation) => {
  const parts = [
    location.address_line1,
    location.street,
    location.barangay_name,
    location.city_name
  ].filter(Boolean);
  return parts.join(', ');
};

interface CleaningStatusEntry {
  location: ClientLocation;
  dueDevices: number;
  wellMaintainedDevices: number;
  scheduledDevices: number;
  totalDevices: number;
  devices: Array<{
    device: any;
    appointment: any;
    service: any;
    status: 'scheduled' | 'due' | 'well-maintained' | 'no-service' | 'repair';
    brand: string;
    acType: string;
    horsepower: string;
  }>;
}

interface ClientStatusDashProps {
  cleaningStatuses: CleaningStatusEntry[];
  handleOpenBookingModal: (locationId: UUID) => void;
  handleOpenDetailsModal: (
    locationId: UUID,
    statusType: 'scheduled' | 'due' | 'well-maintained' | 'repair' | 'no-service',
    serviceName?: string,
  ) => void;
  // Primary location editing props
  locations: ClientLocation[];
  isEditingPrimaryLocation: boolean;
  selectedPrimaryLocationId: UUID | null;
  onStartEditPrimaryLocation: () => void;
  onCancelEditPrimaryLocation: () => void;
  onUpdatePrimaryLocation: () => void;
  onPrimaryLocationChange: (locationId: UUID) => void;
  onAddLocation: () => void;   
  // Pagination props
  currentPage: number;
  totalPages: number;
  onNextPage: () => void;
  onPreviousPage: () => void;
  onEditLocation: (location: ClientLocation) => void;
}

export function ClientStatusDash({
  cleaningStatuses,
  handleOpenBookingModal,
  handleOpenDetailsModal,
  locations,
  isEditingPrimaryLocation,
  selectedPrimaryLocationId,
  onStartEditPrimaryLocation,
  onCancelEditPrimaryLocation,
  onUpdatePrimaryLocation,
  onPrimaryLocationChange,
  onAddLocation,
  currentPage,
  totalPages,
  onNextPage,
  onPreviousPage,
  onEditLocation
}: ClientStatusDashProps) {

  return (
    <Card className="rounded-xl shadow-lg p-6 bg-white">
      <CardHeader className="p-0 mb-4">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold flex items-center">
            <Clock className="w-5 h-5 mr-2 text-gray-700" />
            Booking Status
          </CardTitle>

          {/* EDIT PRIMARY LOCATION */}
          {locations.length > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
              {isEditingPrimaryLocation ? (
                <>
                  <Button
                    onClick={onCancelEditPrimaryLocation}
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={onUpdatePrimaryLocation}
                    size="sm"
                    className="w-full sm:w-auto rounded-lg bg-gradient-to-r from-[#B7DEE1] via-[#A9CDD0] to-[#99BCC0] text-white shadow-md"
                  >
                    Update Primary
                  </Button>
                </>
              ) : (
                <Button
                  onClick={onStartEditPrimaryLocation}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto rounded-lg border-teal-400 text-teal-600 shadow-md"
                >
                  <Edit className="w-4 h-4 mr-2 text-teal-600" />
                  Edit Primary
                </Button>
              )}
            </div>

          )}
        </div>
      </CardHeader>

      <CardContent className="p-0 space-y-6">
        {/* Primary Location Selection */}
        {isEditingPrimaryLocation && (
          <div className="p-4 border rounded-lg bg-gray-50">
            <h3 className="text-sm font-semibold mb-3 text-gray-700">Select Primary Location</h3>
            <RadioGroup
              value={selectedPrimaryLocationId || ''}
              onValueChange={onPrimaryLocationChange}
              className="space-y-3"
            >
              {locations.map((location) => (
                <div key={location.id} className="flex items-center space-x-3">
                  <RadioGroupItem value={location.id} id={`location-${location.id}`} />
                  <Label htmlFor={`location-${location.id}`} className="flex flex-col cursor-pointer">
                    <div className="flex items-center space-x-2">
                      <Home className="w-4 h-4 text-gray-600" />
                      <span className="font-medium">{location.name}</span>
                      {location.is_primary && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                          Primary
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-gray-600 ml-6">{formatAddress(location)}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}

        {/* Per-location Status */}
        {cleaningStatuses.length > 0 ? (
          cleaningStatuses.map(status => (
            <div key={status.location.id} className="space-y-6">

              {/* Location Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
              <div>
                <div className="flex items-center space-x-2 flex-wrap">
                  <Home className="w-5 h-5 text-blue-600" />
                  <p className="font-semibold text-lg text-gray-800">{status.location.name}</p>
                  {status.location.is_primary && (
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-50 text-xs">Primary</Badge>
                  )}
                  <button
                    onClick={() => onEditLocation(status.location)}
                    className="ml-2 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">{formatAddress(status.location)}</p>
              </div>

              <Button
                size="sm"
                className="w-full sm:w-auto rounded-lg bg-gradient-to-r from-[#B7DEE1] via-[#A9CDD0] to-[#99BCC0] hover:opacity-90 text-white shadow-md"
                onClick={() => handleOpenBookingModal(status.location.id)}
              >
                <Plus className="w-4 h-4 mr-1" /> Add Booking
              </Button>
            </div>


              {/* Row of Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Total Devices Card */}
                <Card className="p-4 flex flex-col items-start">
                  <p className="text-sm font-medium text-gray-600">Total Devices</p>
                  <p className="text-3xl font-bold text-blue-600">{status.totalDevices}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 text-xs">
                      {status.scheduledDevices} Booked
                    </Badge>
                    <Badge className="bg-red-50 text-red-700 hover:bg-red-50 text-xs">
                      {status.dueDevices} Due
                    </Badge>
                    <Badge className="bg-green-50 text-green-700 hover:bg-green-50 text-xs">
                      {status.wellMaintainedDevices} Up to Date
                    </Badge>
                    <Badge className="bg-purple-50 text-purple-700 hover:bg-purple-50 text-xs">
                      {status.devices.filter(d => d.status === "repair").length} Repair
                    </Badge>
                  </div>
                </Card>


                {/* Service Groups */}
                {(() => {
                  const serviceGroups = new Map<
                    string,
                    { devices: any[]; lastServiceDate: string | null }
                  >();

                  status.devices.forEach(device => {
                    const serviceName =
                      device.service?.name || device.appointment?.service?.name || "No Service";

                    if (!serviceGroups.has(serviceName)) {
                      serviceGroups.set(serviceName, { devices: [], lastServiceDate: null });
                    }

                    const group = serviceGroups.get(serviceName)!;
                    group.devices.push(device);

                    if (serviceName.toLowerCase().includes("clean")) {
                      let candidateDate: string | null = null;
                      if (
                        device.appointment?.status === "completed" &&
                        device.appointment?.service?.name?.toLowerCase().includes("clean")
                      ) {
                        candidateDate = device.appointment.appointment_date;
                      } else if (device.device?.last_cleaning_date) {
                        candidateDate = device.device.last_cleaning_date;
                      }
                      if (candidateDate) {
                        if (!group.lastServiceDate || candidateDate > group.lastServiceDate) {
                          group.lastServiceDate = candidateDate;
                        }
                      }
                    }
                  });

                  return Array.from(serviceGroups.entries()).map(([serviceName, group]) => (
                    <Card key={serviceName} className="p-4">
                      <h4 className="font-semibold text-gray-800 mb-1">
                          {serviceName === "No Service"
                            ? serviceName
                            : serviceName.toLowerCase().includes("repair")
                            ? serviceName
                            : (
                              <>
                                {serviceName}
                                {group.lastServiceDate ? (
                                  <span className="ml-1 text-xs text-gray-500 font-normal">
                                    (Last Serviced: {format(new Date(group.lastServiceDate), "MMM d, yyyy")})
                                  </span>
                                ) : (
                                  <span className="ml-1 text-xs text-gray-400 font-normal">
                                    (No Service Record Yet)
                                  </span>
                                )}
                              </>
                            )}
                        </h4>


                      {/* Group by status */}
                      {(() => {
                        const devices = group.devices;

                        if (
                          serviceName.toLowerCase().includes("repair") ||
                          serviceName.toLowerCase().includes("maintenance")
                        ) {
                          const repairDevices = devices.filter(d => d.status === "repair");
                          return (
                            <div className="text-sm">
                              <span className="text-purple-600 font-medium">
                                Repair: {repairDevices.length} Unit{repairDevices.length > 1 ? "s" : ""}
                              </span>
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 h-auto text-blue-600 ml-2"
                                onClick={() =>
                                  handleOpenDetailsModal(status.location.id, "repair", serviceName)
                                }
                              >
                                [View Details]
                              </Button>
                            </div>
                          );
                        }

                        const statusGroups = {
                          "well-maintained": devices.filter(d => d.status === "well-maintained"),
                          due: devices.filter(d => d.status === "due"),
                          scheduled: devices.filter(d => d.status === "scheduled"),
                          "no-service": devices.filter(d => d.status === "no-service"),
                        };

                        return Object.entries(statusGroups)
                          .map(([statusKey, statusDevices]) => {
                            if (statusDevices.length === 0) return null;

                            const statusLabels = {
                              "well-maintained": "Up to date",
                              due: "Due",
                              scheduled: "Booked",
                              "no-service": "No Service",
                            };

                            const statusColors = {
                              "well-maintained": "text-green-600",
                              due: "text-red-600",
                              scheduled: "text-blue-600",
                              "no-service": "text-gray-600",
                            };

                            return (
                              <div key={statusKey} className="text-sm">
                                <span className={`${statusColors[statusKey as keyof typeof statusColors]} font-medium`}>
                                  {statusLabels[statusKey as keyof typeof statusLabels]}:{" "}
                                  {statusDevices.length} Unit{statusDevices.length > 1 ? "s" : ""}
                                </span>
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="p-0 h-auto text-blue-600 ml-2"
                                  onClick={() =>
                                    handleOpenDetailsModal(
                                      status.location.id,
                                      statusKey as "scheduled" | "due" | "well-maintained" | "repair" | "no-service",
                                      serviceName
                                    )
                                  }
                                >
                                  [View Details]
                                </Button>
                              </div>
                            );
                          })
                          .filter(Boolean);
                      })()}
                    </Card>
                  ));
                })()}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500">No devices registered for this client yet.</p>
        )}

       <div className="w-full mt-4 px-6 pb-4">
        <Button
          onClick={onAddLocation}
          variant="outline"
          className="w-full border-4 border-dotted border-teal-400 text-teal-600 hover:bg-teal-50 rounded-lg font-medium py-2"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Location
        </Button>
      </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-6 pt-4 border-t">
            <Button
              onClick={onPreviousPage}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2 rounded-lg border-teal-400 text-teal-600 shadow-md"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Prev</span>
            </Button>
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              onClick={onNextPage}
              disabled={currentPage === totalPages}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2 rounded-lg border-teal-400 text-teal-600 shadow-md"
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
