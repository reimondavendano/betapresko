'use client'

import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '@/lib/store' // Use type-only import for RootState
import { setClientInfo, setLocationInfo, setStep, setIsExistingClient, setClientId, resetBooking } from '../../lib/features/booking/bookingSlice' // Added resetBooking
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
  Mail, // Added Mail icon for email input
  ChevronLeft,
  CheckCircle,
  Loader2, // Import Loader2 for processing state
  XCircle, // Import XCircle for modal close button
  AlertCircle // Import AlertCircle for modal icon
} from 'lucide-react'

// Import new API functions
import { clientApi } from '../../pages/api/clients/clientApi';
import { clientLocationApi } from '../../pages/api/clientLocation/clientLocationApi';
import { appointmentApi } from '../../pages/api/appointments/appointmentApi'; // New import
import { deviceApi } from '../../pages/api/device/deviceApi'; // New import
import { Client, ClientLocation, Appointment, Device, UUID } from '../../types/database'; // Import new types

// Modal Component for Client Exists
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
            <AlertCircle className="w-6 h-6 mr-2" /> {/* Added AlertCircle icon */}
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
    selectedCity, 
    selectedBarangay, 
    selectedService, 
    selectedDevices, 
    appointmentDate, 
    totalAmount,
    clientInfo, // Contains name, mobile, email
    locationInfo, // Contains name, address_line1, street, landmark
    isExistingClient, // State from Redux, though we'll re-check
    // Access the globally available lookup data from Redux
    availableBrands,
    availableACTypes,
    availableHorsepowerOptions,
  } = useSelector((state: RootState) => state.booking);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [clientDashboardUrl, setClientDashboardUrl] = useState('');
  const [showClientExistsModal, setShowClientExistsModal] = useState(false);
  const [existingClientId, setExistingClientId] = useState<string | null>(null);


  // Helper functions to get names from IDs using Redux state lookup data
  const getServiceName = () => selectedService?.name || ''; 
  const getBrandName = (id: string) => availableBrands.find(brand => brand.id === id)?.name || '';
  const getACTypeName = (id: string) => availableACTypes.find(type => type.id === id)?.name || '';
  const getHorsepowerName = (id: string) => availableHorsepowerOptions.find(hp => hp.id === id)?.display_name || '';

  const handleClientInfoChange = (field: string, value: string) => {
    dispatch(setClientInfo({ [field]: value }));
  };

  const handleLocationInfoChange = (field: string, value: string) => {
    dispatch(setLocationInfo({ [field]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null); // Clear previous errors

    try {
      // 1. Check if client exists by mobile number
      const existingClient = await clientApi.getClientByMobile(clientInfo.mobile);

      let currentClientId: UUID;
      let currentLocationId: UUID;

      if (existingClient) {
        // Client exists, show modal and prepare redirect
        setExistingClientId(existingClient.id);
        setShowClientExistsModal(true);
        setIsSubmitting(false); // Stop submitting state
        return; // Stop the function here
      } else {
        // 2. If client does NOT exist, create new client
        const newClientData = {
          name: clientInfo.name,
          mobile: clientInfo.mobile,
          email: clientInfo.email || null, // Allow null if email is empty
          sms_opt_in: true, // Default to true as per DB schema
        };
        const createdClient: Client = await clientApi.createClient(newClientData);
        currentClientId = createdClient.id;
        dispatch(setClientId(currentClientId)); // Store new client ID in Redux

        // 3. Create client location for the new client
        if (!selectedCity || !selectedBarangay) {
          throw new Error("City or Barangay not selected. Cannot create location.");
        }

        const newLocationData = {
          client_id: currentClientId,
          name: locationInfo.name || 'My Home', // Use default if not provided
          address_line1: locationInfo.address_line1,
          street: locationInfo.street,
          barangay_id: selectedBarangay.id,
          city_id: selectedCity.id,
          landmark: locationInfo.landmark || null, // Allow null if empty
        };
        const createdLocation: ClientLocation = await clientLocationApi.createClientLocation(newLocationData);
        currentLocationId = createdLocation.id;
      }

      // 4. Create Appointment
      if (!selectedService || !appointmentDate || !currentClientId || !currentLocationId) {
        throw new Error("Missing data for appointment creation.");
      }

      const newAppointmentData = {
        client_id: currentClientId,
        location_id: currentLocationId,
        service_id: selectedService.id, // Use selectedService.id
        appointment_date: appointmentDate,
        appointment_time: null, // Assuming no time selection for now, or add it if needed
        amount: totalAmount,
        total_units: selectedDevices.reduce((sum, device) => sum + device.quantity, 0),
        notes: null, // Add notes if you have a field for it
      };
      const createdAppointment: Appointment = await appointmentApi.createAppointment(newAppointmentData);

      // 5. Create Devices associated with the new appointment
      for (const device of selectedDevices) {
        const brandName = getBrandName(device.brand_id); // Get brand name for device naming
        for (let i = 0; i < device.quantity; i++) {
          const deviceName = `${brandName}-${i + 1}`; // e.g., "Samsung-1", "Samsung-2"
          const newDeviceData = {
            client_id: currentClientId,
            location_id: currentLocationId,
            appointment_id: createdAppointment.id, // Link to the new appointment
            name: deviceName, // Assign the unique name
            brand_id: device.brand_id,
            ac_type_id: device.ac_type_id,
            horsepower_id: device.horsepower_id,
            last_cleaning_date: appointmentDate, // Set last_cleaning_date to the appointment date
          };
          await deviceApi.createDevice(newDeviceData);
        }
      }

      // Generate client dashboard URL for the newly created client
      const dashboardUrl = `/client/${currentClientId}`; // Your actual client dashboard route
      setClientDashboardUrl(dashboardUrl);
      
      setIsSubmitting(false);
      setIsCompleted(true); // Transition to completion screen

    } catch (err: any) {
      console.error('Booking submission error:', err);
      // You might want a more user-friendly error display here
      setError(`Booking failed: ${err.message || 'An unexpected error occurred.'}`);
      setIsSubmitting(false);
    }
  };

  const handleGoToExistingClientDashboard = () => {
    if (existingClientId) {
      window.open(`/client/${existingClientId}`, '_blank'); // Open in new tab
      setShowClientExistsModal(false); // Close modal
      dispatch(resetBooking()); // Reset booking state
      dispatch(setStep(1)); // Go back to first step of booking
    }
  };

  const handleBack = () => {
    dispatch(setStep(4)); // Go back to the Schedule Step
  };

  // State for error messages
  const [error, setError] = useState<string | null>(null);

  // Form validation for button disable
  const isFormValid = 
    clientInfo.name.trim() !== '' &&
    clientInfo.mobile.trim() !== '' &&
    locationInfo.address_line1.trim() !== '' &&
    locationInfo.street.trim() !== '' &&
    selectedCity !== null &&
    selectedBarangay !== null;


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
              {/* <Button 
                onClick={() => {
                  dispatch(resetBooking()); // Reset booking state
                  dispatch(setStep(1)); // Go back to the first step
                }} 
                variant="outline" 
                className="w-full"
              >
                Book Another Service
              </Button> */}
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
                <MapPin className="w-5 h-5 text-blue-600 mr-3" />
                <div>
                  <p className="font-medium">Location</p>
                  <p className="text-sm text-gray-600">
                    {selectedBarangay?.name || 'N/A'}, {selectedCity?.name || 'N/A'}
                  </p>
                </div>
              </div>

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
                          {device.quantity > 1 && ` (x${device.quantity})`} {/* Display quantity here */}
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

        {/* Client Information Form */}
        <div className="space-y-6">
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Your Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <Input
                  id="mobile"
                  value={clientInfo.mobile}
                  onChange={(e) => handleClientInfoChange('mobile', e.target.value)}
                  placeholder="+63 912 345 6789"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email" // Set type to email for better mobile keyboard
                  value={clientInfo.email}
                  onChange={(e) => handleClientInfoChange('email', e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Service Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="locationName">Location Name</Label>
                <Input
                  id="locationName"
                  value={locationInfo.name}
                  onChange={(e) => handleLocationInfoChange('name', e.target.value)}
                  placeholder="e.g., My House, Office"
                />
              </div>

              <div>
                <Label htmlFor="addressLine1">Address Line 1 *</Label>
                <Input
                  id="addressLine1"
                  value={locationInfo.address_line1}
                  onChange={(e) => handleLocationInfoChange('address_line1', e.target.value)}
                  placeholder="Block C Lot 3"
                  required
                />
              </div>

              <div>
                <Label htmlFor="street">Street *</Label>
                <Input
                  id="street"
                  value={locationInfo.street}
                  onChange={(e) => handleLocationInfoChange('street', e.target.value)}
                  placeholder="24 De Agosto"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>City *</Label>
                  {/* Directly display city name from Redux state object */}
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedCity?.name || 'N/A'}
                  </p>
                </div>
                <div>
                  <Label>Barangay *</Label>
                  {/* Directly display barangay name from Redux state object */}
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedBarangay?.name || 'N/A'}
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="landmark">Landmark</Label>
                <Input
                  id="landmark"
                  value={locationInfo.landmark}
                  onChange={(e) => handleLocationInfoChange('landmark', e.target.value)}
                  placeholder="Beside Alfamart"
                />
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
          disabled={!isFormValid || isSubmitting} // Use isFormValid for disabling
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

      {/* Client Exists Modal */}
      {showClientExistsModal && (
        <ClientExistsModal 
          onClose={() => setShowClientExistsModal(false)}
          onGoToDashboard={handleGoToExistingClientDashboard}
        />
      )}
    </div>
  );
}
