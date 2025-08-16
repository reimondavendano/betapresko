"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Edit, Save, Ban } from "lucide-react";
import { format } from "date-fns";
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
  onEditSave: () => Promise<void>;
  editingDeviceId: UUID | null;
  editedDeviceData: Partial<Device>;
  setEditedDeviceData: (data: Partial<Device>) => void;
  getProgressBarValue: (device: Device, dueInMonths: number) => number;
  getProgressColorClass: (value: number) => string;
}

export function DetailsModal({
  isOpen,
  onClose,
  location,
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
}: DetailsModalProps) {
  if (!isOpen) return null;

  const titleStatus = statusType === 'scheduled' ? 'Scheduled Units' :
    statusType === 'repair' ? 'Repair Units' :
    statusType === 'no-service' ? 'No Service Units' :
    `${statusType.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')} Units`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl p-8 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
          <X className="w-6 h-6" />
        </button>

        <div className="mb-6">
          <div className="space-y-2">
            <div className="flex items-center">
              <span className="font-semibold text-gray-700 mr-2">Location:</span>
              <span className="text-lg font-medium text-gray-800">{location.name}</span>
            </div>

            {serviceName && serviceName !== 'No Service' && (
              <div className="flex items-center">
                <span className="font-semibold text-gray-700 mr-2">Service:</span>
                <span className="text-lg font-medium text-blue-600">{serviceName}</span>
              </div>
            )}

            <div className="flex items-center">
              <span className="font-semibold text-gray-700 mr-2">Status:</span>
              <span className="text-lg font-medium text-gray-800">{titleStatus}</span>
            </div>
          </div>
        </div>

        <Card className="p-4 rounded-xl shadow-md">
          <CardTitle className="text-lg font-semibold mb-4 text-gray-700">Devices ({devices.length})</CardTitle>
          <CardContent className="space-y-4 p-0 max-h-96 overflow-y-auto">
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

                return (
                  <div key={device.id} className="border-b last:border-b-0 pb-3">
                    {editingDeviceId === device.id ? (
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor={`name-${device.id}`}>Name</Label>
                          <Input id={`name-${device.id}`} value={editedDeviceData.name || ''} onChange={(e) => setEditedDeviceData({ ...editedDeviceData, name: e.target.value })} />
                        </div>
                        <div>
                          <Label htmlFor={`location-${device.id}`}>Location</Label>
                          <Select value={editedDeviceData.location_id || ''} onValueChange={(value) => setEditedDeviceData({ ...editedDeviceData, location_id: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a location" />
                            </SelectTrigger>
                            <SelectContent>
                              {/* The parent can pass locations if you want to support moving devices here */}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor={`horsepower-${device.id}`}>Horsepower</Label>
                          <Select value={editedDeviceData.horsepower_id || ''} onValueChange={(value) => setEditedDeviceData({ ...editedDeviceData, horsepower_id: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select horsepower" />
                            </SelectTrigger>
                            <SelectContent>
                              {allHorsepowerOptions.map((hp) => (
                                <SelectItem key={hp.id} value={hp.id}>{hp.display_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end space-x-2 mt-4">
                          <Button onClick={onEditCancel} variant="outline" size="sm"><Ban className="w-4 h-4 mr-2" />Cancel</Button>
                          <Button onClick={onEditSave} size="sm" className="bg-blue-600 hover:bg-blue-700"><Save className="w-4 h-4 mr-2" />Update</Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900">{device.name}</p>
                          {showEdit && (
                            <Button onClick={() => onEditStart(device)} variant="ghost" size="icon">
                              <Edit className="w-4 h-4 text-blue-500" />
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{brand} | {acType} | {horsepower}</p>
                        {deviceAppointment && serviceName && serviceName !== 'No Service' && (
                          <div className="mt-2 p-2 bg-blue-50 rounded-md">
                            <p className="text-xs text-blue-600">Appointment Date: {format(new Date(deviceAppointment.appointment_date), 'MMM d, yyyy')}</p>
                          </div>
                        )}
                        {(statusType === 'well-maintained' || statusType === 'due') && device.last_cleaning_date && (
                          <div className="mt-2 space-y-3">
                            <p className="text-xs text-gray-500">Last serviced: {format(new Date(device.last_cleaning_date), 'MMM d, yyyy')}</p>
                            <div>
                              <p className="text-xs font-semibold text-gray-700 mb-1">Due in 3 Months</p>
                              <div className="flex items-center space-x-2">
                                <div className={`w-full h-2 ${getProgressColorClass(progressBar3Month)}`} />
                                <span className={`text-xs font-semibold ${progressBar3Month > 75 ? 'text-red-500' : progressBar3Month > 40 ? 'text-orange-500' : 'text-green-500'}`}>{Math.round(progressBar3Month)}%</span>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-700 mb-1">Due in 4 Months</p>
                              <div className="flex items-center space-x-2">
                                <div className={`w-full h-2 ${getProgressColorClass(progressBar4Month)}`} />
                                <span className={`text-xs font-semibold ${progressBar4Month > 75 ? 'text-red-500' : progressBar4Month > 40 ? 'text-orange-500' : 'text-green-500'}`}>{Math.round(progressBar4Month)}%</span>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-700 mb-1">Due in 6 Months</p>
                              <div className="flex items-center space-x-2">
                                <div className={`w-full h-2 ${getProgressColorClass(progressBar6Month)}`} />
                                <span className={`text-xs font-semibold ${progressBar6Month > 75 ? 'text-red-500' : progressBar6Month > 40 ? 'text-orange-500' : 'text-green-500'}`}>{Math.round(progressBar6Month)}%</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-500">No devices for this filter.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

