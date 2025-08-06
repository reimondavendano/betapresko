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
  toggleSelectAllExistingDevices, // Import the new action
} from '@/lib/features/client/clientSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ACType, Brand, Device, HorsepowerOption, UUID } from '@/types/database';

interface Step2SelectDevicesProps {
  onNext: () => void;
  onBack: () => void;
}

export function Step2SelectDevices({ onNext, onBack }: Step2SelectDevicesProps) {
  const dispatch = useDispatch();
  const { devices } = useSelector((state: RootState) => state.client); // All client's devices
  const {
    selectedDevices, // Devices explicitly checked by the user
    newDevices, // Newly added devices by the user
    selectedService, // Get the selected service from Redux state
    customPricingSettings,
    availableBrands,
    availableACTypes,
    availableHorsepowerOptions,
  } = useSelector((state: RootState) => state.client.booking);
  
  const [subtotal, setSubtotal] = useState(0);

  // Determine if all existing devices are selected
  const areAllExistingDevicesSelected = devices.length > 0 && selectedDevices.length === devices.length;

  // Function to calculate the price for a single device based on its type and horsepower
  const calculateDevicePrice = (acTypeId: UUID | null, horsepowerId: UUID | null, quantity: number = 1): number => {
    if (!acTypeId || !horsepowerId) return 0; // Cannot calculate price without type and HP

    const acType = availableACTypes.find(type => type.id === acTypeId);
    const horsepower = availableHorsepowerOptions.find(hp => hp.id === horsepowerId);

    if (!acType || !horsepower) return 0;

    let devicePrice = 0;
    const acTypeName = acType.name.toLowerCase();
    const hpValue = horsepower.value;

    // Logic for Split Type and U-shaped (same pricing)
    if (acTypeName.includes('split') || acTypeName.includes('u-shaped')) {
      devicePrice = customPricingSettings.splitTypePrice;
      if (hpValue > 2) { // Above 2HP
        devicePrice += customPricingSettings.surcharge;
      }
    } 
    // Logic for Window Type
    else if (acTypeName.includes('window')) {
      devicePrice = customPricingSettings.windowTypePrice;
      if (hpValue > 1.5) { // Above 1.5HP
        devicePrice += customPricingSettings.surcharge;
      }
    }
    
    return devicePrice * quantity;
  };

  // Function to calculate the subtotal based on selected and new devices
  const calculateSubtotal = () => {
    if (!selectedService) return 0;

    let total = 0;
    // Calculate cost for selected existing devices
    selectedDevices.forEach(device => {
      total += calculateDevicePrice(device.ac_type_id, device.horsepower_id, 1); // Quantity is 1 for existing
    });

    // Calculate cost for newly added devices
    newDevices.forEach(device => {
      total += calculateDevicePrice(device.ac_type_id, device.horsepower_id, device.quantity);
    });
    return total;
  };

  // Calculate total units for display and validation
  const totalUnits = selectedDevices.length + newDevices.reduce((sum, d) => sum + d.quantity, 0);

  // Recalculate subtotal and total amount whenever relevant state changes
  useEffect(() => {
    const newSubtotal = calculateSubtotal();
    const discountAmount = newSubtotal * (customPricingSettings.discount / 100);
    const newTotal = newSubtotal - discountAmount;
    setSubtotal(newSubtotal);
    dispatch(setBookingTotalAmount(newTotal));
  }, [selectedDevices, newDevices, selectedService, customPricingSettings, availableACTypes, availableHorsepowerOptions, dispatch]);

  // Handler for adding a new device row
  const handleAddDevice = () => {
    dispatch(addNewDevice({
      brand_id: availableBrands[0]?.id || null, // Default to first available or null
      ac_type_id: availableACTypes[0]?.id || null, // Default to first available or null
      horsepower_id: availableHorsepowerOptions[0]?.id || null, // Default to first available or null
      quantity: 1,
    }));
  };

  // Handler for updating properties of a new device
  const handleUpdateNewDevice = (index: number, field: keyof BookingDevice, value: UUID | number | null) => {
    dispatch(updateNewDeviceProperty({ index, field, value }));
  };

  // Handler for changing quantity of a new device
  const handleQuantityChange = (index: number, delta: number) => {
    const currentQuantity = newDevices[index].quantity;
    const newQuantity = Math.max(1, currentQuantity + delta); // Ensure quantity is at least 1
    dispatch(updateNewDeviceProperty({ index, field: 'quantity', value: newQuantity }));
  };


  return (
    <div className="space-y-6 p-4">
      <div className="text-center mb-6">
        {/* Dynamic title based on selected service */}
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

              return (
                <div key={device.id} className="flex items-center space-x-3 p-2 border rounded-md bg-gray-50">
                  <Checkbox
                    id={`device-${device.id}`}
                    checked={selectedDevices.some(d => d.id === device.id)}
                    onCheckedChange={() => dispatch(toggleSelectedDevice(device))}
                  />
                  <Label htmlFor={`device-${device.id}`} className="flex-1 cursor-pointer text-gray-700 font-medium">
                    {device.name}
                    {acTypeName && ` (${acTypeName}`}
                    {horsepowerDisplayName && acTypeName && ` - ${horsepowerDisplayName})`}
                    {!acTypeName && horsepowerDisplayName && ` (${horsepowerDisplayName})`}
                  </Label>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* New Units Section */}
      <div className="space-y-4">
        {newDevices.map((newDevice, index) => (
          <Card key={index} className="rounded-xl shadow-md p-6">
            <CardHeader className="flex flex-row items-center justify-between p-0 pb-4">
              <CardTitle className="text-xl font-semibold text-gray-800">Unit {index + 1}</CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => dispatch(removeNewDevice(index))}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
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
        ))}
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
    </div>
  );
}
