'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { format, addYears, differenceInDays, addDays } from 'date-fns';
import {
  Star,
  Calendar,
  AirVent,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Edit,
  Trash2,
  Save,
  Ban,
  Loader2,
  AlertCircle,
  X,
  Check
} from 'lucide-react';

// Import UI components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Import the new components
import { DashboardHeader } from '@/components/client/client_components/DashboardHeader';
import { StatsOverview } from '@/components/client/client_components/StatsOverview';
import { ClientStatusDash } from '@/components/client/client_components/ClientStatusDash';
import { AddLocationButton } from '@/components/client/client_components/AddLocationButton';
import { PointsCard } from '@/components/client/client_components/PointsCard';
import { RecentAppointmentsTable } from '@/components/client/client_components/RecentAppointmentsTable';
import { BlockedDateModal } from '@/components/client/client_components/BlockedDateModal';
import { BookingModal } from '@/components/client/client_components/BookingModal';
import { DetailsModal } from '@/components/client/client_components/DetailsModal';
import { LocationForm } from '@/components/client/LocationForm';
// --- CORRECTED API IMPORTS ---
import { clientApi } from '../../pages/api/clients/clientApi';
import { clientLocationApi } from '../../pages/api/clientLocation/clientLocationApi';
import { appointmentApi } from '../../pages/api/appointments/appointmentApi';
import { deviceApi } from '../../pages/api/device/deviceApi';
import { appointmentDevicesApi } from '../../pages/api/appointment_devices/appointmentDevicesApi';
import { servicesApi } from '../../pages/api/service/servicesApi';
import { brandsApi } from '../../pages/api/brands/brandsApi';
import { acTypesApi } from '../../pages/api/types/acTypesApi';
import { horsepowerApi } from '../../pages/api/horsepower/horsepowerApi';
import { customSettingsApi } from '../../pages/api/custom_settings/customSettingsApi';
import { notificationApi } from '../../pages/api/notification/notificationApi';
import { blockedDatesApi } from '../../pages/api/dates/blockedDatesApi';

// Import types

import { Client, ClientLocation, Appointment, Device, Service, Brand, ACType, HorsepowerOption, UUID, BlockedDate } from '../../types/database';

interface ClientDashboardTabProps {
  clientId: string;
  onBookNewCleaningClick: () => void;
  onReferClick: () => void;
}

// Helper function to format the full address
const formatAddress = (location: ClientLocation) => {
  const parts = [
    location.address_line1,
    location.street,
    location.barangay_name,
    location.city_name
  ].filter(Boolean);
  return parts.join(', ');
};

// Helper function to check if all devices for a location are scheduled
function areAllDevicesScheduled(locationId: UUID, devices: Device[], appointments: Appointment[], appointmentDevices: Map<UUID, UUID>) {
  const locationDevices = devices.filter(device => device.location_id === locationId);
  if (locationDevices.length === 0) return false; // If no devices, allow booking
  return locationDevices.every(device => {
    const apptId = appointmentDevices.get(device.id);
    if (!apptId) return false;
    const appt = appointments.find(a => a.id === apptId);
    return appt && appt.status === 'confirmed';
  });
}

