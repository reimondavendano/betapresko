// components/client/Step2SelectDevices.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import {
  toggleSelectedDevice,
  addNewDevice,
  removeNewDevice,
  setBookingTotalAmount,
  BookingDevice,
  updateNewDeviceProperty,
  toggleSelectAllExistingDevices,
  updateSelectedDeviceLocation,
} from '@/lib/features/client/clientSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Plus, Minus, Trash2, MapPin, Info } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ACType, Brand, Device, HorsepowerOption, UUID } from '@/types/database';

interface Step2SelectDevicesProps {
  onNext: () => void;
  onBack: () => void;
}

export function Step2SelectDevices({ onNext, onBack }: Step2SelectDevicesProps) {
  const dispatch = useDispatch();
  const { devices, locations } = useSelector((state: RootState) => state.client);
  const {
    selectedDevices,
    newDevices,
    selectedService,
    customPricingSettings,
    availableBrands,
    availableACTypes,
    availableHorsepowerOptions,
  } = useSelector((state: RootState) => state.client.booking);
  
  const [subtotal, setSubtotal] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deviceToUpdateId, setDeviceToUpdateId] = useState<UUID | null>(null);
  const [newDeviceIndexToUpdate, setNewDeviceIndexToUpdate] = useState<number | null>(null);
  const [tempSelectedLocationId, setTempSelectedLocationId] = useState<UUID | null>(null);

  const areAllExistingDevicesSelected = devices.length > 0 && selectedDevices.length === devices.length;
  const primaryLocation = locations.find(loc => loc.is_primary);

  const calculateDevicePrice = (acTypeId: UUID | null, horsepowerId: UUID | null, quantity: number = 1): number => {
    if (!acTypeId || !horsepowerId) return 0;

    const acType = availableACTypes.find(type => type.id === acTypeId);
    const horsepower = availableHorsepowerOptions.find(hp => hp.id === horsepowerId);

    if (!acType || !horsepower) return 0;

    let devicePrice = 0;
    const acTypeName = acType.name.toLowerCase();
    const hpValue = horsepower.value;

    if (acTypeName.includes('split') || acTypeName.includes('u-shaped')) {
      devicePrice = customPricingSettings.splitTypePrice;
      if (hpValue > 2) {
        devicePrice += customPricingSettings.surcharge;
      }
    } 
    else if (acTypeName.includes('window')) {
      devicePrice = customPricingSettings.windowTypePrice;
      if (hpValue > 1.5) {
        devicePrice += customPricingSettings.surcharge;
      }
    }
    
    return devicePrice * quantity;
  };

  const calculateSubtotal = () => {
    if (!selectedService) return 0;

    let total = 0;
    selectedDevices.forEach(device => {
      total += calculateDevicePrice(device.ac_type_id, device.horsepower_id, 1);
    });

    newDevices.forEach(device => {
      total += calculateDevicePrice(device.ac_type_id, device.horsepower_id, device.quantity);
    });
    return total;
  };

  const totalUnits = selectedDevices.length + newDevices.reduce((sum, d) => sum + d.quantity, 0);

  useEffect(() => {
    const newSubtotal = calculateSubtotal();
    const discountAmount = newSubtotal * (customPricingSettings.discount / 100);
    const newTotal = newSubtotal - discountAmount;
    setSubtotal(newSubtotal);
    dispatch(setBookingTotalAmount(newTotal));
  }, [selectedDevices, newDevices, selectedService, customPricingSettings, availableACTypes, availableHorsepowerOptions, dispatch]);

  const handleAddDevice = () => {
    dispatch(addNewDevice({
      brand_id: availableBrands[0]?.id || null,
      ac_type_id: availableACTypes[0]?.id || null,
      horsepower_id: availableHorsepowerOptions[0]?.id || null,
      quantity: 1,
      location_id: null, // Initially, no location is selected for new devices
    }));
  };

  const handleUpdateNewDevice = (index: number, field: keyof BookingDevice, value: UUID | number | null) => {
    dispatch(updateNewDeviceProperty({ index, field, value }));
  };

  const handleQuantityChange = (index: number, delta: number) => {
    const currentQuantity = newDevices[index].quantity;
    const newQuantity = Math.max(1, currentQuantity + delta);
    dispatch(updateNewDeviceProperty({ index, field: 'quantity', value: newQuantity }));
  };

  const handleOpenDialog = (deviceId: UUID | null, newDeviceIndex: number | null, currentLocationId: UUID | null) => {
    setDeviceToUpdateId(deviceId);
    setNewDeviceIndexToUpdate(newDeviceIndex);
    setTempSelectedLocationId(currentLocationId);
    setIsDialogOpen(true);
  };

  const handleSaveLocation = () => {
    if (deviceToUpdateId && tempSelectedLocationId) {
      dispatch(updateSelectedDeviceLocation({ deviceId: deviceToUpdateId, locationId: tempSelectedLocationId }));
    } else if (newDeviceIndexToUpdate !== null && tempSelectedLocationId) {
      dispatch(updateNewDeviceProperty({ index: newDeviceIndexToUpdate, field: 'location_id' as keyof BookingDevice, value: tempSelectedLocationId }));
    }
    setIsDialogOpen(false);
    setDeviceToUpdateId(null);
    setNewDeviceIndexToUpdate(null);
    setTempSelectedLocationId(null);
  };

  return (
    <div className="space-y-6 p-4">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          {selectedService ? selectedService.name : 'Book a New Service'}
        </h2>
        <p className="text-gray-600 text-lg">Add details for each aircon unit you want serviced</p>
      </div>

      {/* Existing Devices Section */}
      {devices.length > 0 && (
        <Card className="rounded-xl shadow-md p-4 mb-6">
          <CardHeader className="p-0 pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-semibold text-gray-800">My Existing Devices</CardTitle>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all-existing"
                checked={areAllExistingDevicesSelected}
                onCheckedChange={(checked) => dispatch(toggleSelectAllExistingDevices(checked as boolean))}
              />
              <Label htmlFor="select-all-existing" className="text-sm font-medium text-gray-700">Select All</Label>
            </div>
          </CardHeader>
          <CardContent className="p-0 max-h-48 overflow-y-auto space-y-2">
            {devices.map((device: Device) => {
              const acTypeName = availableACTypes.find(t => t.id === device.ac_type_id)?.name;
              const horsepowerDisplayName = availableHorsepowerOptions.find(hp => hp.id === device.horsepower_id)?.display_name;
              
              const selectedDevice = selectedDevices.find(d => d.id === device.id);
              const isSelected = !!selectedDevice;
              const currentSelectedLocationId = selectedDevice?.location_id || primaryLocation?.id || '';
              const currentSelectedLocation = locations.find(loc => loc.id === currentSelectedLocationId);
              
              const locationDisplayString = currentSelectedLocation
                ? `${currentSelectedLocation.name} - ${currentSelectedLocation.barangay}, ${currentSelectedLocation.city}`
                : 'No location selected';

              return (
                <div key={device.id} className="flex items-center space-x-3 p-2 border rounded-md bg-gray-50">
                  <Checkbox
                    id={`device-${device.id}`}
                    checked={isSelected}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        dispatch(toggleSelectedDevice({ device, locationId: currentSelectedLocationId }));
                      } else {
                        dispatch(toggleSelectedDevice({ device, locationId: currentSelectedLocationId }));
                      }
                    }}
                  />
                  <Label htmlFor={`device-${device.id}`} className="flex-1 cursor-pointer text-gray-700 font-medium">
                    {device.name}
                    {acTypeName && ` (${acTypeName}`}
                    {horsepowerDisplayName && acTypeName && ` - ${horsepowerDisplayName})`}
                    {!acTypeName && horsepowerDisplayName && ` (${horsepowerDisplayName})`}
                  </Label>

                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500 truncate">{locationDisplayString}</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleOpenDialog(device.id, null, currentSelectedLocationId)}
                      disabled={!isSelected}
                    >
                      <MapPin className="h-4 w-4 mr-1" /> Update location
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* New Units Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-start gap-2 text-gray-600 px-2">
          <h3 className="font-semibold text-lg">New Units</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-sm">
                <p>If you do not set a location, the device will be assigned to your primary location: <span className="font-semibold">{primaryLocation ? `${primaryLocation.name} - ${primaryLocation.barangay}, ${primaryLocation.city}` : 'No primary location set.'}</span></p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {newDevices.map((newDevice, index) => {
          // Use the selected location or fall back to the primary location for display
          const displayLocation = locations.find(loc => loc.id === newDevice.location_id) || primaryLocation;
          const newDeviceLocationDisplayString = displayLocation
            ? `${displayLocation.name} - ${displayLocation.barangay}, ${displayLocation.city}`
            : 'No location selected';

          return (
            <Card key={index} className="rounded-xl shadow-md p-6">
              <CardHeader className="flex flex-row items-center justify-between p-0 pb-4">
                <CardTitle className="text-xl font-semibold text-gray-800">Unit {index + 1}</CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500 truncate">{newDeviceLocationDisplayString}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(null, index, newDevice.location_id || null)}
                    >
                      <MapPin className="h-4 w-4 mr-1" /> {displayLocation ? 'Update location' : 'Add location'}
                    </Button>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => dispatch(removeNewDevice(index))}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                {/* Brand Select */}
                <div className="space-y-1">
                  <Label htmlFor={`brand-${index}`} className="text-gray-700">Brand</Label>
                  <Select
                    value={newDevice.brand_id || ''}
                    onValueChange={(value) => handleUpdateNewDevice(index, 'brand_id', value)}
                  >
                    <SelectTrigger className="w-full rounded-md">
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBrands.map(brand => (
                        <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Type Select */}
                <div className="space-y-1">
                  <Label htmlFor={`ac-type-${index}`} className="text-gray-700">Type</Label>
                  <Select
                    value={newDevice.ac_type_id || ''}
                    onValueChange={(value) => handleUpdateNewDevice(index, 'ac_type_id', value)}
                  >
                    <SelectTrigger className="w-full rounded-md">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableACTypes.map(acType => (
                        <SelectItem key={acType.id} value={acType.id}>{acType.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Horsepower Select */}
                <div className="space-y-1">
                  <Label htmlFor={`horsepower-${index}`} className="text-gray-700">Horsepower</Label>
                  <Select
                    value={newDevice.horsepower_id || ''}
                    onValueChange={(value) => handleUpdateNewDevice(index, 'horsepower_id', value)}
                  >
                    <SelectTrigger className="w-full rounded-md">
                      <SelectValue placeholder="Select HP" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableHorsepowerOptions.map(hp => (
                        <SelectItem key={hp.id} value={hp.id}>{hp.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quantity Input with +/- buttons */}
                <div className="space-y-1">
                  <Label htmlFor={`quantity-${index}`} className="text-gray-700">Quantity</Label>
                  <div className="flex items-center border rounded-md overflow-hidden">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleQuantityChange(index, -1)}
                      className="rounded-none h-10 w-10"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <input
                      type="number"
                      id={`quantity-${index}`}
                      value={newDevice.quantity}
                      onChange={(e) => handleUpdateNewDevice(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full text-center border-x-0 focus:outline-none focus:ring-0 h-10"
                      min="1"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleQuantityChange(index, 1)}
                      className="rounded-none h-10 w-10"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Another Unit Button */}
      <Button 
        onClick={handleAddDevice} 
        variant="outline" 
        className="w-full py-3 text-base font-semibold rounded-md border-dashed border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400"
      >
        <Plus className="h-5 w-5 mr-2" /> Add Another Unit
      </Button>

      {/* Pricing Summary */}
      <div className="space-y-2 text-right mt-6">
        <div className="flex justify-between font-medium text-gray-700">
          <span>Subtotal ({totalUnits} units)</span>
          <span>₱{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-green-600 font-medium">
          <span>Discount ({customPricingSettings.discount}%)</span>
          <span>-₱{(subtotal * (customPricingSettings.discount / 100)).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-2xl font-bold text-gray-800 border-t pt-3 mt-3">
          <span>Total Amount</span>
          <span>₱{(subtotal - subtotal * (customPricingSettings.discount / 100)).toFixed(2)}</span>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-center mt-8 space-y-4 sm:space-y-0">
        <Button 
          onClick={onBack} 
          variant="outline" 
          className="w-full sm:w-auto px-6 py-3 text-base rounded-full text-gray-500 border-gray-300"
        >
          <span className="mr-2">&lt;</span> Back to Services
        </Button>
        <Button 
          onClick={onNext} 
          disabled={totalUnits === 0}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-base rounded-full shadow-md transition-all duration-300 transform hover:scale-105"
        >
          Continue to Schedule <span className="ml-2">&gt;</span>
        </Button>
      </div>

      {/* Location Update Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Location</DialogTitle>
            <DialogDescription>
              Select a new location for the chosen device.
            </DialogDescription>
          </DialogHeader>
          <RadioGroup 
            onValueChange={setTempSelectedLocationId} 
            value={tempSelectedLocationId || ''}
            className="space-y-2"
          >
            {locations.map(loc => (
              <div key={loc.id} className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                <RadioGroupItem value={loc.id} id={`loc-${loc.id}`} />
                <Label htmlFor={`loc-${loc.id}`} className="font-normal cursor-pointer">
                  {`${loc.name}, ${loc.address_line1}, ${loc.barangay}, ${loc.city}`}
                </Label>
              </div>
            ))}
          </RadioGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveLocation} disabled={!tempSelectedLocationId}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}