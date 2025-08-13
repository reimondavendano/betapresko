// components/client/Step3ConfirmBooking.tsx
'use client';

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import { setBookingAppointmentDate } from '@/lib/features/client/clientSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar'; // Assumes you have a calendar component
import { format, parseISO, startOfDay, isBefore } from 'date-fns'; // Import parseISO, startOfDay, and isBefore
import { blockedDatesApi } from '../../../pages/api/dates/blockedDatesApi'; // Import the blockedDatesApi
import { BlockedDate } from '@/types/database'; // Import BlockedDate type
import { XCircle, Info } from 'lucide-react'; // Import icons for the modal
import {
  toggleSelectedDevice,
  addNewDevice,
  removeNewDevice,
  setBookingTotalAmount,
  BookingDevice,
  updateNewDeviceProperty,
  toggleSelectAllExistingDevices,
} from '@/lib/features/client/clientSlice';
import { UUID } from '@/types/database';


interface Step3ConfirmBookingProps {
  onBack: () => void;
  onSubmit: () => void;
}

// Function to calculate the price for a single device based on its type and horsepower
const calculateDevicePrice = (acTypeId: UUID | null, horsepowerId: UUID | null, quantity: number = 1, availableACTypes: any[], availableHorsepowerOptions: any[], customPricingSettings: any): number => {
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

export function Step3ConfirmBooking({ onBack, onSubmit }: Step3ConfirmBookingProps) {
  const dispatch = useDispatch();
  const { appointmentDate, totalAmount, availableBlockedDates, selectedService, selectedDevices, newDevices, customPricingSettings, availableACTypes, availableHorsepowerOptions, availableBrands } = useSelector((state: RootState) => state.client.booking);
  const { devices: allDevices, currentClient } = useSelector((state: RootState) => state.client);
  
  // State for managing the blocked date modal
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [modalBlockedInfo, setModalBlockedInfo] = useState<BlockedDate | null>(null);

  const calculateSubtotal = () => {
    if (!selectedService) return 0;

    let total = 0;
    // Calculate cost for selected existing devices
    selectedDevices.forEach(device => {
      total += calculateDevicePrice(device.ac_type_id, device.horsepower_id, 1, availableACTypes, availableHorsepowerOptions, customPricingSettings);
    });

    // Calculate cost for newly added devices
    newDevices.forEach(device => {
      total += calculateDevicePrice(device.ac_type_id, device.horsepower_id, device.quantity, availableACTypes, availableHorsepowerOptions, customPricingSettings);
    });
    return total;
  };
  
  // Calculate discount based on client's discounted status
  const calculateDiscount = () => {
    if (!currentClient) return { value: 0, type: 'None' };

    const discountValue = customPricingSettings.discount || 0;
    const familyDiscountValue = customPricingSettings.familyDiscount || 0;

    if (currentClient.discounted) {
      // Client has discount enabled - compare discount and family_discount, choose bigger value
      if (familyDiscountValue > discountValue) {
        return { 
          value: familyDiscountValue, 
          type: 'Family/Friends'
        };
      } else {
        return { 
          value: discountValue, 
          type: 'Standard'
        };
      }
    } else {
      // Client has discount disabled - apply standard discount if available
      if (discountValue > 0) {
        return { 
          value: discountValue, 
          type: 'Standard'
        };
      } else {
        return { value: 0, type: 'None' };
      }
    }
  };

  const subtotal = calculateSubtotal();
  const discount = calculateDiscount();
  const discountAmount = subtotal * (discount.value / 100);
  const totalUnits = selectedDevices.length + newDevices.reduce((sum, d) => sum + d.quantity, 0);

  // Function to determine if a date is disabled in the calendar (for visual indication, not click prevention)
  // We are enabling all dates for selection, but will show a modal if a blocked date is clicked.
  const isDayVisuallyBlocked = (date: Date): boolean => {
    const dateString = format(date, 'yyyy-MM-dd');
    const blockedInfo = blockedDatesApi.isDateBlocked(dateString, availableBlockedDates);
    return !!blockedInfo; // Return true if blockedInfo is not null, for visual styling only
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const today = startOfDay(new Date()); // Get the start of today
      const selectedDay = startOfDay(date); // Get the start of the selected day

      if (isBefore(selectedDay, today)) {
        // If the selected date is in the past, show an alert or handle as an error
        setModalBlockedInfo({
          id: 'past-date', // Dummy ID
          from_date: format(selectedDay, 'yyyy-MM-dd'),
          to_date: format(selectedDay, 'yyyy-MM-dd'),
          reason: 'You cannot select a past date.',
          created_at: new Date().toISOString(),
          name: ''
        });
        setShowBlockedModal(true);
        dispatch(setBookingAppointmentDate(null)); // Ensure no past date is set in state
        return; // Stop further processing
      }

      const dateString = format(date, 'yyyy-MM-dd');
      const blockedInfo = blockedDatesApi.isDateBlocked(dateString, availableBlockedDates);

      if (blockedInfo) {
        // If the date is blocked, show the modal with the reason
        setModalBlockedInfo(blockedInfo);
        setShowBlockedModal(true);
        dispatch(setBookingAppointmentDate(null)); // Ensure no blocked date is set in state
      } else {
        // If the date is not blocked, set it and clear any previous modal info
        dispatch(setBookingAppointmentDate(dateString));
        setModalBlockedInfo(null);
        setShowBlockedModal(false);
      }
    } else {
      dispatch(setBookingAppointmentDate(null));
      setModalBlockedInfo(null);
      setShowBlockedModal(false);
    }
  };

  const closeModal = () => {
    setShowBlockedModal(false);
    setModalBlockedInfo(null);
  };
  const getDeviceDetails = (device: any) => {
    // Check if it's an existing device
    const existingDevice = allDevices.find(d => d.id === device.id);
    if (existingDevice) {
      const brand = availableBrands.find(b => b.id === existingDevice.brand_id)?.name;
      const acType = availableACTypes.find(t => t.id === existingDevice.ac_type_id)?.name;
      const horsepower = availableHorsepowerOptions.find(hp => hp.id === existingDevice.horsepower_id)?.display_name;
      return { name: existingDevice.name, brand, acType, horsepower, quantity: 1 };
    }
    // It's a new device
    const brand = availableBrands.find(b => b.id === device.brand_id)?.name;
    const acType = availableACTypes.find(t => t.id === device.ac_type_id)?.name;
    const horsepower = availableHorsepowerOptions.find(hp => hp.id === device.horsepower_id)?.display_name;
    const name = brand ? `${brand} ${acType}` : 'New Unit';
    const quantity = device.quantity || 1;
    return { name, brand, acType, horsepower, quantity };
  };

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">
      <h3 className="text-xl font-semibold text-center">Step 3: Select Date & Confirm</h3>

      {/* Responsive layout container for summary and calendar */}
      <div className="flex flex-col lg:flex-row-reverse justify-between space-y-6 lg:space-y-0 lg:space-x-6">
        
        {/* Calendar Card */}
        <Card className="w-full lg:w-1/2">
          <CardContent className="p-4 space-y-4">
            <div className="flex justify-center max-w-full overflow-hidden">
              <Calendar
                mode="single"
                selected={appointmentDate ? parseISO(appointmentDate) : undefined}
                onSelect={handleDateSelect}
                disabled={(date) => isBefore(startOfDay(date), startOfDay(new Date()))} // Disable dates before today
                initialFocus
                className="rounded-md border shadow"
              />
            </div>
            {appointmentDate && modalBlockedInfo === null && (
              <p className="text-center font-semibold text-gray-700">
                Selected Date: {format(parseISO(appointmentDate), 'PPP')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Booking Summary Card */}
        <Card className="w-full lg:w-1/2">
          <CardContent className="p-4 space-y-4">
            <h4 className="text-lg font-bold text-gray-800 border-b pb-2">Booking Summary</h4>
            
            {selectedService && (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-600">Service:</p>
                <p className="font-bold text-lg text-blue-600">{selectedService.name}</p>
              </div>
            )}

            {selectedDevices.length > 0 || newDevices.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-600">Units ({totalUnits}):</p>
                <ul className="space-y-1 text-sm text-gray-700">
                  {selectedDevices.map((device, index) => {
                    const details = getDeviceDetails(device);
                    return (
                      <li key={device.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                        <span>{details.name} ({details.horsepower})</span>
                        <span>1 unit</span>
                      </li>
                    );
                  })}
                  {newDevices.map((device, index) => {
                    const details = getDeviceDetails(device);
                    return (
                      <li key={`new-${index}`} className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                        <span>{details.name} ({details.horsepower})</span>
                        <span>{details.quantity} unit(s)</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No units selected.</p>
            )}

            <div className="space-y-2 text-right pt-2 border-t mt-4">
              <div className="flex justify-between font-medium text-gray-700">
                <span>Subtotal ({totalUnits} units)</span>
                <span>₱{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-green-600 font-medium">
                <span>Discount ({discount.value}% - {discount.type})</span>
                <span>-₱{discountAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-2xl font-bold text-gray-800 border-t pt-3 mt-3">
                <span>Total Amount</span>
                <span>₱{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Responsive button container */}
      <div className="flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0 sm:space-x-2 max-w-lg mx-auto">
        <Button onClick={onBack} variant="outline" className="w-full sm:w-1/2">Back</Button>
        <Button 
          onClick={onSubmit} 
          disabled={!appointmentDate || showBlockedModal} // Disable if no date selected or modal is open (meaning a blocked date was clicked)
          className="w-full sm:w-1/2 bg-blue-600 hover:bg-blue-700"
        >
          Confirm Booking
        </Button>
      </div>

      {/* Blocked Date Modal */}
      {showBlockedModal && modalBlockedInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full text-center space-y-4">
            <div className="flex justify-end">
              <Button variant="ghost" size="icon" onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <XCircle className="h-6 w-6" />
              </Button>
            </div>
            <div className="flex flex-col items-center">
              <Info className="h-12 w-12 text-red-500 mb-3" />
              <h4 className="text-2xl font-bold text-red-600 mb-2">Date Unavailable</h4>
              {/* Display "Date Unavailable" for past dates as well */}
              {modalBlockedInfo.reason === 'You cannot select a past date.' ? (
                <p className="text-gray-700">
                  {modalBlockedInfo.reason}
                </p>
              ) : (
                <>
                  {modalBlockedInfo.from_date && (
                    <p className="text-gray-700">
                      From: {format(parseISO(modalBlockedInfo.from_date), 'MMM dd, yyyy')}
                    </p>
                  )}
                  {modalBlockedInfo.to_date && (
                    <p className="text-gray-700">
                      To: {format(parseISO(modalBlockedInfo.to_date), 'MMM dd, yyyy')}
                    </p>
                  )}
                  {modalBlockedInfo.reason && (
                    <p className="text-gray-700 mt-2">
                      Reason: {modalBlockedInfo.reason}
                    </p>
                  )}
                </>
              )}
            </div>
            <Button 
              onClick={closeModal} 
              className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-3 text-lg rounded-full shadow-md"
            >
              Got It
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}