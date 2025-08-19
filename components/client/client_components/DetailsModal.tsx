"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Edit, Save, Ban, Calendar, MapPin, Wrench, Clock, CheckCircle2, AlertCircle, Home, Settings, Zap } from "lucide-react";
import { format, addDays } from "date-fns";
import {
  ClientLocation,
  Appointment,
  Device,
  Service,
  Brand,
  ACType,
  HorsepowerOption,
  UUID,
} from "../../../types/database";

interface DetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: ClientLocation;
  locations: ClientLocation[]; // ✅ new prop for the list
  statusType: 'scheduled' | 'due' | 'well-maintained' | 'repair' | 'no-service';
  serviceName?: string | null;
  devices: Device[];
  allBrands: Brand[];
  allACTypes: ACType[];
  allHorsepowerOptions: HorsepowerOption[];
  appointments: Appointment[];
  deviceIdToAppointmentId: Map<UUID, UUID[]>
  onEditStart: (device: Device) => void;
  onEditCancel: () => void;
  onEditSave: (updatedDevice: Partial<Device>) => Promise<void>;
  editingDeviceId: UUID | null;
  editedDeviceData: Partial<Device>;
  setEditedDeviceData: (data: Partial<Device>) => void;
  getProgressBarValue: (device: Device, dueInMonths: number) => number;
  getProgressColorClass: (value: number) => string;
  onRescheduleAppointment?: (appointmentId: UUID, newDate: string) => Promise<void>;
}

