"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Calendar, MapPin, Trash } from "lucide-react";
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
  CustomSetting,
} from "../../../types/database";
import { customSettingsApi } from "@/pages/api/custom_settings/customSettingsApi";
import { Sparkles, Wrench, Settings, Home } from "lucide-react";
import { BlockedDateModal } from "./BlockedDateModal";
import { blockedDatesApi } from "@/pages/api/dates/blockedDatesApi";

const serviceIcons: Record<string, React.ElementType> = {
  Cleaning: Sparkles,
  Repair: Wrench,
  Maintenance: Settings,
};

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
  // New props for additional units to existing service
  showAdditionalUnits: boolean;
  setShowAdditionalUnits: (v: boolean) => void;
  additionalUnits: Array<{ brand_id: UUID | null; ac_type_id: UUID | null; horsepower_id: UUID | null; quantity: number; appointment_date: string }>;
  onAddAdditionalUnit: () => void;
  onRemoveAdditionalUnit: (index: number) => void;
  onUpdateAdditionalUnit: (index: number, field: string, value: any) => void;
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
    availableBlockedDates,
    onDateBlocked,
    calculateDevicePrice,
    calculateDiscount,
    calculateCombinedTotalPrice,
    onCheckSummary,
    getAvailableDevices,
    appointments,
    deviceIdToAppointmentId,
  } = props;

   const [customSettings, setCustomSettings] = useState<CustomSetting[]>([])
   const [appointmentDate, setAppointmentDate] = useState<Date | null>(null);
   const [showBlockedDateModal, setShowBlockedDateModal] = useState<BlockedDate | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const settings = await customSettingsApi.getAll();
        setCustomSettings(settings);
      } catch (err) {
        console.error("Failed to load custom settings:", err);
      }
    }
    fetchSettings();
  }, []);

    const isDateBlocked = (date: string) => {
      return blockedDatesApi.isDateBlocked(date, availableBlockedDates);
    };


    useEffect(() => {
    if (bookingDate) {
      let date = new Date(bookingDate);
      while (isDateBlocked(format(date, "yyyy-MM-dd"))) {
      date = addDays(date, 1);
    }
    if (format(date, "yyyy-MM-dd") !== bookingDate) {
      setBookingDate(format(date, "yyyy-MM-dd"));
      }
    }
    }, [bookingDate, availableBlockedDates]);

  if (!isOpen) return null;

  const location = selectedLocationId ? locations.find(l => l.id === selectedLocationId) : undefined;
  const locationDevices = selectedLocationId ? props.devices.filter(d => d.location_id === selectedLocationId) : [];
 

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
          <X className="w-6 h-6" />
        </button>

        {/* Location Header with Icon */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <Home className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{location ? location.name : 'Select Location'}</h2>
              <p className="text-sm text-gray-500">Booking for this location</p>
            </div>
          </div>
          
          {/* Device List with better styling */}
          <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500">
            <div className="flex items-center space-x-2 mb-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-gray-700">Available Devices:</span>
            </div>
            <div className="text-sm text-gray-600">
              {locationDevices.length > 0 ? (
                <div className="space-y-1">
                  {locationDevices.map((d, index) => {
                    const brand = allBrands.find(b => b.id === d.brand_id)?.name || 'N/A';
                    const acType = allACTypes.find(t => t.id === d.ac_type_id)?.name || 'N/A';
                    const horsepower = allHorsepowerOptions.find(h => h.id === d.horsepower_id)?.display_name || 'N/A';
                    return (
                      <div key={d.id} className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <span>{d.name} ({brand} {acType} {horsepower})</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <span className="text-gray-500 italic">No devices available</span>
              )}
            </div>
          </div>
        </div>

        {/* Step 1: Appointment Date - Priority Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Select Appointment Date</h3>
                <p className="text-sm text-gray-600">Choose your preferred date for the service</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="bg-white p-2 rounded-lg border-2 border-blue-300">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <Input
                id="bookingDate"
                type="date"
                min={format(addDays(new Date(), 1), "yyyy-MM-dd")}
                // value={
                //   bookingDate
                //     ? (format(new Date(bookingDate), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
                //         ? format(addDays(new Date(), 1), "yyyy-MM-dd") // force tomorrow if today
                //         : format(new Date(bookingDate), "yyyy-MM-dd"))
                //     : ""
                // }
                value={bookingDate ? format(new Date(bookingDate), "yyyy-MM-dd") : ""}

                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw) {
                    const formatted = format(new Date(raw), "yyyy-MM-dd");
                    const blocked = isDateBlocked(formatted);
                  if (blocked) {
                    setShowBlockedDateModal(blocked);
                  } else {
                    setBookingDate(formatted);
                  }
                  } else {
                    setBookingDate("");
                  }
                }}
                 className="text-base font-semibold border-2 border-blue-300 focus:border-blue-500 w-48"
              />
              {bookingDate && (
                <Badge className="bg-green-100 text-green-800 border-green-300">
                  {bookingDate ? format(new Date(bookingDate), "yyyy-MM-dd") : ""}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Step 2: Service Selection */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-indigo-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
              2
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Select Service</h3>
              <p className="text-sm text-gray-600">Choose the type of service you need</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {allServices.filter(s => s.is_active).map(service => {
              const isDisabled = service.set_inactive;
              const inactiveMessage =
                customSettings.find(cs => cs.setting_key === "service_inactive")?.setting_value
                || "Service not available";
              const isSelected = selectedServiceId === service.id;

              const ServiceIcon = serviceIcons[service.name] || Settings;

              return (
                <Card
                  key={service.id}
                  onClick={() => !isDisabled && setSelectedServiceId(service.id)}
                  className={`cursor-pointer rounded-xl p-4 transition-all duration-200 transform hover:scale-105 
                    ${isDisabled ? "opacity-50 cursor-not-allowed border-gray-300" : "hover:border-blue-500 hover:shadow-lg"}
                    ${isSelected ? "border-2 border-blue-600 bg-blue-50 shadow-md" : "border border-gray-200"}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-lg ${
                      isSelected ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"
                    }`}>
                      <ServiceIcon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold text-base ${
                        isSelected ? "text-blue-800" : "text-gray-800"
                      }`}>{service.name}</p>
                      {isDisabled && (
                        <p className="text-xs text-red-600 mt-1">{inactiveMessage}</p>
                      )}
                      {isSelected && (
                        <div className="flex items-center space-x-1 mt-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-xs text-blue-600 font-medium">Selected</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>


        {/* Step 3: Device Selection - Show only when service is selected */}
        {selectedServiceId && bookingDate && (
          <div className="mb-8">
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
              const selectedService = allServices.find(s => s.id === selectedServiceId);
              
              return (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                      3
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">Select Devices for {selectedService?.name}</h3>
                      <p className="text-sm text-gray-600">
                        Total devices: {allDevices.length} | Available to book: {eligible.length}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-purple-200">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="selectAll"
                          checked={selectedDevices.length === eligible.length && eligible.length > 0}
                          onCheckedChange={onSelectAllDevices}
                        />
                        <label htmlFor="selectAll" className="text-sm font-medium leading-none">Select All Available</label>
                      </div>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {selectedDevices.length} selected
                      </Badge>
                    </div>

                    <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                      {allDevices.length > 0 ? (
                        allDevices.map(device => {
                          const brand = allBrands.find(b => b.id === device.brand_id)?.name || 'N/A';
                          const acType = allACTypes.find(t => t.id === device.ac_type_id)?.name || 'N/A';
                          const horsepower = allHorsepowerOptions.find(h => h.id === device.horsepower_id)?.display_name || 'N/A';
                          const acName = `${device.name} (${brand} ${acType} ${horsepower})`;
                          const devicePrice = calculateDevicePrice(device);
                          const scheduled = isScheduledForService(device.id as UUID, selectedServiceId);
                          const isSelected = selectedDevices.includes(device.id);
                          const isRepairService = selectedService?.name.toLowerCase().includes('repair') || false;
                          
                          return (
                            <div key={device.id} className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-200 ${
                              scheduled 
                                ? 'opacity-50 border-gray-200 bg-gray-50' 
                                : isSelected 
                                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                                  : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}>
                              <div className="flex items-center space-x-3">
                                <Checkbox
                                  id={`device-${device.id}`}
                                  checked={isSelected}
                                  onCheckedChange={() => onToggleDevice(device.id)}
                                  disabled={scheduled}
                                  className={isSelected ? 'border-blue-500 bg-blue-500' : ''}
                                />
                                <div className="flex-1">
                                  <label htmlFor={`device-${device.id}`} className={`text-sm font-medium cursor-pointer ${
                                    scheduled ? 'text-gray-500' : isSelected ? 'text-blue-800' : 'text-gray-800'
                                  }`}>
                                    {acName}
                                  </label>
                                  {scheduled && (
                                    <div className="mt-1">
                                      <Badge variant="secondary" className="text-xs">Already Scheduled</Badge>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {!isRepairService && !scheduled && (
                                <div className={`text-sm font-bold ${
                                  isSelected ? 'text-blue-700' : 'text-gray-600'
                                }`}>
                                  PHP {devicePrice.toLocaleString()}
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-500">No devices available for this location.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}


        {selectedServiceId && (
          <div className="mb-6">
            <Button 
              variant="outline" 
              onClick={() => props.setShowAdditionalUnits(!props.showAdditionalUnits)} 
              className="w-full rounded-lg rounded-lg border-teal-400 text-teal-600 shadow-md"
            >
              {props.showAdditionalUnits ? 'Remove Additional Units' : 'Add Another Unit +'}
            </Button>

            {/* Additional Units Form */}
            {props.showAdditionalUnits && (
              <div className="mt-4 p-4 border rounded-lg space-y-4 bg-gradient-to-r from-green-50 to-green-50 border border-green-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-md font-semibold">Additional Units for {allServices.find(s => s.id === selectedServiceId)?.name}</h4>
                  <Button variant="outline" size="sm" className="rounded-lg w-full sm:w-auto rounded-lg border-teal-400 text-teal-600 shadow-md" onClick={props.onAddAdditionalUnit}>
                    <Plus className="w-4 h-4 mr-2" /> Add Unit
                  </Button>
                </div>

                {props.additionalUnits.map((unit, idx) => (
                  <div key={idx} className="space-y-4 p-4 border rounded-lg bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                      <div>
                        <Label>Brand</Label>
                        <Select value={unit.brand_id || ''} onValueChange={(v) => props.onUpdateAdditionalUnit(idx, 'brand_id', v)}>
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
                        <Select value={unit.ac_type_id || ''} onValueChange={(v) => props.onUpdateAdditionalUnit(idx, 'ac_type_id', v)}>
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
                        <Select value={unit.horsepower_id || ''} onValueChange={(v) => props.onUpdateAdditionalUnit(idx, 'horsepower_id', v)}>
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
                      <div>
                        <Label>Quantity</Label>
                        <Input type="number" min={1} value={unit.quantity} onChange={(e) => props.onUpdateAdditionalUnit(idx, 'quantity', Number(e.target.value))} className="mt-1" />
                      </div>
                      <div>
                        <Button variant="outline" className = "bg-red-200 text-white hover:bg-red-900 hover:text-white " onClick={() => props.onRemoveAdditionalUnit(idx)}>
                          <Trash className="w-6 h-6" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {showNewUnitsForm && (
          <div className="mt-4 p-4 border rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">New Units</h3>
              <Button variant="outline" size="sm" className = "rounded-lg w-full sm:w-auto rounded-lg border-teal-400 text-teal-600 shadow-md" onClick={onAddNewUnit}>
                <Plus className="w-4 h-4 mr-2" /> Add Unit
              </Button>
            </div>

            {newUnits.map((unit, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end  ">
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
                  <Button variant="outline" className="bg-red-200 text-white hover:bg-red-900 hover:text-white" onClick={() => onRemoveNewUnit(idx)}>
                    <Trash className="w-6 h-6" />
                  </Button>
                </div>
              </div>
            ))}

            <div className="flex justify-end">
              <Button variant="outline" onClick={onNewUnitsSubmit} className="rounded-lg w-full sm:w-auto rounded-lg border-teal-400 text-teal-600 shadow-md">Continue</Button>
            </div>
          </div>
        )}

        {showBlockedDateModal && (
        <BlockedDateModal
          blockedDate={showBlockedDateModal}
          onClose={() => setShowBlockedDateModal(null)}
          />
        )}

        {(selectedDevices.length > 0 || additionalServiceDevices.length > 0 || props.additionalUnits.some(unit => unit.brand_id && unit.ac_type_id && unit.horsepower_id)) && (() => {
          const selectedService = allServices.find(s => s.id === selectedServiceId);
          const additionalService = allServices.find(s => s.id === additionalServiceId);
          const isMainRepairService = selectedService?.name.toLowerCase().includes('repair') || false;
          const isAdditionalRepairService = additionalService?.name.toLowerCase().includes('repair') || false;
          const shouldHidePricing = (selectedDevices.length > 0 && isMainRepairService) || 
                                   (additionalServiceDevices.length > 0 && isAdditionalRepairService);
          
          return (
            <div className="sticky bottom-0 bg-white border-t pt-4 mt-6">
              <div className="flex justify-end mt-4 space-x-4">
                <Button onClick={onClose} variant="outline" className="rounded-lg bg-gray-to-r from-gray-500 to-gray-500 hover:opacity-90 text-gray-900">Cancel</Button>
                <Button 
                  onClick={onCheckSummary} 
                  variant="outline"
                  className="rounded-lg w-full sm:w-auto rounded-lg border-teal-400 text-teal-600 shadow-md bg-white hover:bg-white" 
                  disabled={selectedDevices.length === 0 && !props.additionalUnits.some(unit => unit.brand_id && unit.ac_type_id && unit.horsepower_id)}
                >
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