export function ClientDashboardTab({ clientId, onBookNewCleaningClick, onReferClick }: ClientDashboardTabProps) {
  const [client, setClient] = useState<Client | null>(null);
  const [locations, setLocations] = useState<ClientLocation[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  const [allServices, setAllServices] = useState<Service[]>([]);
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [allACTypes, setAllACTypes] = useState<ACType[]>([]);
  const [allHorsepowerOptions, setAllHorsepowerOptions] = useState<HorsepowerOption[]>([]);
  const [customSettings, setCustomSettings] = useState<{ splitTypePrice: number; windowTypePrice: number; surcharge: number; discount: number; familyDiscount: number; repairPrice: number }>({
    splitTypePrice: 0,
    windowTypePrice: 0,
    surcharge: 0,
    discount: 0,
    familyDiscount: 0,
    repairPrice: 0,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  // --- Cleaning Status Pagination State ---
  const [cleaningStatusCurrentPage, setCleaningStatusCurrentPage] = useState(1);
  const cleaningStatusItemsPerPage = 2; // Show 2 locations per page
  // --- Booking Modal State and Handlers ---
  const [isBookingModalOpen, setIsBookingModal] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<UUID | null>(null);
  const [selectedDevices, setSelectedDevices] = useState<UUID[]>([]);
  const [bookingDate, setBookingDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // --- NEW: Enhanced Booking Modal State ---
  const [selectedServiceId, setSelectedServiceId] = useState<UUID | null>(null);
  const [showAdditionalService, setShowAdditionalService] = useState(false);
  const [additionalServiceId, setAdditionalServiceId] = useState<UUID | null>(null);
  const [additionalServiceDevices, setAdditionalServiceDevices] = useState<UUID[]>([]);
  const [additionalServiceDate, setAdditionalServiceDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  // --- NEW: New Units Modal State (for locations with 0 devices) ---
  const [showNewUnitsForm, setShowNewUnitsForm] = useState(false);
  const [newUnits, setNewUnits] = useState<Array<{
    brand_id: UUID | null;
    ac_type_id: UUID | null;
    horsepower_id: UUID | null;
    quantity: number;
  }>>([{

    brand_id: null,
    ac_type_id: null,
    horsepower_id: null,
    quantity: 1
  }]);

  // --- Details Modal State and Handlers ---

  const [isDetailsModalOpen, setIsDetailsModal] = useState(false);
  const [modalLocation, setModalLocation] = useState<ClientLocation | null>(null);
  const [modalStatusType, setModalStatusType] = useState<'scheduled' | 'due' | 'well-maintained' | 'repair' | 'no-service' | null>(null);
  const [modalDevices, setModalDevices] = useState<Device[]>([]);
  const [modalServiceName, setModalServiceName] = useState<string | null>(null);
  const [editingDeviceId, setEditingDeviceId] = useState<UUID | null>(null);
  const [editedDeviceData, setEditedDeviceData] = useState<Partial<Device>>({});
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isEditingPrimaryLocation, setIsEditingPrimaryLocation] = useState(false);
  const [selectedPrimaryLocationId, setSelectedPrimaryLocationId] = useState<UUID | null>(null);
  const [availableBlockedDates, setAvailableBlockedDates] = useState<BlockedDate[]>([]);
  const [showBlockedDateModal, setShowBlockedDateModal] = useState<BlockedDate | null>(null);

  const handleOpenBookingModal = (locationId: UUID) => {
    setSelectedLocationId(locationId);
    setIsBookingModal(true);
    setSelectedDevices([]);
    setBookingDate(format(new Date(), 'yyyy-MM-dd'));
    setSelectedServiceId(null);
    setShowAdditionalService(false);
    setAdditionalServiceId(null);
    setAdditionalServiceDevices([]);
    setAdditionalServiceDate(format(new Date(), 'yyyy-MM-dd'));
  };



  const handleCloseBookingModal = () => {
    setIsBookingModal(false);
    setSelectedLocationId(null);
    setSelectedServiceId(null);
    setShowAdditionalService(false);
    setAdditionalServiceId(null);
    setAdditionalServiceDevices([]);
    setShowNewUnitsForm(false);
    setNewUnits([{
      brand_id: null,
      ac_type_id: null,
      horsepower_id: null,
      quantity: 1
    }]);

  };



  const handleOpenSummaryModal = () => {
    setIsSummaryModalOpen(true);
  };

  // Close all open modals (Booking, New Units, Summary, etc.)
  const handleCloseAllModals = () => {
    setIsBookingModal(false);
    setShowNewUnitsForm(false);
    setIsSummaryModalOpen(false);
    setShowAdditionalService(false);
  };



  const handleCloseSummaryModal = () => {
    setIsSummaryModalOpen(false);
  };



  const handleCloseSuccessModal = () => {
    setIsSuccessModalOpen(false);
  };



  // --- New Units Form Handlers ---

  const handleAddNewUnit = () => {
    setNewUnits(prev => [...prev, {
      brand_id: null,
      ac_type_id: null,
      horsepower_id: null,
      quantity: 1

    }]);

  };



  const handleRemoveNewUnit = (index: number) => {
    setNewUnits(prev => prev.filter((_, i) => i !== index));
  };



  const handleUpdateNewUnit = (index: number, field: string, value: any) => {
    setNewUnits(prev => prev.map((unit, i) => 
      i === index ? { ...unit, [field]: value } : unit
    ));

  };

  const handleNewUnitsSubmit = () => {
    // Validate that all units have required fields
    const isValid = newUnits.every(unit => 
      unit.brand_id && unit.ac_type_id && unit.horsepower_id && unit.quantity > 0
    );
    if (!isValid) {
      alert('Please fill in all required fields for each unit.');
      return;

    }
    setShowNewUnitsForm(false);
    handleOpenSummaryModal();
  };

  

  const handleOpenLocationModal = () => {
    setIsLocationModalOpen(true);
  };

  const handleCloseLocationModal = () => {
    setIsLocationModalOpen(false);
  };

  const fetchLocations = async (): Promise<ClientLocation[]> => {
    try {
      const fetchedLocations = await clientLocationApi.getByClientId(clientId);
      setLocations(fetchedLocations);
      return fetchedLocations;
    } catch (err: any) {
      console.error('Error fetching locations:', err);
      return [];
    }
  };

  const handleLocationSaved = async () => {
    const updatedLocations = await fetchLocations();
    handleCloseLocationModal();
    // Jump to the last page so the newly added location is visible immediately
    const totalPagesAfterAdd = Math.max(1, Math.ceil(updatedLocations.length / cleaningStatusItemsPerPage));
    setCleaningStatusCurrentPage(totalPagesAfterAdd);
  };

  const handleStartEditPrimaryLocation = () => {
    const currentPrimary = locations.find(loc => loc.is_primary);
    setSelectedPrimaryLocationId(currentPrimary?.id || null);
    setIsEditingPrimaryLocation(true);
  };



  const handleCancelEditPrimaryLocation = () => {
    setIsEditingPrimaryLocation(false);
    setSelectedPrimaryLocationId(null);
  };

  const handleUpdatePrimaryLocation = async () => {
    if (!selectedPrimaryLocationId) return;
    try {
      // Update all locations to set is_primary to false
      const updatePromises = locations.map(location => 
        clientLocationApi.updateClientLocation(location.id, { is_primary: false })
      );
      await Promise.all(updatePromises);
      await clientLocationApi.updateClientLocation(selectedPrimaryLocationId, { is_primary: true });
      await fetchLocations();
      setIsEditingPrimaryLocation(false);
      setSelectedPrimaryLocationId(null);
    } catch (err) {
      console.error('Error updating primary location:', err);
      alert('Failed to update primary location. Please try again.');
    }
  };

  const handleToggleDevice = (deviceId: UUID) => {
    setSelectedDevices(prev => 
      prev.includes(deviceId)
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  

  const isDeviceScheduledForService = (deviceId: UUID, serviceId: UUID | null) => {
    if (!serviceId) return false;
    const apptIds = deviceIdToAppointmentId.get(deviceId) || [];
    if (apptIds.length === 0) return false;
    return apptIds.some((id) => {
      const appt = appointments.find((a) => a.id === id);
      return !!(appt && appt.status === 'confirmed' && appt.service_id === serviceId);
    });
  };

  const handleSelectAllDevices = (checked: boolean) => {
    if (!selectedLocationId || !selectedServiceId) {
      setSelectedDevices([]);
      return;
    }
    const locationDevices = devices.filter(d => d.location_id === selectedLocationId);
    const eligible = locationDevices
      .filter(d => !isDeviceScheduledForService(d.id as UUID, selectedServiceId))
      .map(d => d.id as UUID);

    if (checked) {
      setSelectedDevices(eligible);
    } else {
      setSelectedDevices([]);
    }
  };



  const handleToggleAdditionalServiceDevice = (deviceId: UUID) => {
    setAdditionalServiceDevices(prev => 
      prev.includes(deviceId)
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };



  const handleSelectAllAdditionalServiceDevices = (checked: boolean) => {
    if (!selectedLocationId || !additionalServiceId) {
      setAdditionalServiceDevices([]);
      return;
    }
    const locationDevices = devices.filter(d => d.location_id === selectedLocationId);
    const eligible = locationDevices
      .filter(d => !isDeviceScheduledForService(d.id as UUID, additionalServiceId))
      .map(d => d.id as UUID);

    if (checked) {
      setAdditionalServiceDevices(eligible);
    } else {
      setAdditionalServiceDevices([]);
    }
  };

  const handleConfirmBooking = async () => {
    if (!client || !selectedLocationId || !selectedServiceId || (selectedDevices.length === 0 && newUnits.length === 0)) {
      handleCloseBookingModal();
      return;
    }

    try {
      const appointmentDate = bookingDate;
      let totalUnits = selectedDevices.length;
      let amount = 0;
      let newDeviceIds: UUID[] = [];

      if (selectedDevices.length > 0) {
        const pricing = calculateTotalPrice();
        amount = pricing.total;
      } else if (newUnits.length > 0) {
        const totalPrice = newUnits.reduce((total, unit) => {
          if (!unit.brand_id || !unit.ac_type_id || !unit.horsepower_id) return total;
          const acType = allACTypes.find(t => t.id === unit.ac_type_id);
          const horsepower = allHorsepowerOptions.find(h => h.id === unit.horsepower_id);

          if (!acType || !horsepower) return total;

          let basePrice = 0;
          const acTypeName = acType.name.toLowerCase();
          const hpValue = horsepower.value;

          if (acTypeName.includes('split') || acTypeName.includes('u-shaped')) {
            basePrice = customSettings.splitTypePrice;
            if (hpValue > 2) {
              basePrice += customSettings.surcharge;
            }
          } else if (acTypeName.includes('window')) {
            basePrice = customSettings.windowTypePrice;
            if (hpValue > 1.5) {
              basePrice += customSettings.surcharge;
            }
          }
          return total + (basePrice * unit.quantity);
        }, 0);

        const discount = calculateDiscount();
        const discountAmount = (totalPrice * discount.value) / 100;
        amount = totalPrice - discountAmount;
        totalUnits = newUnits.reduce((sum, unit) => sum + unit.quantity, 0);
      }

      // Create main appointment
      const newAppointment = await appointmentApi.createAppointment({
        client_id: client.id,
        location_id: selectedLocationId,
        service_id: selectedServiceId,
        appointment_date: appointmentDate,
        appointment_time: null,
        amount,
        total_units: totalUnits,
        notes: 'Client panel booking',
      });


      if (newUnits.length > 0) {
        const devicesToInsert = [];
        for (const unit of newUnits) {
          if (!unit.brand_id || !unit.ac_type_id || !unit.horsepower_id) continue;
          const brand = allBrands.find(b => b.id === unit.brand_id)?.name || 'Unknown';
          const acType = allACTypes.find(t => t.id === unit.ac_type_id)?.name || 'Unknown';
          const deviceName = `${brand} ${acType}`;

          // Create multiple devices based on quantity
          for (let i = 0; i < unit.quantity; i++) {
            const newDevice = await deviceApi.createDevice({
              client_id: client.id,
              location_id: selectedLocationId,
              name: deviceName,
              brand_id: unit.brand_id,
              ac_type_id: unit.ac_type_id,
              horsepower_id: unit.horsepower_id,
              last_cleaning_date: null,
            })
            newDeviceIds.push(newDevice.id);
          }
        }
      }
      // Create join rows in appointment_devices for each selected device
      const joinRows = selectedDevices.map((deviceId) => ({ appointment_id: newAppointment.id, device_id: deviceId }));
      const newDeviceJoinRows = newDeviceIds.map((deviceId) => ({ appointment_id: newAppointment.id, device_id: deviceId }));

      // Combine all join rows
      const allJoinRows = [...joinRows, ...newDeviceJoinRows];
      await appointmentDevicesApi.createMany(allJoinRows as any);
      // Create additional service appointment if selected
      if (showAdditionalService && additionalServiceId && additionalServiceDevices.length > 0) {
        const additionalPricing = calculateAdditionalServicePrice();
        const additionalAmount = additionalPricing.total;
        const additionalAppointment = await appointmentApi.createAppointment({
          client_id: client.id,
          location_id: selectedLocationId,
          service_id: additionalServiceId,
          appointment_date: additionalServiceDate,
          appointment_time: null,
          amount: additionalAmount,
          total_units: additionalServiceDevices.length,
          notes: 'Client panel booking - Additional service',
        });

        // Create join rows for additional service devices
        const additionalJoinRows = additionalServiceDevices.map((deviceId) => ({ 
          appointment_id: additionalAppointment.id, 
          device_id: deviceId 
        }));

        await appointmentDevicesApi.createMany(additionalJoinRows as any);
      }

      // Update device fields if needed (location/name/horsepower) - BUT DON'T UPDATE last_cleaning_date
      const deviceUpdatePromises = selectedDevices.map(async (deviceId) => {
        const device = devices.find(d => d.id === deviceId);
        if (!device) return Promise.resolve();
        const updatePayload: Partial<Device> = {};
        // Sync location to the selected location for this booking
        if (selectedLocationId && device.location_id !== selectedLocationId) {
          updatePayload.location_id = selectedLocationId;
        }

        if (Object.keys(updatePayload).length > 0) {
          await deviceApi.updateDevice(deviceId, updatePayload);
        }
      });

      await Promise.all(deviceUpdatePromises);

      // Create notification entry
      try {
        let isReferral = false;
        const referralId = sessionStorage.getItem('referralId');
        if (referralId && referralId.trim() !== '') {
          isReferral = true;
        }

        const notificationData = {
          client_id: client.id,
          send_to_admin: true,
          send_to_client: false,
          is_referral: isReferral,
          date: appointmentDate,
        };
        
        await notificationApi.createNotification(notificationData);
        console.log('Notification created successfully');

        if (referralId) {
          sessionStorage.removeItem('referralId');
          console.log('[SESSION] Referral ID removed from session storage.');
        }
      } catch (notificationError) {

        console.error('Error creating notification:', notificationError);
      }      // Refresh local state
       const [fetchedDevices, fetchedAppointments] = await Promise.all([
         deviceApi.getByClientId(client.id),
         appointmentApi.getByClientId(client.id),
       ]);
       setDevices(fetchedDevices);
       setAppointments(fetchedAppointments);
       
       // Reset new units state
       setNewUnits([{
         brand_id: null,
         ac_type_id: null,
         horsepower_id: null,
         quantity: 1
       }]);

    } catch (err) {
      console.error('Failed to confirm booking:', err);
    } finally {
      handleCloseBookingModal();
      handleCloseSummaryModal();
      // Show success modal/toast
      setTimeout(() => {
        setIsSuccessModalOpen(true);
      }, 10);
    }
  };
  
  // --- Edit Device Handlers ---
  const handleEditDevice = (device: Device) => {
    setEditingDeviceId(device.id);
    setEditedDeviceData(device);
  };

  const handleCancelEdit = () => {
    setEditingDeviceId(null);
    setEditedDeviceData({});
  };

  const handleUpdateDevice = async (updatedDeviceData: Partial<Device>) => {
    if (!editingDeviceId) return;

    const updatePayload = {
      name: updatedDeviceData.name,
      location_id: updatedDeviceData.location_id,
      horsepower_id: updatedDeviceData.horsepower_id,
    };

    try {
      const updatedDevice = await deviceApi.updateDevice(editingDeviceId, updatePayload);

      // ✅ Update global devices state
      setDevices((prevDevices) =>
        prevDevices.map((d) => (d.id === updatedDevice.id ? updatedDevice : d))
      );

      // ✅ Update modalDevices state so the modal reflects changes instantly
      setModalDevices((prev) =>
        modalLocation && updatedDevice.location_id !== modalLocation.id
          ? prev.filter((d) => d.id !== updatedDevice.id) // remove if moved location
          : prev.map((d) => (d.id === updatedDevice.id ? updatedDevice : d))
      );

      handleCancelEdit();
    } catch (err) {
      console.error("Failed to update device:", err);
    }
  };




  // --- Details Modal Handlers ---
  const handleOpenDetailsModal = (locationId: UUID, statusType: 'scheduled' | 'due' | 'well-maintained' | 'repair' | 'no-service', serviceName?: string) => {
    const location = locations.find(loc => loc.id === locationId);
    if (!location) return;
    setModalLocation(location);
    setModalStatusType(statusType);
    setModalServiceName(serviceName || null);

    // Get the cleaning status for this location to ensure consistent filtering
    const locationStatus = cleaningStatuses.find(status => status.location.id === locationId);
    if (!locationStatus) {
      setModalDevices([]);
      setIsDetailsModal(true);
      return;
    }
    // Filter devices based on the same logic as getDeviceCleaningStatus
    let filteredDevices;
    if (statusType === 'repair') {
      // For repair, filter by service name instead of status
      filteredDevices = locationStatus.devices
        .filter(deviceInfo => {
          const serviceName = deviceInfo.service?.name?.toLowerCase() || '';
          return serviceName.includes('repair') || serviceName.includes('maintenance');
        })
        .map(deviceInfo => deviceInfo.device);
    } else if (serviceName && serviceName !== 'No Service') {
      // For specific services (like Cleaning), filter by both status and service name
      filteredDevices = locationStatus.devices
        .filter(deviceInfo => {
          const deviceServiceName = deviceInfo.service?.name || '';
          return deviceInfo.status === statusType && deviceServiceName === serviceName;
        })
        .map(deviceInfo => deviceInfo.device);
    } else {
      filteredDevices = locationStatus.devices
        .filter(deviceInfo => deviceInfo.status === statusType)
        .map(deviceInfo => deviceInfo.device);
    }

    setModalDevices(filteredDevices);
    setIsDetailsModal(true);
  };

  const handleCloseDetailsModal = () => {
    setIsDetailsModal(false);
    setModalLocation(null);
    setModalStatusType(null);
    setModalDevices([]);
    setModalServiceName(null);
  };

  useEffect(() => {
    const fetchLookupData = async () => {
      try {
        const [servicesData, brandsData, acTypesData, hpOptionsData, settingsData] = await Promise.all([
          servicesApi.getServices(),
          brandsApi.getBrands(),
          acTypesApi.getACTypes(),
          horsepowerApi.getHorsepowerOptions(),
          customSettingsApi.getCustomSettings(),
        ]);
        console.log('Fetched custom settings:', settingsData);
        setAllServices(servicesData);
        setAllBrands(brandsData);
        setAllACTypes(acTypesData);
        setAllHorsepowerOptions(hpOptionsData);
        setCustomSettings(settingsData);
      } catch (err: any) {
        console.error('Error fetching lookup data:', err);
      }
    };
    fetchLookupData();
  }, []);

  useEffect(() => {
    const fetchClientData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedClient = await clientApi.getClientById(clientId);
        if (!fetchedClient) {
          setError('Client not found.');
          setIsLoading(false);
          return;
        }

        const [fetchedLocations, fetchedDevices, fetchedAppointments] = await Promise.all([
          clientLocationApi.getByClientId(clientId),
          deviceApi.getByClientId(clientId),
          appointmentApi.getByClientId(clientId),
        ]);
        
        let calculatedPoints = 0;
        fetchedAppointments.forEach(appt => {
          if (appt.status === 'completed') {
            calculatedPoints += 1;
            // if (appt.total_units && appt.total_units >= 3) {
            //   calculatedPoints += 1;
            // }
          }
        });
        

        let pointsExpiry = null;
        if (calculatedPoints > 0) {
          const firstCompletedAppointment = fetchedAppointments.reduce(
            (earliest, current) => {
              if (current.status === "completed") {
                const currentTimestamp = new Date(current.appointment_date).getTime();
                const earliestTimestamp = earliest
                  ? new Date(earliest.appointment_date).getTime()
                  : Infinity;
                return currentTimestamp < earliestTimestamp ? current : earliest;
              }
              return earliest;
            },
            null as Appointment | null
          );

          if (firstCompletedAppointment) {
            pointsExpiry = addYears(
              new Date(firstCompletedAppointment.appointment_date),
              1
            ).toISOString();
          }
        }
        
        console.log(fetchedClient)
        console.log(fetchedClient.points)
        console.log(calculatedPoints);

        
        const updatedClient = await clientApi.updateClient(clientId, {
          points: calculatedPoints,
          points_expiry: pointsExpiry,
        });
        setClient(updatedClient);
      
        setLocations(fetchedLocations);
        setDevices(fetchedDevices);
        setAppointments(fetchedAppointments);

      } catch (err: any) {
        console.error('Error fetching client dashboard data:', err);
        setError(err.message || 'Failed to load client data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientData();
  }, [clientId]);


  const getServiceName = (id: UUID | null) => allServices.find(s => s.id === id)?.name || 'N/A';
  const getLocationCity = (locationId: UUID | null) => locations.find(loc => loc.id === locationId)?.city_name || 'N/A';
  const getLocation = (locationId: UUID | null) => locations.find(loc => loc.id === locationId) || null;

  // Build and cache device->appointments mapping from appointment_devices joins
  const [deviceIdToAppointmentId, setDeviceIdToAppointmentId] = useState<Map<UUID, UUID[]>>(new Map());
  useEffect(() => {
    const buildLinks = async () => {
      try {
        if (devices.length === 0) {
          setDeviceIdToAppointmentId(new Map());
          return;
        }
        const links = await appointmentDevicesApi.getByDeviceIds(devices.map(d => d.id));
        const map = new Map<UUID, UUID[]>();
        (links || []).forEach((l: any) => {
          const arr = map.get(l.device_id) || [];
          arr.push(l.appointment_id);
          map.set(l.device_id, arr);
        });
        setDeviceIdToAppointmentId(map);
      } catch (e) {
        console.error('Failed to fetch appointment_devices links:', e);
        setDeviceIdToAppointmentId(new Map());
      }
    };
    buildLinks();
  }, [devices, appointments]);

   const getDeviceCleaningStatus = () => {
    const statusByLocation = new Map<UUID, {
      location: ClientLocation,
      totalDevices: number,
      lastServiceDate: string | null,
      serviceGroups: Array<{
        service: Service,
        scheduledDevices: number,
        dueDevices: number, 
        wellMaintainedDevices: number,
        repairDevices: number,
        devices: Array<{
          device: Device;
          appointment: Appointment | undefined;
          status: 'scheduled' | 'due' | 'well-maintained' | 'no-service' | 'repair';
          brand: string;
          acType: string;
          horsepower: string;
        }>;
      }>
    }>();

    const today = new Date();

    // Initialize locations
    locations.forEach(location => {
      statusByLocation.set(location.id, {
        location,
        totalDevices: 0,
        lastServiceDate: null,
        serviceGroups: [],
      });
    });

    devices.forEach(device => {
      const locationId = device.location_id;
      if (!locationId) return;
      const locationStatus = statusByLocation.get(locationId);
      if (!locationStatus) return;

      locationStatus.totalDevices++;

      if (device.last_cleaning_date) {
        const lastCleanDate = new Date(device.last_cleaning_date);
        if (!locationStatus.lastServiceDate || lastCleanDate > new Date(locationStatus.lastServiceDate)) {
          locationStatus.lastServiceDate = device.last_cleaning_date;
        }
      }

      const brand = allBrands.find(b => b.id === device.brand_id)?.name || 'N/A';
      const acType = allACTypes.find(t => t.id === device.ac_type_id)?.name || 'N/A';
      const horsepower = allHorsepowerOptions.find(h => h.id === device.horsepower_id)?.display_name || 'N/A';

      const linkedAppointmentIds = deviceIdToAppointmentId.get(device.id as UUID) || [];
      const deviceAppointments = linkedAppointmentIds
        .map(id => appointments.find(appt => appt.id === id))
        .filter(Boolean) as Appointment[];

      const confirmedAppts = deviceAppointments.filter(a => a.status === 'confirmed');
      const completedAppts = deviceAppointments.filter(a => a.status === 'completed');
      const latestCompleted = completedAppts.sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime())[0];

      const hasLastCleaning = !!device.last_cleaning_date;
      const hasDueDates = !!device.due_3_months && !!device.due_4_months && !!device.due_6_months;
      const isDue = [device.due_3_months, device.due_4_months, device.due_6_months]
        .filter(Boolean)
        .some((d) => new Date(d as string) <= today);

      // --- Step 1: Handle repair appointments (always add if exists) ---
      confirmedAppts.forEach(appt => {
        const service = allServices.find(s => s.id === appt.service_id);
        if (!service) return;
        const isRepairService = service.name.toLowerCase().includes('repair') || service.name.toLowerCase().includes('maintenance');
        if (isRepairService) {
          let serviceGroup = locationStatus.serviceGroups.find(sg => sg.service.id === service.id);
          if (!serviceGroup) {
            serviceGroup = {
              service,
              scheduledDevices: 0,
              dueDevices: 0,
              wellMaintainedDevices: 0,
              repairDevices: 0,
              devices: []
            };
            locationStatus.serviceGroups.push(serviceGroup);
          }
          serviceGroup.repairDevices++;
          serviceGroup.devices.push({ device, appointment: appt, status: 'repair', brand, acType, horsepower });
        }
      });

      // --- Step 2: Handle cleaning-related appointments/status ---
      const cleaningAppts = confirmedAppts.filter(appt => {
        const service = allServices.find(s => s.id === appt.service_id);
        if (!service) return false;
        return service.name.toLowerCase().includes('clean');
      });

      if (cleaningAppts.length > 0) {
        cleaningAppts.forEach(appt => {
          const service = allServices.find(s => s.id === appt.service_id);
          if (!service) return;
          let serviceGroup = locationStatus.serviceGroups.find(sg => sg.service.id === service.id);
          if (!serviceGroup) {
            serviceGroup = {
              service,
              scheduledDevices: 0,
              dueDevices: 0,
              wellMaintainedDevices: 0,
              repairDevices: 0,
              devices: []
            };
            locationStatus.serviceGroups.push(serviceGroup);
          }
          serviceGroup.scheduledDevices++;
          serviceGroup.devices.push({ device, appointment: appt, status: 'scheduled', brand, acType, horsepower });
        });
      } else {
        // No confirmed cleaning appointment → fallback to last cleaning / due logic
        let deviceStatus: 'due' | 'well-maintained' | 'no-service' = 'no-service';
        let serviceToUse: Service | undefined = undefined;
        let appointmentToUse: Appointment | undefined = undefined;

        if (latestCompleted && hasLastCleaning && hasDueDates) {
          deviceStatus = isDue ? 'due' : 'well-maintained';
          serviceToUse = allServices.find(s => s.id === latestCompleted.service_id);
          appointmentToUse = latestCompleted;
        } else if (hasLastCleaning) {
          deviceStatus = 'well-maintained';
          serviceToUse = allServices.find(s => s.name.toLowerCase().includes('cleaning'));
        } else {
          serviceToUse = allServices.find(s => s.name.toLowerCase().includes('cleaning'));
          if (serviceToUse) deviceStatus = 'well-maintained';
        }

        if (serviceToUse) {
          let serviceGroup = locationStatus.serviceGroups.find(sg => sg.service.id === serviceToUse!.id);
          if (!serviceGroup) {
            serviceGroup = {
              service: serviceToUse,
              scheduledDevices: 0,
              dueDevices: 0,
              wellMaintainedDevices: 0,
              repairDevices: 0,
              devices: []
            };
            locationStatus.serviceGroups.push(serviceGroup);
          }

          if (deviceStatus === 'due') serviceGroup.dueDevices++;
          else if (deviceStatus === 'well-maintained') serviceGroup.wellMaintainedDevices++;

          serviceGroup.devices.push({ device, appointment: appointmentToUse, status: deviceStatus, brand, acType, horsepower });
        }
      }
    });

    return Array.from(statusByLocation.values()).map(locationStatus => {
      const allDeviceEntries: any[] = [];
      let totalScheduled = 0;
      let totalDue = 0;
      let totalWellMaintained = 0;

      locationStatus.serviceGroups.forEach(serviceGroup => {
        totalScheduled += serviceGroup.scheduledDevices;
        totalDue += serviceGroup.dueDevices;
        totalWellMaintained += serviceGroup.wellMaintainedDevices;
        serviceGroup.devices.forEach(deviceEntry => allDeviceEntries.push({ ...deviceEntry, service: serviceGroup.service }));
      });

      return {
        location: locationStatus.location,
        totalDevices: locationStatus.totalDevices,
        scheduledDevices: totalScheduled,
        dueDevices: totalDue,
        wellMaintainedDevices: totalWellMaintained,
        lastServiceDate: locationStatus.lastServiceDate,
        devices: allDeviceEntries,
        serviceGroups: locationStatus.serviceGroups
      };
    }).sort((a, b) => {
      if (a.location.is_primary && !b.location.is_primary) return -1;
      if (!a.location.is_primary && b.location.is_primary) return 1;
      return a.location.name.localeCompare(b.location.name);
    });
  };
  
  const cleaningStatuses = getDeviceCleaningStatus();
  
  // --- Cleaning Status Pagination Logic ---
  const cleaningStatusTotalPages = Math.ceil(cleaningStatuses.length / cleaningStatusItemsPerPage);
  const cleaningStatusIndexOfLastItem = cleaningStatusCurrentPage * cleaningStatusItemsPerPage;
  const cleaningStatusIndexOfFirstItem = cleaningStatusIndexOfLastItem - cleaningStatusItemsPerPage;
  const currentCleaningStatuses = cleaningStatuses.slice(cleaningStatusIndexOfFirstItem, cleaningStatusIndexOfLastItem);
  
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAppointments = appointments.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(appointments.length / itemsPerPage);

  const handleNextPage = () => {
    setCurrentPage(prevPage => Math.min(prevPage + 1, totalPages));
  };

  const handlePreviousPage = () => {
    setCurrentPage(prevPage => Math.max(prevPage - 1, 1));
  };

  // --- Cleaning Status Pagination Handlers ---
  const handleCleaningStatusNextPage = () => {
    const cleaningStatusTotalPages = Math.ceil(cleaningStatuses.length / cleaningStatusItemsPerPage);
    setCleaningStatusCurrentPage(prevPage => Math.min(prevPage + 1, cleaningStatusTotalPages));
  };

  const handleCleaningStatusPreviousPage = () => {
    setCleaningStatusCurrentPage(prevPage => Math.max(prevPage - 1, 1));
  };

  useEffect(() => {
    const fetchBlockedDates = async () => {
      try {
        const fetchedBlockedDates = await blockedDatesApi.getBlockedDates();
        setAvailableBlockedDates(fetchedBlockedDates);
      } catch (err) {}
    };
    if (availableBlockedDates.length === 0) {
      fetchBlockedDates();
    }
  }, [availableBlockedDates.length]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-gray-50 rounded-xl shadow-lg">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
        <p className="ml-4 text-gray-600">Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-red-50 rounded-xl shadow-lg text-red-700 p-6">
        <AlertCircle className="w-12 h-12 mb-4" />
        <h2 className="text-xl font-bold mb-2">Error Loading Dashboard</h2>
        <p className="text-center">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4 bg-blue-600 hover:bg-blue-700">
          Retry
        </Button>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-orange-50 rounded-xl shadow-lg text-orange-700 p-6">
        <AlertCircle className="w-12 h-12 mb-4" />
        <h2 className="text-xl font-bold mb-2">Client Not Found</h2>
        <p className="text-center">The client ID provided does not exist.</p>
        <Button onClick={() => window.location.href = '/'} className="mt-4 bg-blue-600 hover:bg-blue-700">
          Go to Home
        </Button>
      </div>
    );
  }

  const primaryLocation = locations.find(loc => loc.is_primary) || locations[0];
  
  const devicesForSelectedLocation = selectedLocationId 
    ? devices.filter(device => device.location_id === selectedLocationId && device.last_cleaning_date !== null) 
    : [];
    
  const getDeviceDetails = (device: Device) => {
    const brand = allBrands.find(b => b.id === device.brand_id)?.name || 'N/A';
    const acType = allACTypes.find(t => t.id === device.ac_type_id)?.name || 'N/A';
    const horsepower = allHorsepowerOptions.find(h => h.id === device.horsepower_id)?.display_name || 'N/A';
    return { brand, acType, horsepower };
  };

  const getProgressBarValue = (device: Device, dueInMonths: number) => {
    if (!device.last_cleaning_date) return 0;
    
    const lastCleaningDate = new Date(device.last_cleaning_date);
    const today = new Date();
    const daysSinceLastCleaning = differenceInDays(today, lastCleaningDate);
    const dueInDays = dueInMonths * 30; // Approximation for months
    
    if (dueInDays === 0) return 0;
    
    const progress = (daysSinceLastCleaning / dueInDays) * 100;
    
    // Ensure the value is not negative
    return Math.max(0, Math.min(progress, 100));
  };
  
  const getProgressColorClass = (value: number) => {
    if (value > 75) return 'bg-red-500';
    if (value > 40) return 'bg-orange-500';
    return 'bg-green-500';
  };

  // Calculate device price based on AC type and horsepower
  const calculateDevicePrice = (device: Device) => {
    // Default pricing (e.g., cleaning) based on AC type and horsepower
    const acType = allACTypes.find(t => t.id === device.ac_type_id);
    const horsepower = allHorsepowerOptions.find(h => h.id === device.horsepower_id);
    
    if (!acType || !horsepower) {
      return 0;
    }
    
    let basePrice = 0;
    
    // Get base price based on AC type
    switch (acType.name.toLowerCase()) {
      case 'split type':
        basePrice = customSettings.splitTypePrice || 0;
        break;
      case 'window type':
        basePrice = customSettings.windowTypePrice || 0;
        break;
      case 'u-shaped':
        basePrice = customSettings.splitTypePrice || 0; // Using split type price for U-shaped
        break;
      default:
        basePrice = 0;
    }
    
    // Apply surcharge based on horsepower
    const hpValue = horsepower.value;
    let surcharge = 0;
    
    if (acType.name.toLowerCase() === 'split type' && hpValue > 2.00) {
      surcharge = customSettings.surcharge || 0;
    } else if (acType.name.toLowerCase() === 'u-shaped' && hpValue > 2.00) {
      surcharge = customSettings.surcharge || 0;
    } else if (acType.name.toLowerCase() === 'window type' && hpValue > 1.50) {
      surcharge = customSettings.surcharge || 0;
    }
    
    return basePrice + surcharge;
  };

  // Calculate discount for a client
  const calculateDiscount = () => {
    if (!client) return { value: 0, type: 'None' };

    const discountValue = customSettings.discount || 0;
    const familyDiscountValue = customSettings.familyDiscount || 0;

    console.log('calculateDiscount debug:', {
      clientDiscounted: client.discounted,
      discountValue,
      familyDiscountValue,
      customSettings
    });

    if (client.discounted) {
      // Client has discount enabled - compare discount and family_discount, choose bigger value
      if (familyDiscountValue > discountValue) {
        console.log('Using family discount:', familyDiscountValue);
        return { 
          value: familyDiscountValue, 
          type: 'Family/Friends'
        };
      } else {
        console.log('Using standard discount:', discountValue);
        return { 
          value: discountValue, 
          type: 'Standard'
        };
      }
    } else {
      // Client has discount disabled - apply standard discount if available
      if (discountValue > 0) {
        console.log('Using standard discount (client not discounted):', discountValue);
        return { 
          value: discountValue, 
          type: 'Standard'
        };
      } else {
        console.log('No discount available');
        return { value: 0, type: 'None' };
      }
    }
  };

  // Calculate total price for selected devices
  const calculateTotalPrice = () => {
    const serviceName = allServices.find(s => s.id === selectedServiceId)?.name?.toLowerCase() || '';

    // Pricing per device
    const perDevicePrice = (device: Device) => {
      if (serviceName.includes('repair')) {
        return customSettings.repairPrice || 0;
      }
      return calculateDevicePrice(device);
    };

    const subtotal = selectedDevices.reduce((total, deviceId) => {
      const device = devices.find(d => d.id === deviceId);
      return total + (device ? perDevicePrice(device) : 0);
    }, 0);
    
    let discountValue = 0;
    let discountAmount = 0;
    if (!serviceName.includes('repair')) {
      const discount = calculateDiscount();
      discountValue = discount.value;
      discountAmount = (subtotal * discount.value) / 100;
    }
    const total = subtotal - discountAmount;
    
    return {
      subtotal,
      discount: discountValue,
      discountAmount,
      total
    };
  };

  // Calculate total price for additional service devices
  const calculateAdditionalServicePrice = () => {
    const serviceName = allServices.find(s => s.id === additionalServiceId)?.name?.toLowerCase() || '';

    const perDevicePrice = (device: Device) => {
      if (serviceName.includes('repair')) {
        return customSettings.repairPrice || 0;
      }
      return calculateDevicePrice(device);
    };

    const subtotal = additionalServiceDevices.reduce((total, deviceId) => {
      const device = devices.find(d => d.id === deviceId);
      return total + (device ? perDevicePrice(device) : 0);
    }, 0);
    
    let discountValue = 0;
    let discountAmount = 0;
    if (!serviceName.includes('repair')) {
      const discount = calculateDiscount();
      discountValue = discount.value;
      discountAmount = (subtotal * discount.value) / 100;
    }
    const total = subtotal - discountAmount;
    
    return {
      subtotal,
      discount: discountValue,
      discountAmount,
      total
    };
  };

  // Calculate combined total price for both services
  const calculateCombinedTotalPrice = () => {
    let mainPricing;
    
    if (selectedDevices.length > 0) {
      mainPricing = calculateTotalPrice();
    } else if (newUnits.length > 0) {
      // Calculate pricing for new units
      const totalPrice = newUnits.reduce((total, unit) => {
        if (!unit.brand_id || !unit.ac_type_id || !unit.horsepower_id) return total;
        
        const acType = allACTypes.find(t => t.id === unit.ac_type_id);
        const horsepower = allHorsepowerOptions.find(h => h.id === unit.horsepower_id);
        
        if (!acType || !horsepower) return total;
        
        let basePrice = 0;
        const acTypeName = acType.name.toLowerCase();
        const hpValue = horsepower.value;
        
        if (acTypeName.includes('split') || acTypeName.includes('u-shaped')) {
          basePrice = customSettings.splitTypePrice;
          if (hpValue > 2) {
            basePrice += customSettings.surcharge;
          }
        } else if (acTypeName.includes('window')) {
          basePrice = customSettings.windowTypePrice;
          if (hpValue > 1.5) {
            basePrice += customSettings.surcharge;
          }
        }
        
        return total + (basePrice * unit.quantity);
      }, 0);
      
      const discount = calculateDiscount();
      const discountAmount = (totalPrice * discount.value) / 100;
      const total = totalPrice - discountAmount;
      
      mainPricing = {
        subtotal: totalPrice,
        discount: discount.value,
        discountAmount,
        total
      };
    } else {
      mainPricing = { subtotal: 0, discount: 0, discountAmount: 0, total: 0 };
    }
    
    const additionalPricing = showAdditionalService && additionalServiceDevices.length > 0 
      ? calculateAdditionalServicePrice() 
      : { subtotal: 0, discount: 0, discountAmount: 0, total: 0 };
    
    return {
      subtotal: mainPricing.subtotal + additionalPricing.subtotal,
      discount: mainPricing.discount,
      discountAmount: mainPricing.discountAmount + additionalPricing.discountAmount,
      total: mainPricing.total + additionalPricing.total
    };
  };

  const getAvailableDevices = () => {
    if (!selectedLocationId || !selectedServiceId) return [];

    // Return all devices for this location; UI will disable those already scheduled for the selected service
    const locationDevices = devices.filter(device => device.location_id === selectedLocationId);
    return locationDevices;
  };

  // Get active services
  const getActiveServices = () => {
    return allServices.filter(service => service.is_active);
  };

  // Get additional service options (exclude the main selected service)
  const getAdditionalServiceOptions = () => {
    if (!selectedServiceId) return getActiveServices();
    return getActiveServices().filter(service => service.id !== selectedServiceId);
  };


  return (
    <>
      <div className="space-y-8">
        <DashboardHeader clientName={client.name} locationLabel={primaryLocation ? `${primaryLocation.city_name}, Philippines` : 'Philippines'} />

        <StatsOverview points={client.points} bookingsCount={appointments.length} devicesCount={devices.length} />

        <ClientStatusDash 
          cleaningStatuses={currentCleaningStatuses} 
          handleOpenBookingModal={handleOpenBookingModal}
          handleOpenDetailsModal={handleOpenDetailsModal}
          locations={locations}
          isEditingPrimaryLocation={isEditingPrimaryLocation}
          selectedPrimaryLocationId={selectedPrimaryLocationId}
          onStartEditPrimaryLocation={handleStartEditPrimaryLocation}
          onCancelEditPrimaryLocation={handleCancelEditPrimaryLocation}
          onUpdatePrimaryLocation={handleUpdatePrimaryLocation}
          onPrimaryLocationChange={setSelectedPrimaryLocationId}
          currentPage={cleaningStatusCurrentPage}
          totalPages={cleaningStatusTotalPages}
          onNextPage={handleCleaningStatusNextPage}
          onPreviousPage={handleCleaningStatusPreviousPage}
        />

        <AddLocationButton onClick={handleOpenLocationModal} />

        <PointsCard points={client.points} pointsExpiry={client.points_expiry} onReferClick={onReferClick} />

        <RecentAppointmentsTable
          appointments={currentAppointments}
          getServiceName={getServiceName}
          getLocationName={(id) => getLocation(id)?.name || 'N/A'}
          currentPage={currentPage}
          totalPages={totalPages}
          onPreviousPage={handlePreviousPage}
          onNextPage={handleNextPage}
          itemsPerPage={itemsPerPage}
        />
      </div>
      
       <BookingModal
         isOpen={isBookingModalOpen}
         onClose={handleCloseBookingModal}
         locations={locations}
         selectedLocationId={selectedLocationId}
         allServices={allServices}
         allBrands={allBrands}
         allACTypes={allACTypes}
         allHorsepowerOptions={allHorsepowerOptions}
         customSettings={customSettings}
         devices={devices}
         appointments={appointments}
         deviceIdToAppointmentId={deviceIdToAppointmentId}
         bookingDate={bookingDate}
         setBookingDate={(v: string) => {
           const blockedInfo = blockedDatesApi.isDateBlocked(v, availableBlockedDates);
           if (blockedInfo) {
             setShowBlockedDateModal(blockedInfo);
           } else {
             setBookingDate(v);
           }
         }}
         selectedServiceId={selectedServiceId}
         setSelectedServiceId={(id) => {
           setSelectedServiceId(id);
           setSelectedDevices([]);
           const locationDevices = devices.filter(d => d.location_id === selectedLocationId);
           if (locationDevices.length === 0) setShowNewUnitsForm(true);
         }}
         selectedDevices={selectedDevices}
         onToggleDevice={handleToggleDevice}
         onSelectAllDevices={handleSelectAllDevices}
         showAdditionalService={showAdditionalService}
         setShowAdditionalService={setShowAdditionalService}
         additionalServiceId={additionalServiceId}
         setAdditionalServiceId={setAdditionalServiceId}
         additionalServiceDevices={additionalServiceDevices}
         onToggleAdditionalServiceDevice={handleToggleAdditionalServiceDevice}
         onSelectAllAdditionalServiceDevices={handleSelectAllAdditionalServiceDevices}
         additionalServiceDate={additionalServiceDate}
         setAdditionalServiceDate={setAdditionalServiceDate}
         showNewUnitsForm={showNewUnitsForm}
         setShowNewUnitsForm={setShowNewUnitsForm}
         newUnits={newUnits}
         onAddNewUnit={handleAddNewUnit}
         onRemoveNewUnit={handleRemoveNewUnit}
         onUpdateNewUnit={handleUpdateNewUnit}
         onNewUnitsSubmit={handleNewUnitsSubmit}
         availableBlockedDates={availableBlockedDates}
         onDateBlocked={(bd) => setShowBlockedDateModal(bd)}
         calculateDevicePrice={calculateDevicePrice}
         calculateDiscount={calculateDiscount}
         calculateTotalPrice={calculateTotalPrice}
         calculateAdditionalServicePrice={calculateAdditionalServicePrice}
         calculateCombinedTotalPrice={calculateCombinedTotalPrice}
         onCheckSummary={handleOpenSummaryModal}
         getAvailableDevices={getAvailableDevices}
       />

      <DetailsModal
        isOpen={isDetailsModalOpen && !!modalLocation && !!modalStatusType}
        onClose={handleCloseDetailsModal}
        location={modalLocation as any}
        locations={locations}
        statusType={modalStatusType as any}
        serviceName={modalServiceName}
        devices={modalDevices}
        allBrands={allBrands}
        allACTypes={allACTypes}
        allHorsepowerOptions={allHorsepowerOptions}
        appointments={appointments}
        deviceIdToAppointmentId={deviceIdToAppointmentId}
        onEditStart={handleEditDevice}
        onEditCancel={handleCancelEdit}
        onEditSave={handleUpdateDevice}
        editingDeviceId={editingDeviceId}
        editedDeviceData={editedDeviceData}
        setEditedDeviceData={setEditedDeviceData}
        getProgressBarValue={getProgressBarValue}
        getProgressColorClass={getProgressColorClass}
      />

             {/* NEW: Summary Modal */}
       {isSummaryModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 relative">
             <button 
               onClick={handleCloseSummaryModal} 
               className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
             >
               <X className="w-6 h-6" />
             </button>
             
             <h2 className="text-2xl font-bold mb-6 text-gray-800">Check Summary</h2>
             
             <div className="space-y-6">
               {/* Main Service Summary */}
               <div className="p-4 border rounded-lg">
                 <h3 className="text-lg font-semibold mb-3 text-gray-700">
                   {selectedServiceId ? allServices.find(s => s.id === selectedServiceId)?.name : 'Service'}
                 </h3>
                 <div className="space-y-2">
                   <div className="text-sm text-gray-600">
                     <span className="font-medium">Devices:</span>
                     {selectedDevices.length > 0 ? (
                       <ul className="list-disc pl-5 mt-1 text-gray-700">
                         {selectedDevices.map(deviceId => {
                           const device = devices.find(d => d.id === deviceId);
                           if (!device) return null;
                           const brand = allBrands.find(b => b.id === device.brand_id)?.name || 'N/A';
                           const acType = allACTypes.find(t => t.id === device.ac_type_id)?.name || 'N/A';
                           const horsepower = allHorsepowerOptions.find(h => h.id === device.horsepower_id)?.display_name || 'N/A';
                           return (
                             <li key={device.id}>{`${device.name} (${brand} ${acType} ${horsepower})`}</li>
                           );
                         })}
                       </ul>
                     ) : newUnits.length > 0 ? (
                       <ul className="list-disc pl-5 mt-1 text-gray-700">
                         {newUnits.map((unit, index) => {
                           const brand = allBrands.find(b => b.id === unit.brand_id)?.name || 'N/A';
                           const acType = allACTypes.find(t => t.id === unit.ac_type_id)?.name || 'N/A';
                           const horsepower = allHorsepowerOptions.find(h => h.id === unit.horsepower_id)?.display_name || 'N/A';
                           return (
                             <li key={index}>{`${brand} ${acType} ${horsepower} (Qty: ${unit.quantity})`}</li>
                           );
                         })}
                       </ul>
                     ) : (
                       <span className="ml-1">-</span>
                     )}
                   </div>
                   <p className="text-sm text-gray-600">
                     <span className="font-medium">Date:</span> {format(new Date(bookingDate), 'MMM d, yyyy')}
                   </p>
                 </div>
               </div>

               {/* Additional Service Summary */}
               {showAdditionalService && additionalServiceId && additionalServiceDevices.length > 0 && (
                 <div className="p-4 border rounded-lg">
                   <h3 className="text-lg font-semibold mb-3 text-gray-700">
                     {allServices.find(s => s.id === additionalServiceId)?.name}
                   </h3>
                   <div className="space-y-2">
                     <div className="text-sm text-gray-600">
                       <span className="font-medium">Devices:</span>
                       <ul className="list-disc pl-5 mt-1 text-gray-700">
                         {additionalServiceDevices.map(deviceId => {
                           const device = devices.find(d => d.id === deviceId);
                           if (!device) return null;
                           const brand = allBrands.find(b => b.id === device.brand_id)?.name || 'N/A';
                           const acType = allACTypes.find(t => t.id === device.ac_type_id)?.name || 'N/A';
                           const horsepower = allHorsepowerOptions.find(h => h.id === device.horsepower_id)?.display_name || 'N/A';
                           return (
                             <li key={device.id}>{`${device.name} (${brand} ${acType} ${horsepower})`}</li>
                           );
                         })}
                       </ul>
                     </div>
                     <p className="text-sm text-gray-600">
                       <span className="font-medium">Date:</span> {format(new Date(additionalServiceDate), 'MMM d, yyyy')}
                     </p>
                   </div>
                 </div>
               )}

               {/* Pricing Summary */}
               <div className="p-4 bg-gray-50 rounded-lg">
                 <h3 className="text-lg font-semibold mb-3 text-gray-700">Pricing Summary</h3>
                 {(() => {
                   const pricing = calculateCombinedTotalPrice();
                   return (
                     <div className="space-y-2">
                       <div className="flex justify-between">
                         <span>Subtotal:</span>
                         <span>P{pricing.subtotal.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between">
                         <span>Discount ({pricing.discount}% - {(() => {
                           const discount = calculateDiscount();
                           return discount.type;
                         })()}):</span>
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

             </div>
             <div className="flex justify-end mt-6 space-x-4">
               <Button onClick={handleCloseSummaryModal} variant="outline">
                 Cancel
               </Button>
               <Button onClick={handleConfirmBooking} className="bg-blue-600 hover:bg-blue-700">
                 Confirm
               </Button>
             </div>
           </div>
         </div>
       )}

       {/* NEW: Success Modal */}
       {isSuccessModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 transition-opacity duration-300">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm transform scale-100 transition-transform duration-300">
             <div className="flex flex-col items-center p-6 space-y-4">
               <Check className="w-16 h-16 text-green-500" />
               <h2 className="text-2xl font-bold text-gray-800">Booking Confirmed!</h2>
               <p className="text-center text-gray-700">Your booking has been placed successfully. We`ll send you an update shortly.</p>
               <Button onClick={handleCloseSuccessModal} className="w-full">
                 OK
               </Button>
             </div>
           </div>
         </div>
       )}

       {/* Location Modal */}
       {isLocationModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 transition-opacity duration-300">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transform scale-100 transition-transform duration-300">
             <div className="flex justify-between items-center p-6 border-b">
               <h2 className="text-2xl font-bold text-gray-800">Add New Location</h2>
               <Button
                 onClick={handleCloseLocationModal}
                 variant="ghost"
                 size="sm"
                 className="h-8 w-8 p-0"
               >
                 <X className="h-4 w-4" />
               </Button>
             </div>
             <div className="p-6">
               <LocationForm 
                 clientId={clientId} 
                 onSave={handleLocationSaved}
               />
             </div>
           </div>
         </div>
       )}
       {/* New Units Form Modal */}
       {showNewUnitsForm && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 transition-opacity duration-300">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transform scale-100 transition-transform duration-300">
             <div className="flex justify-between items-center p-6 border-b">
               <h2 className="text-2xl font-bold text-gray-800">New Units</h2>
                <Button
                  onClick={handleCloseAllModals}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                 <X className="h-4 w-4" />
               </Button>
             </div>
             <div className="p-6 space-y-6">
               {/* Location Info */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="w-full">
                  <p className="font-semibold text-gray-800">
                    {selectedLocationId ? locations.find(loc => loc.id === selectedLocationId)?.name : 'Location'}
                  </p>
                  <div className="mt-2">
                    <Label htmlFor="new-units-service" className="text-sm font-medium text-gray-700">Service</Label>
                    <Select
                      value={selectedServiceId || ''}
                      onValueChange={(value) => setSelectedServiceId(value as UUID)}
                    >
                      <SelectTrigger id="new-units-service" className="mt-1">
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                      <SelectContent>
                        {allServices.filter(s => s.is_active).map(service => (
                          <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
               <div className="space-y-4">
                 <Label htmlFor="newUnitsDate" className="text-sm font-large text-gray-700">Appointment Date</Label>
                 <Input
                   id="newUnitsDate"
                   type="date"
                   min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                   value={bookingDate}
                   onChange={(e) => setBookingDate(e.target.value)}
                   className="ml-3 mt-1 w-50" // Added w-32 to make it smaller
                 />
               </div>
               {/* Units Form */}
               <div className="space-y-4">
                 {newUnits.map((unit, index) => (
                   <Card key={index} className="p-4">
                     <div className="flex justify-between items-start mb-4">
                       <h3 className="text-lg font-semibold">Unit {index + 1}</h3>
                       {newUnits.length > 1 && (
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => handleRemoveNewUnit(index)}
                           className="text-red-500 hover:text-red-700"
                         >
                           <Trash2 className="w-4 h-4" />
                         </Button>
                       )}
                     </div>
                    
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                       {/* Brand */}
                       <div>
                         <Label htmlFor={`brand-${index}`}>Brand</Label>
                         <Select
                           value={unit.brand_id || ''}
                           onValueChange={(value) => handleUpdateNewUnit(index, 'brand_id', value)}
                         >
                           <SelectTrigger>
                             <SelectValue placeholder="Select brand" />
                           </SelectTrigger>
                           <SelectContent>
                             {allBrands.map(brand => (
                               <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                       </div>
                       {/* Type */}
                       <div>
                         <Label htmlFor={`type-${index}`}>Type</Label>
                         <Select
                           value={unit.ac_type_id || ''}
                           onValueChange={(value) => handleUpdateNewUnit(index, 'ac_type_id', value)}
                         >
                           <SelectTrigger>
                             <SelectValue placeholder="Select type" />
                           </SelectTrigger>
                           <SelectContent>
                             {allACTypes.map(type => (
                               <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                       </div>
                       {/* Horsepower */}
                       <div>
                         <Label htmlFor={`hp-${index}`}>Horsepower</Label>
                         <Select
                           value={unit.horsepower_id || ''}
                           onValueChange={(value) => handleUpdateNewUnit(index, 'horsepower_id', value)}
                         >
                           <SelectTrigger>
                             <SelectValue placeholder="Select HP" />
                           </SelectTrigger>
                           <SelectContent>
                             {allHorsepowerOptions.map(hp => (
                               <SelectItem key={hp.id} value={hp.id}>{hp.display_name}</SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                       </div>

                       {/* Quantity */}
                       <div>
                         <Label htmlFor={`qty-${index}`}>Quantity</Label>
                         <div className="flex items-center space-x-2">
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => handleUpdateNewUnit(index, 'quantity', Math.max(1, unit.quantity - 1))}
                           >
                             <Minus className="w-4 h-4" />
                           </Button>
                           <span className="w-12 text-center font-medium">{unit.quantity}</span>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => handleUpdateNewUnit(index, 'quantity', unit.quantity + 1)}
                           >
                             <Plus className="w-4 h-4" />
                           </Button>
                         </div>
                       </div>
                     </div>
                   </Card>
                 ))}
               </div>

               {/* Add Another Unit Button */}
               <Button
                 variant="outline"
                 onClick={handleAddNewUnit}
                 className="w-full border-dashed border-2 border-gray-300 py-4"
               >
                 <Plus className="w-4 h-4 mr-2" />
                 Add Another Unit
               </Button>

               {/* Pricing Summary */}
               <div className="p-4 bg-gray-50 rounded-lg">
                 <h3 className="text-lg font-semibold mb-3">Pricing Summary</h3>
                 {(() => {
                   const totalPrice = newUnits.reduce((total, unit) => {
                     if (!unit.brand_id || !unit.ac_type_id || !unit.horsepower_id) return total;
                     
                     const acType = allACTypes.find(t => t.id === unit.ac_type_id);
                     const horsepower = allHorsepowerOptions.find(h => h.id === unit.horsepower_id);
                    
                     if (!acType || !horsepower) return total;
                     
                     let basePrice = 0;
                     const acTypeName = acType.name.toLowerCase();
                     const hpValue = horsepower.value;

                     
                     if (acTypeName.includes('split') || acTypeName.includes('u-shaped')) {
                       basePrice = customSettings.splitTypePrice;
                       if (hpValue > 2) {
                         basePrice += customSettings.surcharge;
                       }
                     } else if (acTypeName.includes('window')) {
                       basePrice = customSettings.windowTypePrice;
                       if (hpValue > 1.5) {
                         basePrice += customSettings.surcharge;
                       }
                     }

                     return total + (basePrice * unit.quantity);
                   }, 0);

                   const discount = calculateDiscount();
                   const discountAmount = (totalPrice * discount.value) / 100;
                   const finalTotal = totalPrice - discountAmount;
                   return (
                     <div className="space-y-2">
                       <div className="flex justify-between">
                         <span>Subtotal:</span>
                         <span>P{totalPrice.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between">
                         <span>Discount ({discount.value}% - {discount.type}):</span>
                         <span className="text-red-600">-P{discountAmount.toLocaleString()}</span>
                       </div>
                       <div className="border-t pt-2 mt-2">
                         <div className="flex justify-between font-bold">
                           <span>Total Amount:</span>
                           <span className="text-blue-600">P{finalTotal.toLocaleString()}</span>
                         </div>
                       </div>
                     </div>
                   );
                 })()}
               </div>

               {/* Action Buttons */}
               <div className="flex justify-end space-x-4">
                <Button
                  variant="outline"
                  onClick={handleCloseAllModals}
                >
                  Cancel
                </Button>
                 <Button
                   onClick={handleNewUnitsSubmit}
                   className="bg-blue-600 hover:bg-blue-700"
                 >
                   Continue
                 </Button>
               </div>
             </div>
           </div>
         </div>
       )}
       {showBlockedDateModal && (
         <BlockedDateModal blockedDate={showBlockedDateModal} onClose={() => setShowBlockedDateModal(null)} />
       )}
    </>
  );
}