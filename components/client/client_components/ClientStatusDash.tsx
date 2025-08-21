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
  handleOpenDetailsModal: (locationId: UUID, statusType: 'scheduled' | 'due' | 'well-maintained' | 'repair' | 'no-service', serviceName?: string,) => void;
  // Primary location editing props
  locations: ClientLocation[];
  isEditingPrimaryLocation: boolean;
  selectedPrimaryLocationId: UUID | null;
  onStartEditPrimaryLocation: () => void;
  onCancelEditPrimaryLocation: () => void;
  onUpdatePrimaryLocation: () => void;
  onPrimaryLocationChange: (locationId: UUID) => void;
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
            Cleaning Status
          </CardTitle>
          {locations.length > 1 && (
            <div className="flex items-center space-x-2">
              {isEditingPrimaryLocation ? (
                <>
                  <Button
                    onClick={onCancelEditPrimaryLocation}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={onUpdatePrimaryLocation}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-xs"
                  >
                    Update Primary
                  </Button>
                </>
              ) : (
                <Button
                  onClick={onStartEditPrimaryLocation}
                  variant="outline"
                  size="sm"
                  className="ml-4 bg-green-600 hover:bg-green-700 rounded-lg text-white"
                >
                  <Edit className="w-4 h-4 mr-2 text-white" />
                  Edit Primary Location
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0 space-y-4">
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

        {cleaningStatuses.length > 0 ? (
          cleaningStatuses.map(status => (
            <div key={status.location.id} className="border-b last:border-b-0 py-4">
                 <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <Home className="w-5 h-5 text-blue-600" />
                        <p className="font-semibold text-lg text-gray-800">
                          {status.location.name}
                        </p>
                        {status.location.is_primary && (
                          <Badge className="bg-blue-100 text-blue-700 text-xs">Primary</Badge>
                        )}
                        {/* Edit button */}
                        <button
                          onClick={() => onEditLocation(status.location)}
                          className="ml-2 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-400">{formatAddress(status.location)}</p>

                      <p className="font-medium text-gray-700 mt-1">
                        Total Devices: <span className="font-medium font-bold">{status.totalDevices}</span>
                      </p>
                      
                    </div>

                  
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-blue-50 text-blue-700 text-xs">
                      Booked: {status.scheduledDevices}
                    </Badge>
                    <Badge className="bg-red-50 text-red-700 text-xs">
                      Due: {status.dueDevices}
                    </Badge>
                    <Badge className="bg-green-50 text-green-700 text-xs">
                      Up to Date: {status.wellMaintainedDevices}
                    </Badge>
                    <Badge className="bg-purple-50 text-purple-700 text-xs">
                      Repair: {status.devices.filter(d => d.status === "repair").length}
                    </Badge>
                     <Button
                      className="ml-4 bg-blue-600 hover:bg-blue-700 rounded-lg"
                      onClick={() => handleOpenBookingModal(status.location.id)}
                    >
                      <Plus className="w-4 h-4 mr-2" /> Add Booking
                    </Button>
                  </div>
                  </div>

              {/* Services Section */}
              <div className="space-y-3">
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

                    // ✅ For Cleaning: try appointment first, fallback to device.last_cleaning_date
                    if (serviceName.toLowerCase().includes("clean")) {
                        let candidateDate: string | null = null;

                        // ✅ only count completed CLEANING appointments
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
                    <div key={serviceName} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-800">
                          {serviceName === "No Service"
                            ? serviceName
                            : serviceName.toLowerCase().includes("repair")
                            ? serviceName 
                            : `${serviceName} ${
                                group.lastServiceDate
                                  ? `(Last Serviced: ${format(
                                      new Date(group.lastServiceDate),
                                      "MMM d, yyyy"
                                    )})`
                                  : "(No Service Record Yet)"
                              }`}
                        </h4>
                      </div>

                      {/* Group by status */}
                      {(() => {
                        const devices = group.devices;

                        if (
                          serviceName.toLowerCase().includes("repair") ||
                          serviceName.toLowerCase().includes("maintenance")
                        ) {
                          const repairDevices = devices.filter(d => d.status === "repair");
                          if (repairDevices.length === 0) return null;

                          return (
                            <div key="repair" className="text-sm mb-2">
                              <span className="text-purple-600 font-medium">
                                Repair: {repairDevices.length} Unit
                                {repairDevices.length > 1 ? "s" : ""}
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

                        // For Cleaning + other services
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
                              <div key={statusKey} className="text-sm mb-2">
                                <span
                                  className={`${
                                    statusColors[statusKey as keyof typeof statusColors]
                                  } font-medium`}
                                >
                                  {statusLabels[statusKey as keyof typeof statusLabels]}:{" "}
                                  {statusDevices.length} Unit
                                  {statusDevices.length > 1 ? "s" : ""}
                                </span>
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="p-0 h-auto text-blue-600 ml-2"
                                  onClick={() =>
                                    handleOpenDetailsModal(
                                      status.location.id,
                                      statusKey as
                                        | "scheduled"
                                        | "due"
                                        | "well-maintained"
                                        | "repair"
                                        | "no-service",
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
                    </div>
                  ));
                })()}
              </div>


            </div>
          ))
                 ) : (
           <p className="text-sm text-gray-500">No devices registered for this client yet.</p>
         )}

         {/* Pagination Controls */}
         {totalPages > 1 && (
           <div className="flex justify-between items-center mt-6 pt-4 border-t">
             <Button
               onClick={onPreviousPage}
               disabled={currentPage === 1}
               variant="outline"
               size="sm"
               className="flex items-center space-x-2"
             >
               <ChevronLeft className="w-4 h-4" />
               <span>Previous</span>
             </Button>
             <span className="text-sm text-gray-700">
               Page {currentPage} of {totalPages}
             </span>
             <Button
               onClick={onNextPage}
               disabled={currentPage === totalPages}
               variant="outline"
               size="sm"
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