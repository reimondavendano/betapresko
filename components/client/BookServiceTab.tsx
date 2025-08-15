'use client';

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import {
  setAvailableServices,
  setBookingResources,
  resetClientBooking,
  setCurrentClient,
  setLocations,
} from '@/lib/features/client/clientSlice';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarPlus, CheckCircle } from 'lucide-react';
import { Step1SelectService } from './../../components/client/steps/Step1SelectService';
import { Step2SelectDevices } from './../../components/client/steps/Step2SelectDevice';
import { Step3ConfirmBooking } from './../../components/client/steps/Step3ConfirmBooking';

import { clientApi } from '../../pages/api/clients/clientApi';
import { clientLocationApi } from '../../pages/api/clientLocation/clientLocationApi';
import { servicesApi } from '../../pages/api/service/servicesApi';
import { brandsApi } from '../../pages/api/brands/brandsApi';
import { acTypesApi } from '../../pages/api/types/acTypesApi';
import { horsepowerApi } from '../../pages/api/horsepower/horsepowerApi';
import { blockedDatesApi } from '../../pages/api/dates/blockedDatesApi';
import { clientPanelBooking } from '../../pages/api/clientPanelBooking/clientPanelBooking';
import { customSettingsApi } from '../../pages/api/custom_settings/customSettingsApi';
import { notificationApi } from '../../pages/api/notification/notificationApi';

interface BookServiceTabProps {
  clientId: string;
}

export function BookServiceTab({ clientId }: BookServiceTabProps) {
  const dispatch = useDispatch();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // New state to trigger a refresh


  const clientBookingState = useSelector((state: RootState) => state.client.booking);
  const currentClient = useSelector((state: RootState) => state.client.currentClient);
  const clientLocations = useSelector((state: RootState) => state.client.locations);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [
          client,
          fetchedLocations,
          services,
          brands,
          acTypes,
          horsepowers,
          blockedDates,
          customSettings,
        ] = await Promise.all([
          clientApi.getClientById(clientId), // Corrected API method
          clientLocationApi.getByClientId(clientId),
          servicesApi.getServices(),
          brandsApi.getBrands(),
          acTypesApi.getACTypes(),
          horsepowerApi.getHorsepowerOptions(),
          blockedDatesApi.getBlockedDates(),
          customSettingsApi.getCustomSettings(),
        ]);

        if (client) {
          dispatch(setCurrentClient(client));
        }
        dispatch(setLocations(fetchedLocations)); // Corrected action

        dispatch(setAvailableServices(services));
        dispatch(
          setBookingResources({
            brands,
            acTypes,
            horsepowers,
            blockedDates,
            customSettings,
          })
        );
      } catch (err: any) {
        setError(err.message || 'Failed to load booking resources.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();

    return () => {
      dispatch(resetClientBooking());
    };
  }, [dispatch, clientId, refreshKey]);

  const handleBookingSubmit = async () => {
    if (!currentClient || !currentClient.id) {
      setError('Client information is not available. Please try refreshing the page.');
      return;
    }
    if (!clientBookingState.selectedService) {
      setError('Please select a service.');
      return;
    }
    if (!clientBookingState.appointmentDate) {
      setError('Please select an appointment date.');
      return;
    }
    if (clientBookingState.newDevices.length === 0) {
      setError('Please add at least one new unit.');
      return;
    }
    
    const primaryLocationId = clientLocations.find(loc => loc.is_primary)?.id || null;

    const newDevicesWithLocation = clientBookingState.newDevices.map(nd => {
        const brandName = clientBookingState.availableBrands.find(b => b.id === nd.brand_id)?.name;
        const acTypeName = clientBookingState.availableACTypes.find(t => t.id === nd.ac_type_id)?.name;
        
        // Construct a name, defaulting to 'New AC Unit' if a brand cannot be found
        const deviceName = brandName && acTypeName ? `${brandName} ${acTypeName}` : 'New AC Unit';

        return {
            ...nd,
            name: deviceName,
            location_id: nd.location_id || primaryLocationId,
        };
    });
    
    const payload = {
      clientId: currentClient.id,
      primaryLocationId: primaryLocationId, // Pass primaryLocationId separately
      serviceId: clientBookingState.selectedService.id,
      appointmentDate: clientBookingState.appointmentDate,
      appointmentTime: '09:00 AM',
      totalAmount: clientBookingState.totalAmount,
      totalUnits: clientBookingState.newDevices.reduce((sum, d) => sum + d.quantity, 0),
      notes: null,
      selectedDevices: [], // No existing devices - only new devices
      newDevices: newDevicesWithLocation, // Pass the new units with default location
    };

    try {
  
      // For new clients, check clientInfo.ref_id, for existing clients, we'll need to fetch their data
      let isReferral = false;
      
     // Check if a referralId exists in sessionStorage
      const referralId = sessionStorage.getItem('referralId');
      if (referralId && referralId.trim() !== '') {
        isReferral = true;
      }
      
      const notificationData = {
        client_id: currentClient.id,
        send_to_admin: true,
        send_to_client: false,
        is_referral: isReferral,
        date: clientBookingState.appointmentDate,
      };
      
      await notificationApi.createNotification(notificationData);
      

      } catch (notificationError) {
      // Don't fail the entire booking if notification creation fails
    }

    setIsLoading(true);
    setError(null);
    try {
      await clientPanelBooking.createClientBooking(payload);
      setIsModalOpen(true);
    } catch (err: any) {
      setError(err.message || 'Booking failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setStep(1);
    dispatch(resetClientBooking());
    setRefreshKey(prevKey => prevKey + 1);
  };

  const renderStep = () => {
    if (isLoading) {
      return <div className="text-center text-gray-600">Loading booking resources...</div>;
    }
    if (error) {
      return <div className="text-center text-red-600">Error: {error}</div>;
    }

    switch (step) {
      case 1:
        return <Step1SelectService onNext={() => setStep(2)} />;
      case 2:
        return <Step2SelectDevices onNext={() => setStep(3)} onBack={() => setStep(1)} />;
      case 3:
        return <Step3ConfirmBooking onBack={() => setStep(2)} onSubmit={handleBookingSubmit} />;
      default:
        return null;
    }
  };

  return (
    <Card className="rounded-xl shadow-lg p-6 bg-white min-h-[400px]">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-blue-600 flex items-center justify-center">
          <CalendarPlus className="w-8 h-8 mr-3" />
          Book a New Service
        </CardTitle>
      </CardHeader>
      <CardContent>{renderStep()}</CardContent>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-sm w-full text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Booking Successful!</h2>
            <p className="text-gray-600 mb-6">Your service has been successfully booked.</p>
            <Button onClick={handleCloseModal} className="w-full">
              Book Another Service
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}