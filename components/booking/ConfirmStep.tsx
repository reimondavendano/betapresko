'use client'

import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '@/lib/store'
import { setClientInfo, setLocationInfo, setStep, setIsExistingClient, setClientId, resetBooking } from '../../lib/features/booking/bookingSlice'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  User,
  MapPin,
  Calendar,
  Clock,
  Settings,
  Phone,
  Mail,
  ChevronLeft,
  CheckCircle,
  Loader2,
  XCircle,
  AlertCircle
} from 'lucide-react'

import { clientApi } from '../../pages/api/clients/clientApi';
import { clientLocationApi } from '../../pages/api/clientLocation/clientLocationApi';
import { appointmentApi } from '../../pages/api/appointments/appointmentApi';
import { deviceApi } from '../../pages/api/device/deviceApi';
import { appointmentDevicesApi } from '../../pages/api/appointment_devices/appointmentDevicesApi';
import { notificationApi } from '../../pages/api/notification/notificationApi';
import { Client, ClientLocation, Appointment, Device, UUID } from '../../types/database';

interface ClientExistsModalProps {
  onClose: () => void;
  onGoToDashboard: () => void;
}

const ClientExistsModal = ({ onClose, onGoToDashboard }: ClientExistsModalProps) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-sm rounded-lg shadow-lg relative">
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          <XCircle className="h-5 w-5" />
        </Button>
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-bold text-blue-600 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 mr-2" />
            Client Already Exists!
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-3">
          <p className="text-gray-800 font-medium text-lg">
            This mobile number is already registered.
          </p>
          <p className="text-gray-600 text-sm">
            Please visit the client panel page to manage your bookings.
          </p>
          <Button onClick={onGoToDashboard} className="mt-4 bg-blue-600 hover:bg-blue-700 w-full">
            Go to Client Dashboard
          </Button>
          <Button onClick={onClose} variant="outline" className="w-full">
            Close
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export function ConfirmStep() {
  const dispatch = useDispatch();
  const {
    selectedService,
    selectedDevices,
    appointmentDate,
    totalAmount,
    clientInfo,
    locationInfo,
    availableBrands,
    availableACTypes,
    availableHorsepowerOptions,
  } = useSelector((state: RootState) => state.booking);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [clientDashboardUrl, setClientDashboardUrl] = useState('');
  const [showClientExistsModal, setShowClientExistsModal] = useState(false);
  const [existingClientId, setExistingClientId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Local validation state for mobile/email
  const [mobileDigits, setMobileDigits] = useState<string>(''); // 10-digit, no prefix
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const getServiceName = () => selectedService?.name || '';
  const getBrandName = (id: string | null) => {
    const brand = availableBrands.find(brand => brand.id === id);
    return brand ? brand.name : '';
  };
  const getACTypeName = (id: string | null) => {
    const acType = availableACTypes.find(type => type.id === id);
    return acType ? acType.name : '';
  };
  const getHorsepowerName = (id: string | null) => {
    const horsepower = availableHorsepowerOptions.find(hp => hp.id === id);
    return horsepower ? horsepower.display_name : '';
  };

  const handleClientInfoChange = (field: string, value: string) => {
    if (field === 'mobile') {
      // Keep Redux untouched for mobile; manage locally with digits only
      const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
      setMobileDigits(digitsOnly);
      if (digitsOnly.length !== 10) {
        setMobileError('Mobile number must be 10 digits.');
      } else {
        setMobileError(null);
      }
      return;
    }
    if (field === 'email') {
      dispatch(setClientInfo({ ...clientInfo, email: value }));
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
      if (value && !emailRegex.test(value)) {
        setEmailError('Enter a valid email address.');
      } else {
        setEmailError(null);
      }
      return;
    }
    dispatch(setClientInfo({ ...clientInfo, [field]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Build mobile number for DB: 0 + 10 digits
      const finalMobile = mobileDigits.length === 10 ? `0${mobileDigits}` : '';
      const existingClient = await clientApi.getClientByMobile(finalMobile);

      let currentClientId: UUID;
      let currentLocationId: UUID;

      if (existingClient) {
        setExistingClientId(existingClient.id);
        setShowClientExistsModal(true);
        setIsSubmitting(false);
        return;
      } else {
        // Get referral ID from session storage
        const referralId = sessionStorage.getItem('referralId');

        const newClientData = {
          name: clientInfo.name,
          mobile: finalMobile,
          email: clientInfo.email || null,
          sms_opt_in: true,
          ref_id: referralId || null, 
        };
        const createdClient: Client = await clientApi.createClient(newClientData);
        currentClientId = createdClient.id;
        dispatch(setClientId(currentClientId));


        // Create client location for the new client
        const newLocationData = {
          client_id: currentClientId,
          name: locationInfo.name || 'My Home',
          is_primary: true,
          address_line1: locationInfo.address_line1,
          street: locationInfo.street,
          landmark: locationInfo.landmark || null,
          city_id: locationInfo.city_id,
          barangay_id: locationInfo.barangay_id // Use the selected barangay ID from Redux state
        };
        const createdLocation: ClientLocation = await clientLocationApi.createClientLocation(newLocationData);
        currentLocationId = createdLocation.id;
      }

      if (!selectedService || !appointmentDate || !currentClientId || !currentLocationId) {
        throw new Error("Missing data for appointment creation.");
      }

      const newAppointmentData = {
        client_id: currentClientId,
        location_id: currentLocationId,
        service_id: selectedService.id,
        appointment_date: appointmentDate,
        appointment_time: null,
        amount: totalAmount,
        total_units: selectedDevices.reduce((sum, device) => sum + device.quantity, 0),
        notes: null,
        status: 'confirmed',
      };
      const createdAppointment: Appointment = await appointmentApi.createAppointment(newAppointmentData);

      const createdDeviceIds: UUID[] = [];
      for (const device of selectedDevices) {
        const brandName = getBrandName(device.brand_id);
        for (let i = 0; i < device.quantity; i++) {
          const deviceName = `${brandName}-${i + 1}`;
          const lastCleaningDate = createdAppointment.status === 'completed' ? appointmentDate : '';
          const newDeviceData = {
            client_id: currentClientId,
            location_id: currentLocationId,
            name: deviceName,
            brand_id: device.brand_id,
            ac_type_id: device.ac_type_id,
            horsepower_id: device.horsepower_id,
            last_cleaning_date: lastCleaningDate,
          };
          const createdDevice = await deviceApi.createDevice(newDeviceData as any);
          createdDeviceIds.push(createdDevice.id);
        }
      }

      // Create appointment_devices entries for all created devices
      const appointmentDeviceRows = createdDeviceIds.map((deviceId) => ({
        appointment_id: createdAppointment.id,
        device_id: deviceId,
      }));
      await appointmentDevicesApi.createMany(appointmentDeviceRows as any);

      // Create notification entry
      try {
        // Check if client has referral (ref_id is not null)
        // For new clients, check clientInfo.ref_id, for existing clients, we'll need to fetch their data
        let isReferral = false;
        
       // Check if a referralId exists in sessionStorage
        const referralId = sessionStorage.getItem('referralId');
        if (referralId && referralId.trim() !== '') {
          isReferral = true;
        }
        
        const notificationData = {
          client_id: currentClientId,
          send_to_admin: true,
          send_to_client: false,
          is_referral: isReferral,
          date: appointmentDate,
        };
        
        await notificationApi.createNotification(notificationData);
        

        // If a referral ID was used, remove it from session storage
        if (referralId) {
          sessionStorage.removeItem('referralId');
          
        }
      } catch (notificationError) {
        // Don't fail the entire booking if notification creation fails
      }

      const dashboardUrl = `/client/${currentClientId}`;
      setClientDashboardUrl(dashboardUrl);

      setIsSubmitting(false);
      setIsCompleted(true);
    } catch (err: any) {
      setError(`Booking failed: ${err.message || 'An unexpected error occurred.'}`);
      setIsSubmitting(false);
    }
  };

  const handleGoToExistingClientDashboard = () => {
    if (existingClientId) {
      window.open(`/client/${existingClientId}`, '_blank');
      setShowClientExistsModal(false);
      dispatch(resetBooking());
      dispatch(setStep(1));
    }
  };

  const handleBack = () => {
    dispatch(setStep(4));
  };

  const isFormValid =
    clientInfo.name.trim() !== '' &&
    mobileDigits.length === 10;

  if (isCompleted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 font-inter">
        <Card className="border-green-200 bg-green-50 rounded-xl">
          <CardContent className="pt-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-900 mb-4">Booking Confirmed!</h2>
            <p className="text-green-800 mb-6">
              Your aircon service appointment has been successfully booked.
              You will receive an SMS confirmation shortly.
            </p>
            <div className="space-y-4">
              <Button
                onClick={() => window.open(clientDashboardUrl)}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Go to Your Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 font-inter">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Confirm Your Booking</h2>
        <p className="text-gray-600">Review your details and complete your booking</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Booking Summary */}
        <div className="space-y-6">
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle>Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center">
                <Settings className="w-5 h-5 text-green-600 mr-3" />
                <div>
                  <p className="font-medium">Service</p>
                  <p className="text-sm text-gray-600">{getServiceName()}</p>
                </div>
              </div>

              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-purple-600 mr-3" />
                <div>
                  <p className="font-medium">Date</p>
                  <p className="text-sm text-gray-600">{appointmentDate || 'N/A'}</p>
                </div>
              </div>

              <div>
                <p className="font-medium mb-2">AC Units ({selectedDevices.length})</p>
                <div className="space-y-2">
                  {selectedDevices.length > 0 ? (
                    selectedDevices.map((device, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm">
                          {getBrandName(device.brand_id)} {getACTypeName(device.ac_type_id)} - {getHorsepowerName(device.horsepower_id)}
                          {device.quantity > 1 && ` (x${device.quantity})`}
                        </p>
                        <p className="text-xs text-gray-600">Quantity: {device.quantity}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-600">No units selected.</p>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total Amount:</span>
                  <span className="text-blue-600">₱{totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Combined Client Information and Service Address Form */}
        <div className="space-y-6">
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Client & Service Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={clientInfo.name}
                      onChange={(e) => handleClientInfoChange('name', e.target.value)}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="mobile">Mobile Number *</Label>
                    <div className="flex">
                      <Input
                        className="w-20 mr-2 cursor-not-allowed bg-gray-100"
                        value={'+63'}
                        disabled
                      />
                      <Input
                        id="mobile"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={mobileDigits}
                        onChange={(e) => handleClientInfoChange('mobile', e.target.value)}
                        placeholder="9123456789"
                        required
                      />
                    </div>
                    {mobileError && <p className="text-xs text-red-600 mt-1">{mobileError}</p>}
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={clientInfo.email}
                    onChange={(e) => handleClientInfoChange('email', e.target.value)}
                    placeholder="you@example.com"
                  />
                  {emailError && <p className="text-xs text-red-600 mt-1">{emailError}</p>}
                </div>
              </div>

              <div className="border-t pt-4 mt-4 space-y-4">
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                  <h4 className="font-medium text-lg">Service Address</h4>
                </div>
                <div>
                  <Label htmlFor="locationName">Location Name (e.g., Home, Office)</Label>
                  <Input
                    id="locationName"
                    value={locationInfo.name}
                    readOnly
                    disabled
                    className="cursor-not-allowed bg-gray-100"
                  />
                </div>
                <div>
                  <Label htmlFor="addressLine1">Address Line 1 *</Label>
                  <Input
                    id="addressLine1"
                    value={locationInfo.address_line1 || ''}
                    readOnly
                    disabled
                    className="cursor-not-allowed bg-gray-100"
                  />
                </div>
                <div>
                  <Label htmlFor="street">Street *</Label>
                  <Input
                    id="street"
                    value={locationInfo.street || ''}
                    readOnly
                    disabled
                    className="cursor-not-allowed bg-gray-100"
                  />
                </div>
                {/* Read-only City and Barangay fields */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="barangay">Barangay</Label>
                    <Input
                      id="barangay"
                      value={locationInfo.barangay_name || ''}
                      readOnly
                      disabled
                      placeholder="Barangay"
                      className="cursor-not-allowed bg-gray-100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={locationInfo.city_name || ''}
                      readOnly
                      disabled
                      placeholder="City"
                      className="cursor-not-allowed bg-gray-100"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="landmark">Landmark</Label>
                  <Textarea
                    id="landmark"
                    value={locationInfo.landmark || ''}
                    readOnly
                    disabled
                    className="cursor-not-allowed bg-gray-100"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <Button
          onClick={handleBack}
          variant="outline"
          className="px-6 py-3"
          disabled={isSubmitting}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Schedule
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={!isFormValid || isSubmitting}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin h-4 w-4 mr-2" />
              Processing...
            </>
          ) : (
            'Confirm Booking'
          )}
        </Button>
      </div>

      {showClientExistsModal && (
        <ClientExistsModal
          onClose={() => setShowClientExistsModal(false)}
          onGoToDashboard={handleGoToExistingClientDashboard}
        />
      )}
    </div>
  );
}
