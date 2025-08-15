'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  User,
  MapPin,
  Calendar,
  Settings,
  Plus,
  Minus,
  Edit,
  Trash2,
  QrCode,
  Star,
  Clock,
  Loader2,
  AlertCircle,
  TrendingUp,
  DollarSign,
  AirVent,
  Mail,
  Phone,
  Home,
  ChevronRight,
  ChevronLeft,
  X,
  Save,
  Ban,
  Check
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { format, addMonths, isBefore, addYears, differenceInDays } from 'date-fns';

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
import { CleaningStatus } from '@/components/client/device_status/CleaningStatus';
import { ClientStatusDash } from '@/components/client/device_status/ClientStatusDash';
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
  const [customSettings, setCustomSettings] = useState<{ splitTypePrice: number; windowTypePrice: number; surcharge: number; discount: number; familyDiscount: number }>({
    splitTypePrice: 0,
    windowTypePrice: 0,
    surcharge: 0,
    discount: 0,
    familyDiscount: 0
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

  const fetchLocations = async () => {
    try {
      const fetchedLocations = await clientLocationApi.getByClientId(clientId);
      setLocations(fetchedLocations);
    } catch (err: any) {
      console.error('Error fetching locations:', err);
    }
  };

  const handleLocationSaved = () => {
    fetchLocations();
    handleCloseLocationModal();
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

  

  const handleSelectAllDevices = (checked: boolean) => {
    const devicesToSelect = devicesForSelectedLocation.map(device => device.id);
    if (checked) {
      setSelectedDevices(devicesToSelect);
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
    const devicesToSelect = devicesForSelectedLocation.map(device => device.id);
    if (checked) {
      setAdditionalServiceDevices(devicesToSelect);
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

  const handleUpdateDevice = async () => {
    if (!editingDeviceId) return;
    
    // Create a clean object with only the editable fields
    const updatePayload = {
      name: editedDeviceData.name,
      location_id: editedDeviceData.location_id,
      horsepower_id: editedDeviceData.horsepower_id,
    };
    
    try {
      const updatedDevice = await deviceApi.updateDevice(editingDeviceId, updatePayload);
      setDevices(prevDevices => 
        prevDevices.map(d => (d.id === updatedDevice.id ? updatedDevice : d))
      );
      handleCancelEdit();
    } catch (err) {
      console.error('Failed to update device:', err);
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
            if (appt.total_units && appt.total_units >= 3) {
              calculatedPoints += 1;
            }
          }
        });
        
        let pointsExpiry = null;
        if (calculatedPoints > 0) {
          const lastCompletedAppointment = fetchedAppointments.reduce((latest, current) => {
            if (current.status === 'completed') {
              const currentTimestamp = new Date(current.appointment_date).getTime();
              const latestTimestamp = latest ? new Date(latest.appointment_date).getTime() : 0;
              return currentTimestamp > latestTimestamp ? current : latest;
            }
            return latest;
          }, null as Appointment | null);

          if (lastCompletedAppointment) {
            pointsExpiry = addYears(new Date(lastCompletedAppointment.appointment_date), 1).toISOString();
          }
        }
        
        if (fetchedClient.points !== calculatedPoints || fetchedClient.points_expiry !== pointsExpiry) {
          const updatedClient = await clientApi.updateClient(clientId, {
            points: calculatedPoints,
            points_expiry: pointsExpiry,
          });
          setClient(updatedClient);
        } else {
          setClient(fetchedClient);
        }
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

  // Build and cache device->appointment mapping from appointment_devices joins
  const [deviceIdToAppointmentId, setDeviceIdToAppointmentId] = useState<Map<UUID, UUID>>(new Map());
  useEffect(() => {
    const buildLinks = async () => {
      try {
        if (devices.length === 0) {
          setDeviceIdToAppointmentId(new Map());
          return;
        }
        const links = await appointmentDevicesApi.getByDeviceIds(devices.map(d => d.id));
        const map = new Map<UUID, UUID>();
        (links || []).forEach((l: any) => map.set(l.device_id, l.appointment_id));
        setDeviceIdToAppointmentId(map);
      } catch (e) {
        console.error('Failed to fetch appointment_devices links:', e);
        setDeviceIdToAppointmentId(new Map());
      }
    };
    buildLinks();
  }, [devices]);

  const getDeviceCleaningStatus = () => {
    const statusByLocation = new Map<UUID, {
      location: ClientLocation,
      dueDevices: number,
      scheduledDevices: number,
      wellMaintainedDevices: number,
      totalDevices: number,
      lastServiceDate: string | null,
      // New: Device details with service information
      devices: Array<{
        device: Device;
        appointment: Appointment | undefined;
        service: Service | undefined;
        status: 'scheduled' | 'due' | 'well-maintained' | 'no-service';
        brand: string;
        acType: string;
        horsepower: string;
      }>;
    }>();

    const today = new Date();
    
    // First, initialize all locations with 0 devices
    locations.forEach(location => {
      statusByLocation.set(location.id, {
        location,
        dueDevices: 0,
        scheduledDevices: 0,
        wellMaintainedDevices: 0,
        totalDevices: 0,
        lastServiceDate: null,
        devices: [],
      });
    });
    
    // Then process devices
    devices.forEach(device => {
      const locationId = device.location_id;
      if (!locationId) return;

      const status = statusByLocation.get(locationId);
      if (!status) return;

      status.totalDevices++;
      
      // Update last service date for the location if applicable
      if (device.last_cleaning_date) {
        const lastCleanDate = new Date(device.last_cleaning_date);
        if (!status.lastServiceDate || lastCleanDate > new Date(status.lastServiceDate)) {
          status.lastServiceDate = device.last_cleaning_date;
        }
      }
      
      // Resolve appointment via appointment_devices map
      const linkedAppointmentId = deviceIdToAppointmentId.get(device.id as UUID) || null;
      const deviceAppointment = linkedAppointmentId ? appointments.find(appt => appt.id === linkedAppointmentId) : undefined;
      const service = deviceAppointment ? allServices.find(s => s.id === deviceAppointment.service_id) : undefined;

      const hasLastCleaning = !!device.last_cleaning_date;
      const hasDueDates = !!device.due_3_months && !!device.due_4_months && !!device.due_6_months;
      const isDue = [device.due_3_months, device.due_4_months, device.due_6_months]
        .filter(Boolean)
        .some((d) => new Date(d as string) <= today);

      // Get device details
      const brand = allBrands.find(b => b.id === device.brand_id)?.name || 'N/A';
      const acType = allACTypes.find(t => t.id === device.ac_type_id)?.name || 'N/A';
      const horsepower = allHorsepowerOptions.find(h => h.id === device.horsepower_id)?.display_name || 'N/A';

      let deviceStatus: 'scheduled' | 'due' | 'well-maintained' | 'no-service' = 'no-service';

      // Booked (confirmed) devices are exclusive
      if (deviceAppointment?.status === 'confirmed') {
        status.scheduledDevices++;
        deviceStatus = 'scheduled';
      }
      // Due / Well Maintained (only if there's a completed appointment)
      else if (deviceAppointment?.status === 'completed' && hasLastCleaning && hasDueDates) {
        if (isDue) {
          status.dueDevices++;
          deviceStatus = 'due';
        } else {
          status.wellMaintainedDevices++;
          deviceStatus = 'well-maintained';
        }
      }

      // Add device to the devices array
      status.devices.push({
        device,
        appointment: deviceAppointment,
        service,
        status: deviceStatus,
        brand,
        acType,
        horsepower,
      });
    });
    // Sort locations: primary first, then by name
    const sortedStatuses = Array.from(statusByLocation.values()).sort((a, b) => {
      // Primary location always comes first
      if (a.location.is_primary && !b.location.is_primary) return -1;
      if (!a.location.is_primary && b.location.is_primary) return 1;
      
      // If both are primary or both are not primary, sort by name
      return a.location.name.localeCompare(b.location.name);
    });

    return sortedStatuses;
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
    const subtotal = selectedDevices.reduce((total, deviceId) => {
      const device = devices.find(d => d.id === deviceId);
      return total + (device ? calculateDevicePrice(device) : 0);
    }, 0);
    
    const discount = calculateDiscount();
    const discountAmount = (subtotal * discount.value) / 100;
    const total = subtotal - discountAmount;
    
    console.log('calculateTotalPrice debug:', {
      subtotal,
      discount,
      discountAmount,
      total,
      clientDiscounted: client?.discounted
    });
    
    return {
      subtotal,
      discount: discount.value,
      discountAmount,
      total
    };
  };

  // Calculate total price for additional service devices
  const calculateAdditionalServicePrice = () => {
    const subtotal = additionalServiceDevices.reduce((total, deviceId) => {
      const device = devices.find(d => d.id === deviceId);
      return total + (device ? calculateDevicePrice(device) : 0);
    }, 0);
    
    const discount = calculateDiscount();
    const discountAmount = (subtotal * discount.value) / 100;
    const total = subtotal - discountAmount;
    
    return {
      subtotal,
      discount: discount.value,
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

    // Limit to devices for this location
    const locationDevices = devices.filter(device => device.location_id === selectedLocationId);

    // From precomputed cleaningStatuses, allow only 'well-maintained' and 'due'
    const locationStatus = cleaningStatuses.find(s => s.location.id === selectedLocationId);
    if (!locationStatus) return [];

    const allowedDeviceIds = new Set<UUID>(
      locationStatus.devices
        .filter(d => d.status === 'well-maintained' || d.status === 'due')
        .map(d => d.device.id as UUID)
    );

    // Additionally, exclude devices already booked (confirmed) for the selected service at this location
    const bookedDeviceIds = new Set<UUID>();
    appointments.forEach(appt => {
      if (
        appt.status === 'confirmed' &&
        appt.location_id === selectedLocationId &&
        appt.service_id === selectedServiceId
      ) {
        deviceIdToAppointmentId.forEach((appointmentId, deviceId) => {
          if (appointmentId === appt.id) bookedDeviceIds.add(deviceId);
        });
      }
    });

    return locationDevices.filter(
      device => allowedDeviceIds.has(device.id as UUID) && !bookedDeviceIds.has(device.id as UUID)
    );
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

  // BlockedDateModal (copied from ScheduleStep)
  const BlockedDateModal = ({ blockedDate, onClose }: { blockedDate: BlockedDate, onClose: () => void }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-sm rounded-lg shadow-lg relative">
        <Button 
          variant="ghost" 
          size="sm" 
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-bold text-red-600 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 mr-2" />
            Date Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-3">
          <p className="text-gray-800 font-medium text-lg">{blockedDate.name}</p>
          <p className="text-gray-600 text-sm">
            From: {format(new Date(blockedDate.from_date), 'MMM d, yyyy')}
          </p>
          <p className="text-gray-600 text-sm">
            To: {format(new Date(blockedDate.to_date), 'MMM d, yyyy')}
          </p>
          {blockedDate.reason && (
            <p className="text-gray-700 text-base mt-2">
              Reason: <span className="font-normal">{blockedDate.reason}</span>
            </p>
          )}
          <Button onClick={onClose} className="mt-4 bg-red-600 hover:bg-red-700 w-full">
            Got It
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <>
      <div className="space-y-8">
        <Card className="rounded-xl shadow-lg overflow-hidden text-white relative p-6 md:p-8" style={{ backgroundColor: '#99BCC0' }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundColor: '#99BCC0' }}></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between">
            <div className="text-center md:text-left mb-4 md:mb-0">
              <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Welcome, {client.name}!</h1>
              <p className="text-lg opacity-90">{primaryLocation ? `${primaryLocation.city_name}, Philippines` : 'Philippines'}</p>
            </div>
            <div className="flex-shrink-0">
              <Image
                src={`/assets/images/icon.jpg`}
                alt="Welcome Illustration"
                width={150}
                height={150}
                className="w-24 h-24 md:w-36 md:h-36 rounded-full object-cover shadow-xl"
              />
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="rounded-xl shadow-lg p-6 flex items-center justify-between bg-white">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Points</p>
              <p className="text-3xl font-bold text-blue-600">{client.points}</p>
            </div>
            <Star className="w-10 h-10 text-yellow-500" />
          </Card>

          <Card className="rounded-xl shadow-lg p-6 flex items-center justify-between bg-white">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Bookings</p>
              <p className="text-3xl font-bold text-green-600">{appointments.length}</p>
            </div>
            <Calendar className="w-10 h-10 text-green-600" />
          </Card>

          <Card className="rounded-xl shadow-lg p-6 flex items-center justify-between bg-white">
            <div>
              <p className="text-sm font-medium text-gray-600">Registered AC Units</p>
              <p className="text-3xl font-bold text-purple-600">{devices.length}</p>
            </div>
            <AirVent className="w-10 h-10 text-purple-600" />
          </Card>
        </div>

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

        {/* Add Location Button - Fixed at bottom */}
        <Card className="rounded-xl shadow-lg p-6 bg-white">
          <CardContent className="p-0">
            <Button 
              variant="outline" 
              className="w-full border-blue-600 text-blue-600 hover:bg-blue-50 py-4 text-lg font-medium" 
              onClick={handleOpenLocationModal}
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Location
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-lg p-6 bg-white">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-xl font-bold flex items-center">
              <Star className="w-5 h-5 mr-2 text-yellow-500" />
              Your Points
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-4">
            <div className="flex justify-between items-center text-gray-700">
              <p className="text-2xl font-bold text-blue-600">{client.points}</p>
              {client.points > 0 && client.points_expiry && (
                <Badge variant="outline" className="text-sm border-yellow-500 text-yellow-700">
                  Expires on: {format(new Date(client.points_expiry), 'MMM d, yyyy')}
                </Badge>
              )}
            </div>
            <Button variant="outline" className="w-full border-blue-600 text-blue-600 hover:bg-blue-50" onClick={onReferClick}>
              Refer A Friend
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              Note: Points will be credited after the completion of your booking or referrals booking.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-lg p-6 bg-white">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-xl font-bold flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-blue-600" />
              Recent Appointments
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentAppointments.length > 0 ? (
                    currentAppointments.map((appointment) => (
                      <tr key={appointment.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(appointment.appointment_date), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {getServiceName(appointment.service_id)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {getLocation(appointment.location_id)?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {appointment.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <Badge
                            className={
                              appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                              appointment.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }
                          >
                            {appointment.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {appointment.notes || '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                        No recent appointments found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {appointments.length > itemsPerPage && (
              <div className="flex justify-between items-center mt-4 px-6">
                <Button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </Button>
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
             {isBookingModalOpen && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-6 relative max-h-[90vh] overflow-y-auto">
             <button 
               onClick={handleCloseBookingModal} 
               className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
             >
               <X className="w-6 h-6" />
             </button>
             
             {/* Header with Location */}
             <div className="mb-6">
               <h2 className="text-2xl font-bold text-gray-800">
                 {selectedLocationId ? locations.find(loc => loc.id === selectedLocationId)?.name : 'Select Location'}
               </h2>
               <p className="text-sm text-gray-600 mt-1">
                 Devices: {devices.filter(d => d.location_id === selectedLocationId).map(d => {
                   const brand = allBrands.find(b => b.id === d.brand_id)?.name || 'N/A';
                   const acType = allACTypes.find(t => t.id === d.ac_type_id)?.name || 'N/A';
                   const horsepower = allHorsepowerOptions.find(h => h.id === d.horsepower_id)?.display_name || 'N/A';
                   return `${d.name} (${brand} ${acType} ${horsepower})`;
                 }).join(', ')}
               </p>
             </div>

             {/* Service Selection */}
             <div className="mb-6">
               <Label htmlFor="service-select" className="text-sm font-medium text-gray-700">Service</Label>
               <Select
                 value={selectedServiceId || ''}
                 onValueChange={(value) => {
                   setSelectedServiceId(value);
                   setSelectedDevices([]);
                   
                   // Check if this location has 0 devices
                   const locationDevices = devices.filter(d => d.location_id === selectedLocationId);
                   if (locationDevices.length === 0) {
                     setShowNewUnitsForm(true);
                   }
                 }}
               >
                 <SelectTrigger className="mt-1">
                   <SelectValue placeholder="Select a service" />
                 </SelectTrigger>
                 <SelectContent>
                   {allServices.filter(service => service.is_active).map(service => (
                     <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>

             {/* Device Selection - Only show after service is selected */}
             {selectedServiceId && (
               <div className="mb-6">
                 <div className="mb-4 flex items-center space-x-2">
                   <Checkbox
                     id="selectAll"
                     checked={selectedDevices.length === getAvailableDevices().length && getAvailableDevices().length > 0}
                     onCheckedChange={handleSelectAllDevices}
                   />
                   <label htmlFor="selectAll" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                     Select All
                   </label>
                 </div>

                 <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                   {getAvailableDevices().length > 0 ? (
                     getAvailableDevices().map(device => {
                       const brand = allBrands.find(b => b.id === device.brand_id)?.name || 'N/A';
                       const acType = allACTypes.find(t => t.id === device.ac_type_id)?.name || 'N/A';
                       const horsepower = allHorsepowerOptions.find(h => h.id === device.horsepower_id)?.display_name || 'N/A';
                       const acName = `${device.name} (${brand} ${acType} ${horsepower})`;
                       const devicePrice = calculateDevicePrice(device);

                       return (
                         <div key={device.id} className="flex items-center justify-between p-3 border rounded-lg">
                           <div className="flex items-center space-x-3">
                             <Checkbox 
                               id={`device-${device.id}`} 
                               checked={selectedDevices.includes(device.id)}
                               onCheckedChange={() => handleToggleDevice(device.id)}
                             />
                             <label 
                               htmlFor={`device-${device.id}`} 
                               className="text-sm font-medium leading-none"
                             >
                               {acName}
                             </label>
                           </div>
                           <div className="text-sm font-semibold text-blue-600">
                             PHP {devicePrice.toLocaleString()}
                           </div>
                         </div>
                       );
                     })
                   ) : (
                     <p className="text-gray-500">No available devices for this service.</p>
                   )}
                 </div>

                 {/* Calendar */}
                 <div className="mt-4">
                   <Label htmlFor="bookingDate" className="text-sm font-medium text-gray-700">Appointment Date</Label>
                   <Input
                     id="bookingDate"
                     type="date"
                     value={bookingDate}
                     onChange={(e) => {
                       const dateStr = e.target.value;
                       const blockedInfo = blockedDatesApi.isDateBlocked(dateStr, availableBlockedDates);
                       if (blockedInfo) {
                         setShowBlockedDateModal(blockedInfo);
                         // Do not update bookingDate
                       } else {
                         setBookingDate(dateStr);
                       }
                     }}
                     className="mt-1"
                   />
                 </div>
               </div>
             )}

             {/* Add Another Services Section */}
             {selectedServiceId && (
               <div className="mb-6">
                 <Button
                   variant="outline"
                   onClick={() => setShowAdditionalService(!showAdditionalService)}
                   className="w-full"
                 >
                   {showAdditionalService ? 'Remove Additional Service' : 'Add Another Services +'}
                 </Button>

                 {showAdditionalService && (
                   <div className="mt-4 p-4 border rounded-lg">
                     <div className="mb-4">
                       <Label htmlFor="additional-service-select" className="text-sm font-medium text-gray-700">Additional Service</Label>
                       <Select
                         value={additionalServiceId || ''}
                         onValueChange={(value) => {
                           setAdditionalServiceId(value);
                           setAdditionalServiceDevices([]);
                         }}
                       >
                         <SelectTrigger className="mt-1">
                           <SelectValue placeholder="Select an additional service" />
                         </SelectTrigger>
                         <SelectContent>
                           {getAdditionalServiceOptions().map(service => (
                             <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </div>

                     {additionalServiceId && (
                       <>
                         <div className="mb-4 flex items-center space-x-2">
                           <Checkbox
                             id="selectAllAdditional"
                             checked={additionalServiceDevices.length === getAvailableDevices().length && getAvailableDevices().length > 0}
                             onCheckedChange={handleSelectAllAdditionalServiceDevices}
                           />
                           <label htmlFor="selectAllAdditional" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                             Select All
                           </label>
                         </div>

                         <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                           {getAvailableDevices().map(device => {
                             const brand = allBrands.find(b => b.id === device.brand_id)?.name || 'N/A';
                             const acType = allACTypes.find(t => t.id === device.ac_type_id)?.name || 'N/A';
                             const horsepower = allHorsepowerOptions.find(h => h.id === device.horsepower_id)?.display_name || 'N/A';
                             const acName = `${device.name} (${brand} ${acType} ${horsepower})`;
                             const devicePrice = calculateDevicePrice(device);

                             return (
                               <div key={device.id} className="flex items-center justify-between p-3 border rounded-lg">
                                 <div className="flex items-center space-x-3">
                                   <Checkbox 
                                     id={`additional-device-${device.id}`} 
                                     checked={additionalServiceDevices.includes(device.id)}
                                     onCheckedChange={() => handleToggleAdditionalServiceDevice(device.id)}
                                   />
                                   <label 
                                     htmlFor={`additional-device-${device.id}`} 
                                     className="text-sm font-medium leading-none"
                                   >
                                     {acName}
                                   </label>
                                 </div>
                                 <div className="text-sm font-semibold text-blue-600">
                                   PHP {devicePrice.toLocaleString()}
                                 </div>
                               </div>
                             );
                           })}
                         </div>

                         <div className="mt-4">
                           <Label htmlFor="additionalBookingDate" className="text-sm font-medium text-gray-700">Additional Service Date</Label>
                           <Input
                             id="additionalBookingDate"
                             type="date"
                             value={additionalServiceDate}
                             onChange={(e) => setAdditionalServiceDate(e.target.value)}
                             className="mt-1"
                           />
                         </div>
                       </>
                     )}
                   </div>
                 )}
               </div>
             )}

             {/* Pricing Summary - Fixed at bottom */}
             {(selectedDevices.length > 0 || additionalServiceDevices.length > 0) && (
               <div className="sticky bottom-0 bg-white border-t pt-4 mt-6">
                 <div className="p-4 bg-gray-50 rounded-lg">
                   <h3 className="text-lg font-semibold mb-3">Pricing Summary</h3>
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
                 <div className="flex justify-end mt-4 space-x-4">
                   <Button onClick={handleCloseBookingModal} variant="outline">
                     Cancel
                   </Button>
                   <Button 
                     onClick={handleOpenSummaryModal} 
                     disabled={selectedDevices.length === 0} 
                     className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     Check Summary
                   </Button>
                 </div>
               </div>
             )}
           </div>
         </div>
       )}

      {isDetailsModalOpen && modalLocation && modalStatusType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl p-8 relative">
            <button 
              onClick={handleCloseDetailsModal} 
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Header Section */}
            <div className="mb-6">
              <div className="space-y-2">
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 mr-2">Location:</span>
                  <span className="text-lg font-medium text-gray-800">{modalLocation.name}</span>
                </div>

                {modalServiceName && modalServiceName !== 'No Service' && (
                  <div className="flex items-center">
                    <span className="font-semibold text-gray-700 mr-2">Service:</span>
                    <span className="text-lg font-medium text-blue-600">{modalServiceName}</span>
                  </div>
                )}

                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 mr-2">Status:</span>
                  <span className="text-lg font-medium text-gray-800">
                    {modalStatusType === 'scheduled' ? 'Scheduled Units' :
                     modalStatusType === 'repair' ? 'Repair Units' : 
                     modalStatusType === 'no-service' ? 'No Service Units' :
                     `${modalStatusType.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')} Units`}
                  </span>
                </div>
              </div>
            </div>

            <Card className="p-4 rounded-xl shadow-md">

                <CardTitle className="text-lg font-semibold mb-4 text-gray-700">Devices ({modalDevices.length})</CardTitle>

                <CardContent className="space-y-4 p-0 max-h-96 overflow-y-auto">

                  {modalDevices.length > 0 ? (

                    modalDevices.map(device => {

                      const { brand, acType, horsepower } = getDeviceDetails(device);

                      const progressBar3Month = getProgressBarValue(device, 3);

                      const progressBar4Month = getProgressBarValue(device, 4);

                      const progressBar6Month = getProgressBarValue(device, 6);

                      const linkedAppointmentId = deviceIdToAppointmentId.get(device.id as UUID) || null;

                      const deviceAppointment = linkedAppointmentId ? appointments.find(appt => appt.id === linkedAppointmentId) : undefined;

                      const service = deviceAppointment ? allServices.find(s => s.id === deviceAppointment.service_id) : undefined;

                      

                      // Determine if edit should be shown (only for well-maintained and due)

                      const showEdit = modalStatusType === 'well-maintained' || modalStatusType === 'due';



                      return (

                        <div key={device.id} className="border-b last:border-b-0 pb-3">

                          {editingDeviceId === device.id ? (

                            // Edit Form

                            <div className="space-y-3">

                              <div>

                                <Label htmlFor={`name-${device.id}`}>Name</Label>

                                <Input

                                  id={`name-${device.id}`}

                                  value={editedDeviceData.name || ''}

                                  onChange={(e) => setEditedDeviceData({ ...editedDeviceData, name: e.target.value })}

                                />

                              </div>

                              <div>

                                <Label htmlFor={`location-${device.id}`}>Location</Label>

                                <Select

                                  value={editedDeviceData.location_id || ''}

                                  onValueChange={(value) => setEditedDeviceData({ ...editedDeviceData, location_id: value })}

                                >

                                  <SelectTrigger>

                                    <SelectValue placeholder="Select a location" />

                                  </SelectTrigger>

                                  <SelectContent>

                                    {locations.map(loc => (

                                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>

                                    ))}

                                  </SelectContent>

                                </Select>

                              </div>

                              <div>

                                <Label htmlFor={`horsepower-${device.id}`}>Horsepower</Label>

                                <Select

                                  value={editedDeviceData.horsepower_id || ''}

                                  onValueChange={(value) => setEditedDeviceData({ ...editedDeviceData, horsepower_id: value })}

                                >

                                  <SelectTrigger>

                                    <SelectValue placeholder="Select horsepower" />

                                  </SelectTrigger>

                                  <SelectContent>

                                    {allHorsepowerOptions.map(hp => (

                                      <SelectItem key={hp.id} value={hp.id}>{hp.display_name}</SelectItem>

                                    ))}

                                  </SelectContent>

                                </Select>
                              </div>

                              <div className="flex justify-end space-x-2 mt-4">

                                <Button onClick={handleCancelEdit} variant="outline" size="sm">

                                  <Ban className="w-4 h-4 mr-2" />

                                  Cancel

                                </Button>

                                <Button onClick={handleUpdateDevice} size="sm" className="bg-blue-600 hover:bg-blue-700">
                                  <Save className="w-4 h-4 mr-2" />
                                  Update
                                </Button>
                              </div>
                            </div>
                          ) : (
                              // Default View - Different layouts based on status type
                             <div>
                               <div className="flex items-center justify-between">
                                 <p className="font-medium text-gray-900">{device.name}</p>
                                 {showEdit && (
                                   <Button onClick={() => handleEditDevice(device)} variant="ghost" size="icon">
                                     <Edit className="w-4 h-4 text-blue-500" />
                                   </Button>
                                 )}
                               </div>
                               <p className="text-sm text-gray-600">{brand} | {acType} | {horsepower}</p>
                               {/* Service Information - Only show if modalServiceName is NOT set, or if it's 'No Service' (which is a special case) */}
                               {service && (!modalServiceName || modalServiceName === 'No Service') && (
                                 <div className="mt-2 p-2 bg-blue-50 rounded-md">
                                   <p className="text-xs font-semibold text-blue-800">Service: {service.name}</p>
                                   {deviceAppointment && (
                                     <p className="text-xs text-blue-600">
                                       Appointment Date: {format(new Date(deviceAppointment.appointment_date), 'MMM d, yyyy')}
                                     </p>
                                   )}
                                 </div>
                               )}

                               

                               {/* Appointment Date - Always show if available and service name is not in header */}
                               {deviceAppointment && modalServiceName && modalServiceName !== 'No Service' && (
                                 <div className="mt-2 p-2 bg-blue-50 rounded-md">
                                   <p className="text-xs text-blue-600">
                                     Appointment Date: {format(new Date(deviceAppointment.appointment_date), 'MMM d, yyyy')}
                                   </p>
                                 </div>
                               )}
                      
                              {/* Progress Bars - Only show for well-maintained and due statuses */}
                              {(modalStatusType === 'well-maintained' || modalStatusType === 'due') && device.last_cleaning_date && (
                                <div className="mt-2 space-y-3">
                                  <p className="text-xs text-gray-500">
                                    Last serviced: {format(new Date(device.last_cleaning_date), 'MMM d, yyyy')}
                                  </p>

                                  {/* 3-month Progress Bar */}
                                  <div>
                                    <p className="text-xs font-semibold text-gray-700 mb-1">Due in 3 Months</p>
                                    <div className="flex items-center space-x-2">
                                      <Progress value={Number(progressBar3Month) || 0} className={`w-full h-2 ${getProgressColorClass(progressBar3Month)}`} />
                                      <span className={`text-xs font-semibold ${progressBar3Month > 75 ? 'text-red-500' : progressBar3Month > 40 ? 'text-orange-500' : 'text-green-500'}`}>
                                        {Math.round(progressBar3Month)}%
                                      </span>
                                    </div>
                                  </div>

                                  {/* 4-month Progress Bar */}
                                  <div>
                                    <p className="text-xs font-semibold text-gray-700 mb-1">Due in 4 Months</p>
                                    <div className="flex items-center space-x-2">
                                      <Progress value={Number(progressBar4Month) || 0} className={`w-full h-2 ${getProgressColorClass(progressBar4Month)}`} />
                                      <span className={`text-xs font-semibold ${progressBar4Month > 75 ? 'text-red-500' : progressBar4Month > 40 ? 'text-orange-500' : 'text-green-500'}`}>
                                        {Math.round(progressBar4Month)}%
                                      </span>
                                    </div>
                                  </div>

                                  {/* 6-month Progress Bar */}
                                  <div>
                                    <p className="text-xs font-semibold text-gray-700 mb-1">Due in 6 Months</p>
                                    <div className="flex items-center space-x-2">
                                      <Progress value={Number(progressBar6Month) || 0} className={`w-full h-2 ${getProgressColorClass(progressBar6Month)}`} />
                                      <span className={`text-xs font-semibold ${progressBar6Month > 75 ? 'text-red-500' : progressBar6Month > 40 ? 'text-orange-500' : 'text-green-500'}`}>
                                        {Math.round(progressBar6Month)}%
                                      </span>
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
                    <p className="text-center text-gray-500">No devices in this category for this location.</p>
                  )}
                </CardContent>
              </Card>
            
            <div className="flex justify-end mt-8">
              <Button onClick={handleCloseDetailsModal} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

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
                 onClick={() => setShowNewUnitsForm(false)}
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
                 <div>
                   <p className="font-semibold text-gray-800">
                     {selectedLocationId ? locations.find(loc => loc.id === selectedLocationId)?.name : 'Location'}
                   </p>
                   <p className="text-sm text-gray-600">
                     {selectedServiceId ? allServices.find(s => s.id === selectedServiceId)?.name : 'Service'}
                   </p>
                 </div>
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

               {/* Date Picker */}
               <div>
                 <Label htmlFor="newUnitsDate">Appointment Date</Label>
                 <Input
                   id="newUnitsDate"
                   type="date"
                   value={bookingDate}
                   onChange={(e) => setBookingDate(e.target.value)}
                   className="mt-1"
                 />
               </div>

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
                   onClick={() => setShowNewUnitsForm(false)}
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