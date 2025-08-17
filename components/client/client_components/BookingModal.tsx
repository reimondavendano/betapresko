"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
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
  BlockedDate,
} from "../../../types/database";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  locations: ClientLocation[];
  selectedLocationId: UUID | null;
  allServices: Service[];
  allBrands: Brand[];
  allACTypes: ACType[];
  allHorsepowerOptions: HorsepowerOption[];
  customSettings: { splitTypePrice: number; windowTypePrice: number; surcharge: number; discount: number; familyDiscount: number; repairPrice: number };
  devices: Device[];
  appointments: Appointment[];
  deviceIdToAppointmentId: Map<UUID, UUID[]>;
  bookingDate: string;
  setBookingDate: (v: string) => void;
  selectedServiceId: UUID | null;
  setSelectedServiceId: (id: UUID) => void;
  selectedDevices: UUID[];
  onToggleDevice: (id: UUID) => void;
  onSelectAllDevices: (checked: boolean) => void;
  showAdditionalService: boolean;
  setShowAdditionalService: (v: boolean) => void;
  additionalServiceId: UUID | null;
  setAdditionalServiceId: (id: UUID) => void;
  additionalServiceDevices: UUID[];
  onToggleAdditionalServiceDevice: (id: UUID) => void;
  onSelectAllAdditionalServiceDevices: (checked: boolean) => void;
  additionalServiceDate: string;
  setAdditionalServiceDate: (v: string) => void;
  showNewUnitsForm: boolean;
  setShowNewUnitsForm: (v: boolean) => void;
  newUnits: Array<{ brand_id: UUID | null; ac_type_id: UUID | null; horsepower_id: UUID | null; quantity: number }>;
  onAddNewUnit: () => void;
  onRemoveNewUnit: (index: number) => void;
  onUpdateNewUnit: (index: number, field: string, value: any) => void;
  onNewUnitsSubmit: () => void;
  availableBlockedDates: BlockedDate[];
  onDateBlocked: (blocked: BlockedDate) => void;
  calculateDevicePrice: (device: Device) => number;
  calculateDiscount: () => { value: number; type: string };
  calculateTotalPrice: () => { subtotal: number; discount: number; discountAmount: number; total: number };
  calculateAdditionalServicePrice: () => { subtotal: number; discount: number; discountAmount: number; total: number };
  calculateCombinedTotalPrice: () => { subtotal: number; discount: number; discountAmount: number; total: number };
  onCheckSummary: () => void;
  getAvailableDevices: () => Device[];
}