export function DetailsModal({
  isOpen,
  onClose,
  location,
  locations,
  statusType,
  serviceName,
  devices,
  allBrands,
  allACTypes,
  allHorsepowerOptions,
  appointments,
  deviceIdToAppointmentId,
  onEditStart,
  onEditCancel,
  onEditSave,
  editingDeviceId,
  editedDeviceData,
  setEditedDeviceData,
  getProgressBarValue,
  getProgressColorClass,
  onRescheduleAppointment,
}: DetailsModalProps) {
  const [reschedulingAppointmentId, setReschedulingAppointmentId] = useState<UUID | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>(
    format(addDays(new Date(), 1), "yyyy-MM-dd")
  );

  if (!isOpen) return null;

  const handleRescheduleClick = (appointmentId: UUID) => {
    setReschedulingAppointmentId(appointmentId);
    setRescheduleDate(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  };

  const handleRescheduleSubmit = async (appointmentId: UUID) => {
    if (onRescheduleAppointment && rescheduleDate) {
      // Ensure the date is in yyyy-MM-dd format
      const formattedDate = format(new Date(rescheduleDate), "yyyy-MM-dd");
      await onRescheduleAppointment(appointmentId, formattedDate);
      setReschedulingAppointmentId(null);
    }
  };

  const handleRescheduleCancel = () => {
    setReschedulingAppointmentId(null);
    setRescheduleDate(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  };

  const titleStatus = statusType === 'scheduled' ? 'Scheduled Units' :
    statusType === 'repair' ? 'Repair Units' :
    statusType === 'no-service' ? 'No Service Units' :
    `${statusType.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')} Units`;

  // Get status color and icon
  const getStatusConfig = () => {
    switch (statusType) {
      case 'scheduled':
        return { color: 'blue', icon: Clock, bgColor: 'bg-blue-50', textColor: 'text-blue-700', borderColor: 'border-blue-200' };
      case 'well-maintained':
        return { color: 'green', icon: CheckCircle2, bgColor: 'bg-green-50', textColor: 'text-green-700', borderColor: 'border-green-200' };
      case 'due':
        return { color: 'orange', icon: AlertCircle, bgColor: 'bg-orange-50', textColor: 'text-orange-700', borderColor: 'border-orange-200' };
      case 'repair':
        return { color: 'red', icon: Wrench, bgColor: 'bg-red-50', textColor: 'text-red-700', borderColor: 'border-red-200' };
      case 'no-service':
        return { color: 'gray', icon: Settings, bgColor: 'bg-gray-50', textColor: 'text-gray-700', borderColor: 'border-gray-200' };
      default:
        return { color: 'gray', icon: Settings, bgColor: 'bg-gray-50', textColor: 'text-gray-700', borderColor: 'border-gray-200' };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className={`${statusConfig.bgColor} ${statusConfig.borderColor} border-b px-6 py-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${statusConfig.color === 'blue' ? 'bg-blue-500' : statusConfig.color === 'green' ? 'bg-green-500' : statusConfig.color === 'orange' ? 'bg-orange-500' : statusConfig.color === 'red' ? 'bg-red-500' : 'bg-gray-500'} text-white`}>
                <StatusIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{titleStatus}</h2>
                <div className="flex items-center space-x-4 mt-1">
                  <div className="flex items-center space-x-1 text-sm text-gray-600">
                    <Home className="w-4 h-4" />
                    <span>{location.name}</span>
                  </div>
                  {serviceName && serviceName !== 'No Service' && (
                    <Badge variant="secondary" className={`${statusConfig.textColor} ${statusConfig.bgColor}`}>
                      {serviceName}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 rounded-full hover:bg-white/80 transition-colors text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
              <Settings className="w-5 h-5 text-gray-600" />
              <span>Air Conditioning Units</span>
            </h3>
            <Badge variant="outline" className="text-sm px-3 py-1">
              {devices.length} {devices.length === 1 ? 'device' : 'devices'}
            </Badge>
          </div>
          <div className="space-y-4">
            {devices.length > 0 ? (
              devices.map((device) => {
                const brand = allBrands.find((b) => b.id === device.brand_id)?.name || 'N/A';
                const acType = allACTypes.find((t) => t.id === device.ac_type_id)?.name || 'N/A';
                const horsepower = allHorsepowerOptions.find((h) => h.id === device.horsepower_id)?.display_name || 'N/A';
                const progressBar3Month = getProgressBarValue(device, 3);
                const progressBar4Month = getProgressBarValue(device, 4);
                const progressBar6Month = getProgressBarValue(device, 6);
                const linkedAppointmentIds = deviceIdToAppointmentId.get(device.id as UUID) || [];
                const deviceAppointments = linkedAppointmentIds
                  .map((id) => appointments.find((a) => a.id === id))
                  .filter(Boolean) as Appointment[];
                const confirmedAppt = deviceAppointments.find(a => a.status === 'confirmed');
                const completedAppts = deviceAppointments.filter(a => a.status === 'completed');
                const latestCompleted = completedAppts.sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime())[0];
                const deviceAppointment = confirmedAppt || latestCompleted;

                const showEdit = statusType === 'well-maintained' || statusType === 'due';
                // Show reschedule button for all scheduled appointments (repair, maintenance, and cleaning)
                const showReschedule = statusType === 'scheduled' && confirmedAppt && 
                  (serviceName?.toLowerCase().includes('repair') || 
                   serviceName?.toLowerCase().includes('maintenance') || 
                   serviceName?.toLowerCase().includes('cleaning'));
                const isRescheduling = reschedulingAppointmentId === confirmedAppt?.id;

                return (
                  <Card key={device.id} className="border border-gray-200 hover:shadow-md transition-all duration-200">
                    <CardContent className="p-4">
                      {editingDeviceId === device.id ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <Label htmlFor={`name-${device.id}`} className="text-sm font-medium text-gray-700">Device Name</Label>
                              <Input 
                                id={`name-${device.id}`} 
                                value={editedDeviceData.name || ''} 
                                onChange={(e) => setEditedDeviceData({ ...editedDeviceData, name: e.target.value })}
                                className="mt-1"
                                placeholder="Enter device name"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`location-${device.id}`} className="text-sm font-medium text-gray-700">Location</Label>
                              <Select value={editedDeviceData.location_id || ''} onValueChange={(value) => setEditedDeviceData({ ...editedDeviceData, location_id: value })}>
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="Select a location" />
                                </SelectTrigger>
                                <SelectContent>
                                  {locations
                                    .filter((loc) => loc.client_id === location.client_id)
                                    .map((loc) => {
                                      const label = [
                                        loc.name,
                                        loc.address_line1,
                                        loc.barangay_name,
                                        loc.city_name,
                                      ]
                                        .filter(Boolean)
                                        .join(", ");
                                      return (
                                        <SelectItem key={loc.id} value={loc.id as unknown as string}>
                                          {label || loc.name}
                                        </SelectItem>
                                      );
                                    })}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor={`horsepower-${device.id}`} className="text-sm font-medium text-gray-700">Horsepower</Label>
                              <Select value={editedDeviceData.horsepower_id || ''} onValueChange={(value) => setEditedDeviceData({ ...editedDeviceData, horsepower_id: value })}>
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="Select horsepower" />
                                </SelectTrigger>
                                <SelectContent>
                                  {allHorsepowerOptions.map((hp) => (
                                    <SelectItem key={hp.id} value={hp.id}>{hp.display_name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex justify-end space-x-3 pt-4 border-t">
                            <Button onClick={onEditCancel} variant="outline" size="sm" className="flex items-center space-x-2">
                              <Ban className="w-4 h-4" />
                              <span>Cancel</span>
                            </Button>
                            <Button onClick={() => onEditSave(editedDeviceData)} size="sm" className="bg-blue-600 hover:bg-blue-700 flex items-center space-x-2">
                              <Save className="w-4 h-4" />
                              <span>Update</span>
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          {/* Device Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <Zap className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900 text-lg">{device.name}</h4>
                                <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                                  <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">{brand}</span>
                                  <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">{acType}</span>
                                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">{horsepower}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              {showEdit && (
                                <Button onClick={() => onEditStart(device)} variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                  <Edit className="w-4 h-4 mr-1" />
                                  <span className="text-xs">Edit</span>
                                </Button>
                              )}
                              {showReschedule && confirmedAppt && (
                                <Button 
                                  onClick={() => handleRescheduleClick(confirmedAppt.id)} 
                                  variant="ghost" 
                                  size="sm"
                                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                  title="Reschedule Appointment"
                                >
                                  <Calendar className="w-4 h-4 mr-1" />
                                  <span className="text-xs">Reschedule</span>
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          {/* Appointment Info */}
                          {deviceAppointment && serviceName && serviceName !== 'No Service' && statusType !== 'due' && statusType !== 'well-maintained' && statusType !== 'repair' && (
                            <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-800">Scheduled for {format(new Date(deviceAppointment.appointment_date), 'MMM d, yyyy')}</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Reschedule form */}
                          {isRescheduling && confirmedAppt && (
                            <div className="mb-3 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-200">
                              <div className="flex items-center space-x-2 mb-3">
                                <Calendar className="w-4 h-4 text-orange-600" />
                                <h4 className="text-sm font-semibold text-orange-800">Reschedule Appointment</h4>
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <Label htmlFor="rescheduleDate" className="text-xs text-orange-700 font-medium">Select New Date</Label>
                                  <Input
                                    id="rescheduleDate"
                                    type="date"
                                    min={format(addDays(new Date(), 1), "yyyy-MM-dd")}
                                    value={
                                      rescheduleDate
                                        ? (format(new Date(rescheduleDate), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
                                            ? format(addDays(new Date(), 1), "yyyy-MM-dd") // force tomorrow if today
                                            : format(new Date(rescheduleDate), "yyyy-MM-dd"))
                                        : ""
                                    }
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      if (raw) {
                                        const formatted = format(new Date(raw), "yyyy-MM-dd");
                                        setRescheduleDate(formatted); // store exact picked date
                                      } else {
                                        setRescheduleDate("");
                                      }
                                    }}
                                    className="mt-1 w-full border-orange-200 focus:border-orange-400"
                                  />
                                </div>
                                <div className="flex justify-end space-x-2">
                                  <Button 
                                    onClick={handleRescheduleCancel}
                                    variant="outline" 
                                    size="sm"
                                    className="text-orange-700 border-orange-300 hover:bg-orange-50"
                                  >
                                    Cancel
                                  </Button>
                                  <Button 
                                    onClick={() => handleRescheduleSubmit(confirmedAppt.id)}
                                    size="sm"
                                    className="bg-orange-600 hover:bg-orange-700 text-white"
                                    disabled={!rescheduleDate}
                                  >
                                    Update Date
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Progress Bars for Well-Maintained/Due */}
                          {(statusType === 'well-maintained' || statusType === 'due') && device.last_cleaning_date && (
                            <div className="space-y-4">
                              <div className="flex items-center space-x-2 text-sm text-gray-600 mb-3">
                                <Clock className="w-4 h-4" />
                                <span>Last serviced: {format(new Date(device.last_cleaning_date), 'MMM d, yyyy')}</span>
                              </div>
                              
                              <div className="space-y-3">
                                <div className="p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">3 Month Service</span>
                                    <span className={`text-sm font-bold ${progressBar3Month > 75 ? 'text-red-600' : progressBar3Month > 40 ? 'text-orange-600' : 'text-green-600'}`}>
                                      {Math.round(progressBar3Month)}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div 
                                      className={`h-2.5 rounded-full transition-all duration-500 ${getProgressColorClass(progressBar3Month)}`}
                                      style={{ width: `${Math.min(progressBar3Month, 100)}%` }}
                                    ></div>
                                  </div>
                                </div>
                                
                                <div className="p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">4 Month Service</span>
                                    <span className={`text-sm font-bold ${progressBar4Month > 75 ? 'text-red-600' : progressBar4Month > 40 ? 'text-orange-600' : 'text-green-600'}`}>
                                      {Math.round(progressBar4Month)}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div 
                                      className={`h-2.5 rounded-full transition-all duration-500 ${getProgressColorClass(progressBar4Month)}`}
                                      style={{ width: `${Math.min(progressBar4Month, 100)}%` }}
                                    ></div>
                                  </div>
                                </div>
                                
                                <div className="p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">6 Month Service</span>
                                    <span className={`text-sm font-bold ${progressBar6Month > 75 ? 'text-red-600' : progressBar6Month > 40 ? 'text-orange-600' : 'text-green-600'}`}>
                                      {Math.round(progressBar6Month)}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div 
                                      className={`h-2.5 rounded-full transition-all duration-500 ${getProgressColorClass(progressBar6Month)}`}
                                      style={{ width: `${Math.min(progressBar6Month, 100)}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="text-center py-12">
                <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">No devices found</p>
                <p className="text-gray-400 text-sm">There are no devices matching this status.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