export function BookingModal(props: BookingModalProps) {
  const {
    isOpen,
    onClose,
    locations,
    selectedLocationId,
    allServices,
    allBrands,
    allACTypes,
    allHorsepowerOptions,
    bookingDate,
    setBookingDate,
    selectedServiceId,
    setSelectedServiceId,
    selectedDevices,
    onToggleDevice,
    onSelectAllDevices,
    showAdditionalService,
    setShowAdditionalService,
    additionalServiceId,
    setAdditionalServiceId,
    additionalServiceDevices,
    onToggleAdditionalServiceDevice,
    onSelectAllAdditionalServiceDevices,
    additionalServiceDate,
    setAdditionalServiceDate,
    showNewUnitsForm,
    setShowNewUnitsForm,
    newUnits,
    onAddNewUnit,
    onRemoveNewUnit,
    onUpdateNewUnit,
    onNewUnitsSubmit,
    calculateDevicePrice,
    calculateDiscount,
    calculateCombinedTotalPrice,
    onCheckSummary,
    getAvailableDevices,
    appointments,
    deviceIdToAppointmentId,
  } = props;

  if (!isOpen) return null;

  const location = selectedLocationId ? locations.find(l => l.id === selectedLocationId) : undefined;
  const locationDevices = selectedLocationId ? props.devices.filter(d => d.location_id === selectedLocationId) : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
          <X className="w-6 h-6" />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{location ? location.name : 'Select Location'}</h2>
          <p className="text-sm text-gray-600 mt-1">
            Devices: {locationDevices.map(d => {
              const brand = allBrands.find(b => b.id === d.brand_id)?.name || 'N/A';
              const acType = allACTypes.find(t => t.id === d.ac_type_id)?.name || 'N/A';
              const horsepower = allHorsepowerOptions.find(h => h.id === d.horsepower_id)?.display_name || 'N/A';
              return `${d.name} (${brand} ${acType} ${horsepower})`;
            }).join(', ')}
          </p>
        </div>

        <div className="mb-6">
          <Label htmlFor="service-select" className="text-sm font-medium text-gray-700">Service</Label>
          <Select
            value={selectedServiceId || ''}
            onValueChange={(value) => {
              setSelectedServiceId(value as UUID);
              // Clear previously selected devices when service changes
            }}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select a service" />
            </SelectTrigger>
            <SelectContent>
              {allServices.filter(s => s.is_active).map(service => (
                <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedServiceId && (
          <div className="mb-6">
            {(() => {
              const isScheduledForService = (deviceId: UUID, serviceId: UUID | null) => {
                if (!serviceId) return false;
                const apptIds = deviceIdToAppointmentId.get(deviceId) || [];
                if (apptIds.length === 0) return false;
                return apptIds.some(id => {
                  const appt = appointments.find(a => a.id === id);
                  return !!(appt && appt.status === 'confirmed' && appt.service_id === serviceId);
                });
              };
              const allDevices = getAvailableDevices();
              const eligible = allDevices.filter(d => !isScheduledForService(d.id as UUID, selectedServiceId));
              return (
                <>
                  <div className="mb-2 text-sm text-gray-600">
                    Total devices: {allDevices.length} | Eligible to book: {eligible.length}
                  </div>


                  <div className="mt-4 mb-4 flex items-center">
                    <Label htmlFor="bookingDate" className="text-sm font-large text-gray-700">Appointment Date : </Label>
                    <Input
                        id="bookingDate"
                        type="date"
                        min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        className="ml-3 mt-1 w-50" // Added w-32 to make it smaller
                      />
                  </div>

                  <div className="mb-4 flex items-center space-x-2">
                    <Checkbox
                      id="selectAll"
                      checked={selectedDevices.length === eligible.length && eligible.length > 0}
                      onCheckedChange={onSelectAllDevices}
                    />
                    <label htmlFor="selectAll" className="text-sm font-medium leading-none">Select All</label>
                  </div>
                  

                  <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                    {allDevices.length > 0 ? (
                      allDevices.map(device => {
                        const brand = allBrands.find(b => b.id === device.brand_id)?.name || 'N/A';
                        const acType = allACTypes.find(t => t.id === device.ac_type_id)?.name || 'N/A';
                        const horsepower = allHorsepowerOptions.find(h => h.id === device.horsepower_id)?.display_name || 'N/A';
                        const acName = `${device.name} (${brand} ${acType} ${horsepower})`;
                        const devicePrice = calculateDevicePrice(device);
                        const scheduled = isScheduledForService(device.id as UUID, selectedServiceId);
                        const selectedService = allServices.find(s => s.id === selectedServiceId);
                        const isRepairService = selectedService?.name.toLowerCase().includes('repair') || false;
                        return (
                          <div key={device.id} className={`flex items-center justify-between p-3 border rounded-lg ${scheduled ? 'opacity-60' : ''}`}>
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                id={`device-${device.id}`}
                                checked={selectedDevices.includes(device.id)}
                                onCheckedChange={() => onToggleDevice(device.id)}
                                disabled={scheduled}
                              />
                              <label htmlFor={`device-${device.id}`} className={`text-sm font-medium leading-none ${scheduled ? 'text-gray-500' : ''}`}>
                                {acName}
                              </label>
                              {scheduled && <Badge variant="secondary">Scheduled</Badge>}
                            </div>
                            {!isRepairService && <div className="text-sm font-semibold text-blue-600">PHP {devicePrice.toLocaleString()}</div>}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-gray-500">No devices for this location.</p>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}


        {selectedServiceId && (
          <div className="mb-6">
            <Button variant="outline" onClick={() => setShowAdditionalService(!showAdditionalService)} className="w-full">
              {showAdditionalService ? 'Remove Additional Service' : 'Add Another Services +'}
            </Button>

            {showAdditionalService && (
              <div className="mt-4 p-4 border rounded-lg">
                <div className="mb-4">
                  <Label htmlFor="additional-service-select" className="text-sm font-medium text-gray-700">Additional Service</Label>
                  <Select
                    value={additionalServiceId || ''}
                    onValueChange={(value) => {
                      setAdditionalServiceId(value as UUID);
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select an additional service" />
                    </SelectTrigger>
                    <SelectContent>
                      {allServices.filter(s => s.is_active && s.id !== selectedServiceId).map(service => (
                        <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {additionalServiceId && (
                  <>
                    {(() => {
                      const isScheduledForService = (deviceId: UUID, serviceId: UUID | null) => {
                        if (!serviceId) return false;
                        const apptIds = deviceIdToAppointmentId.get(deviceId) || [];
                        if (apptIds.length === 0) return false;
                        return apptIds.some(id => {
                          const appt = appointments.find(a => a.id === id);
                          return !!(appt && appt.status === 'confirmed' && appt.service_id === serviceId);
                        });
                      };
                      const allDevices = getAvailableDevices();
                      const eligible = allDevices.filter(d => !isScheduledForService(d.id as UUID, additionalServiceId));
                      return (
                        <>
                          <div className="mb-2 text-sm text-gray-600">
                            Total devices: {allDevices.length} | Eligible to book: {eligible.length}
                          </div>
                          <div className="mb-4 flex items-center space-x-2">
                            <Checkbox
                              id="selectAllAdditional"
                              checked={additionalServiceDevices.length === eligible.length && eligible.length > 0}
                              onCheckedChange={onSelectAllAdditionalServiceDevices}
                            />
                            <label htmlFor="selectAllAdditional" className="text-sm font-medium leading-none">Select All</label>
                          </div>
                          <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                            {allDevices.map(device => {
                              const brand = allBrands.find(b => b.id === device.brand_id)?.name || 'N/A';
                              const acType = allACTypes.find(t => t.id === device.ac_type_id)?.name || 'N/A';
                              const horsepower = allHorsepowerOptions.find(h => h.id === device.horsepower_id)?.display_name || 'N/A';
                              const acName = `${device.name} (${brand} ${acType} ${horsepower})`;
                              const devicePrice = calculateDevicePrice(device);
                              const scheduled = isScheduledForService(device.id as UUID, additionalServiceId);
                              const additionalService = allServices.find(s => s.id === additionalServiceId);
                              const isAdditionalRepairService = additionalService?.name.toLowerCase().includes('repair') || false;
                              return (
                                <div key={device.id} className={`flex items-center justify-between p-3 border rounded-lg ${scheduled ? 'opacity-60' : ''}`}>
                                  <div className="flex items-center space-x-3">
                                    <Checkbox
                                      id={`additional-device-${device.id}`}
                                      checked={additionalServiceDevices.includes(device.id)}
                                      onCheckedChange={() => onToggleAdditionalServiceDevice(device.id)}
                                      disabled={scheduled}
                                    />
                                    <label htmlFor={`additional-device-${device.id}`} className={`text-sm font-medium leading-none ${scheduled ? 'text-gray-500' : ''}`}>
                                      {acName}
                                    </label>
                                    {scheduled && <Badge variant="secondary">Scheduled</Badge>}
                                  </div>
                                  {!isAdditionalRepairService && <div className="text-sm font-semibold text-blue-600">PHP {devicePrice.toLocaleString()}</div>}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}
                  </>
                )}
                <div className="mt-4">
                      <Label htmlFor="additionalBookingDate" className="text-sm font-medium text-gray-700">Additional Service Date</Label>
                      <Input
                        id="additionalBookingDate"
                        type="date"
                        min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                        value={additionalServiceDate}
                        onChange={(e) => setAdditionalServiceDate(e.target.value)}
                        className="mt-1"
                      />
                </div>
              </div>
            )}
          </div>
        )}

        {showNewUnitsForm && (
          <div className="mt-4 p-4 border rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">New Units</h3>
              <Button variant="outline" size="sm" onClick={onAddNewUnit}>
                <Plus className="w-4 h-4 mr-2" /> Add Unit
              </Button>
            </div>

            {newUnits.map((unit, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div>
                  <Label>Brand</Label>
                  <Select value={unit.brand_id || ''} onValueChange={(v) => onUpdateNewUnit(idx, 'brand_id', v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {allBrands.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>AC Type</Label>
                  <Select value={unit.ac_type_id || ''} onValueChange={(v) => onUpdateNewUnit(idx, 'ac_type_id', v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select AC type" />
                    </SelectTrigger>
                    <SelectContent>
                      {allACTypes.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Horsepower</Label>
                  <Select value={unit.horsepower_id || ''} onValueChange={(v) => onUpdateNewUnit(idx, 'horsepower_id', v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select HP" />
                    </SelectTrigger>
                    <SelectContent>
                      {allHorsepowerOptions.map(hp => (
                        <SelectItem key={hp.id} value={hp.id}>{hp.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end space-x-2">
                  <div className="flex-1">
                    <Label>Quantity</Label>
                    <Input type="number" min={1} value={unit.quantity} onChange={(e) => onUpdateNewUnit(idx, 'quantity', Number(e.target.value))} className="mt-1" />
                  </div>
                  <Button variant="outline" onClick={() => onRemoveNewUnit(idx)}>Remove</Button>
                </div>
              </div>
            ))}

            <div className="flex justify-end">
              <Button onClick={onNewUnitsSubmit}>Continue</Button>
            </div>
          </div>
        )}

        {(selectedDevices.length > 0 || additionalServiceDevices.length > 0) && (() => {
          const selectedService = allServices.find(s => s.id === selectedServiceId);
          const additionalService = allServices.find(s => s.id === additionalServiceId);
          const isMainRepairService = selectedService?.name.toLowerCase().includes('repair') || false;
          const isAdditionalRepairService = additionalService?.name.toLowerCase().includes('repair') || false;
          const shouldHidePricing = (selectedDevices.length > 0 && isMainRepairService) || 
                                   (additionalServiceDevices.length > 0 && isAdditionalRepairService);
          
          return (
            <div className="sticky bottom-0 bg-white border-t pt-4 mt-6">
              {!shouldHidePricing && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3">Pricing Summary</h3>
                  {(() => {
                    const pricing = calculateCombinedTotalPrice();
                    const discount = calculateDiscount();
                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>P{pricing.subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Discount ({pricing.discount}% - {discount.type}):</span>
                          <span className="text-red-600">-P{pricing.discountAmount.toLocaleString()}</span>
                        </div>
                        <div className="border-t pt-2 mt-2">
                          <div className="flex justify-between font-bold">
                            <span>Total Amount:</span>
                            <span className="text-blue-600">P{pricing.total.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              <div className="flex justify-end mt-4 space-x-4">
                <Button onClick={onClose} variant="outline">Cancel</Button>
                <Button onClick={onCheckSummary} className="bg-blue-600 hover:bg-blue-700" disabled={selectedDevices.length === 0}>
                  Check Summary
                </Button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

