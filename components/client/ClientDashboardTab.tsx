'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  User,
  MapPin,
  Calendar,
  Settings,
  Plus,
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

// Import types
import { Client, ClientLocation, Appointment, Device, Service, Brand, ACType, HorsepowerOption, UUID } from '../../types/database';

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

  // --- Booking Modal State and Handlers ---
  const [isBookingModalOpen, setIsBookingModal] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<UUID | null>(null);
  const [selectedDevices, setSelectedDevices] = useState<UUID[]>([]);
  const [bookingDate, setBookingDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  
  // --- Details Modal State and Handlers ---
  const [isDetailsModalOpen, setIsDetailsModal] = useState(false);
  const [modalLocation, setModalLocation] = useState<ClientLocation | null>(null);
  const [modalStatusType, setModalStatusType] = useState<'scheduled' | 'due' | 'well-maintained' | 'no-service' | null>(null);
  const [modalDevices, setModalDevices] = useState<Device[]>([]);
  
  // --- Edit Device State ---
  const [editingDeviceId, setEditingDeviceId] = useState<UUID | null>(null);
  const [editedDeviceData, setEditedDeviceData] = useState<Partial<Device>>({});
    // --- NEW: Success Modal State and Handlers ---
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const handleOpenBookingModal = (locationId: UUID) => {
    setSelectedLocationId(locationId);
    setIsBookingModal(true);
    setSelectedDevices([]);
    setBookingDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleCloseBookingModal = () => {
    setIsBookingModal(false);
    setSelectedLocationId(null);
  };

  const handleCloseSuccessModal = () => {
    setIsSuccessModalOpen(false);
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

  const handleConfirmBooking = async () => {
    if (!client || !selectedLocationId || selectedDevices.length === 0) {
      handleCloseBookingModal();
      return;
    }

    try {
      const appointmentDate = bookingDate;

      // Pick a service to associate with the appointment (fallback to first available)
      const selectedService = allServices[0];
      const serviceId = selectedService ? selectedService.id : (null as any);

      const totalUnits = selectedDevices.length;
      const pricing = calculateTotalPrice();
      const amount = pricing.total;

      const newAppointment = await appointmentApi.createAppointment({
        client_id: client.id,
        location_id: selectedLocationId,
        service_id: serviceId,
        appointment_date: appointmentDate,
        appointment_time: null,
        amount,
        total_units: totalUnits,
        notes: 'Client panel booking',
      });

      // Create join rows in appointment_devices for each selected device
      const joinRows = selectedDevices.map((deviceId) => ({ appointment_id: newAppointment.id, device_id: deviceId }));
      await appointmentDevicesApi.createMany(joinRows as any);

      // Update device fields if needed (location/name/horsepower)
      const deviceUpdatePromises = selectedDevices.map(async (deviceId) => {
        const device = devices.find(d => d.id === deviceId);
        if (!device) return Promise.resolve();
        const updatePayload: Partial<Device> = {};
        // Sync location to the selected location for this booking
        if (selectedLocationId && device.location_id !== selectedLocationId) {
          updatePayload.location_id = selectedLocationId;
        }
        
        // --- ADDED: Set last_cleaning_date to null ---
        updatePayload.last_cleaning_date = null;
        // --- END ADDED ---

        if (Object.keys(updatePayload).length > 0) {
          await deviceApi.updateDevice(deviceId, updatePayload);
        }
      });
      await Promise.all(deviceUpdatePromises);

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
          client_id: client.id,
          send_to_admin: true,
          send_to_client: false,
          is_referral: isReferral,
          date: appointmentDate,
        };
        
        await notificationApi.createNotification(notificationData);
        console.log('Notification created successfully');

        // If a referral ID was used, remove it from session storage
        if (referralId) {
          sessionStorage.removeItem('referralId');
          console.log('[SESSION] Referral ID removed from session storage.');
        }
      } catch (notificationError) {
        console.error('Error creating notification:', notificationError);
        // Don't fail the entire booking if notification creation fails
      }


      // Refresh local state
      const [fetchedDevices, fetchedAppointments] = await Promise.all([
        deviceApi.getByClientId(client.id),
        appointmentApi.getByClientId(client.id),
      ]);
      setDevices(fetchedDevices);
      setAppointments(fetchedAppointments);

    } catch (err) {
      console.error('Failed to confirm booking:', err);
    } finally {
      handleCloseBookingModal();
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
  const handleOpenDetailsModal = (locationId: UUID, statusType: 'scheduled' | 'due' | 'well-maintained') => {
    const location = locations.find(loc => loc.id === locationId);
    if (!location) return;
    
    setModalLocation(location);
    setModalStatusType(statusType);
    
    // Filter devices based on the requested status rules (device-level appointment linkage)
    const filteredDevices = devices.filter(device => {
      if (device.location_id !== locationId) return false;

      const today = new Date();
      const linkedAppointmentId = deviceIdToAppointmentId.get(device.id as UUID) || null;
      const deviceAppointment = linkedAppointmentId ? appointments.find(appt => appt.id === linkedAppointmentId) : undefined;

      const hasLastCleaning = !!device.last_cleaning_date;
      const hasDueDates = !!device.due_3_months && !!device.due_4_months && !!device.due_6_months;
      const lastCleaningDate = hasLastCleaning ? new Date(device.last_cleaning_date as string) : null;
      const due3 = device.due_3_months ? new Date(device.due_3_months) : null;
      const due4 = device.due_4_months ? new Date(device.due_4_months) : null;
      const due6 = device.due_6_months ? new Date(device.due_6_months) : null;

      const isDue = [due3, due4, due6].filter(Boolean).some(d => (d as Date) <= today);

      // Scheduled
      if (statusType === 'scheduled') {
        // booked: any confirmed appointment for this device, regardless of device dates
        return deviceAppointment?.status === 'confirmed';
      }

      // Due
      if (statusType === 'due') {
        const isCompleted = deviceAppointment?.status === 'completed';
        return isCompleted && hasLastCleaning && hasDueDates && isDue;
      }

      // Well Maintained
      if (statusType === 'well-maintained') {
        const isCompleted = deviceAppointment?.status === 'completed';
        return isCompleted && hasLastCleaning && hasDueDates && !isDue;
      }

      return false;
    });

    setModalDevices(filteredDevices);
    setIsDetailsModal(true);
  };


  const handleCloseDetailsModal = () => {
    setIsDetailsModal(false);
    setModalLocation(null);
    setModalStatusType(null);
    setModalDevices([]);
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
    }>();

    const today = new Date();
    
    devices.forEach(device => {
      const locationId = device.location_id;
      if (!locationId) return;

      if (!statusByLocation.has(locationId)) {
        const location = locations.find(loc => loc.id === locationId);
        if (location) {
          statusByLocation.set(locationId, {
            location,
            dueDevices: 0,
            scheduledDevices: 0,
            wellMaintainedDevices: 0,
            totalDevices: 0,
            lastServiceDate: null,
          });
        } else {
          return;
        }
      }
      
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

      const hasLastCleaning = !!device.last_cleaning_date;
      const hasDueDates = !!device.due_3_months && !!device.due_4_months && !!device.due_6_months;
      const isDue = [device.due_3_months, device.due_4_months, device.due_6_months]
        .filter(Boolean)
        .some((d) => new Date(d as string) <= today);

      // Booked (confirmed) devices are exclusive
      if (deviceAppointment?.status === 'confirmed') {
        status.scheduledDevices++;
        return;
      }

      // Due / Well Maintained (only if there's a completed appointment)
      if (deviceAppointment?.status === 'completed' && hasLastCleaning && hasDueDates) {
        if (isDue) {
          status.dueDevices++;
        } else {
          status.wellMaintainedDevices++;
        }
        return;
      }
    });

    return Array.from(statusByLocation.values());
  };
  
  const cleaningStatuses = getDeviceCleaningStatus();
  
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
          cleaningStatuses={cleaningStatuses} 
          handleOpenBookingModal={handleOpenBookingModal}
          handleOpenDetailsModal={handleOpenDetailsModal}
        />

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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 relative">
            <button 
              onClick={handleCloseBookingModal} 
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-bold mb-4">List of All AC under Location</h2>
            
            <div className="mb-4 flex items-center space-x-2">
              <Checkbox
                id="selectAll"
                checked={selectedDevices.length === devicesForSelectedLocation.length && devicesForSelectedLocation.length > 0}
                onCheckedChange={handleSelectAllDevices}
              />
              <label htmlFor="selectAll" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Select All
              </label>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {devicesForSelectedLocation.length > 0 ? (
                devicesForSelectedLocation.map(device => {
                  const brand = allBrands.find(b => b.id === device.brand_id)?.name || 'N/A';
                  const acType = allACTypes.find(t => t.id === device.ac_type_id)?.name || 'N/A';
                  const horsepower = allHorsepowerOptions.find(h => h.id === device.horsepower_id)?.display_name || 'N/A';
                  const acName = `${device.name} (${brand} ${acType} ${horsepower})`;
                  const devicePrice = calculateDevicePrice(device);

                  const progressBar3Month = getProgressBarValue(device, 3);
                  const progressBar4Month = getProgressBarValue(device, 4);
                  const progressBar6Month = getProgressBarValue(device, 6);

                  return (
                    <div key={device.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="mb-6">
                          <Label htmlFor="bookingDate" className="font-semibold">Select Appointment Date</Label>
                          <Input
                            id="bookingDate"
                            type="date"
                            value={bookingDate}
                            onChange={(e) => setBookingDate(e.target.value)}
                            className="mt-1"
                          />
                          </div>
                        </div>
                      <div className="flex items-center justify-between">
                        
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
                          {devicePrice.toLocaleString()}
                        </div>
                      </div>

                      {device.last_cleaning_date && (
                        <div className="mt-2 space-y-2">
                          
                          <div>
                            <p className="text-xs font-semibold text-gray-700 mb-1">Due in 3 Months</p>
                            <div className="flex items-center space-x-2">
                              {/* FIX: Ensure a valid number is passed */}
                              <Progress value={Number(progressBar3Month) || 0} className={`w-full h-2 ${getProgressColorClass(progressBar3Month)}`} />
                              <span className={`text-xs font-semibold ${progressBar3Month > 75 ? 'text-red-500' : progressBar3Month > 40 ? 'text-orange-500' : 'text-green-500'}`}>
                                {Math.round(progressBar3Month)}%
                              </span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-700 mb-1">Due in 4 Months</p>
                            <div className="flex items-center space-x-2">
                              {/* FIX: Ensure a valid number is passed */}
                              <Progress value={Number(progressBar4Month) || 0} className={`w-full h-2 ${getProgressColorClass(progressBar4Month)}`} />
                              <span className={`text-xs font-semibold ${progressBar4Month > 75 ? 'text-red-500' : progressBar4Month > 40 ? 'text-orange-500' : 'text-green-500'}`}>
                                {Math.round(progressBar4Month)}%
                              </span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-700 mb-1">Due in 6 Months</p>
                            <div className="flex items-center space-x-2">
                              {/* FIX: Ensure a valid number is passed */}
                              <Progress value={Number(progressBar6Month) || 0} className={`w-full h-2 ${getProgressColorClass(progressBar6Month)}`} />
                              <span className={`text-xs font-semibold ${progressBar6Month > 75 ? 'text-red-500' : progressBar6Month > 40 ? 'text-orange-500' : 'text-green-500'}`}>
                                {Math.round(progressBar6Month)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500">No devices found for this location.</p>
              )}
            </div>
            
            {/* Pricing Summary */}
            {selectedDevices.length > 0 && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Pricing Summary</h3>
                {(() => {
                  const pricing = calculateTotalPrice();
                  return (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>{pricing.subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Discount ({pricing.discount}% - {(() => {
                          const discount = calculateDiscount();
                          return discount.type;
                        })()}):</span>
                        <span className="text-red-600">-{pricing.discountAmount.toLocaleString()}</span>
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between font-bold">
                          <span>Total Amount:</span>
                          <span className="text-blue-600">{pricing.total.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
            
            <div className="flex justify-end mt-6 space-x-4">
              <Button onClick={handleCloseBookingModal} variant="outline">
                Cancel
              </Button>
              <Button onClick={handleConfirmBooking} disabled={selectedDevices.length === 0} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                Confirm Booking
              </Button>
            </div>
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
            <h2 className="text-2xl font-bold mb-2 text-gray-800">{modalLocation.name}</h2>
            <p className="text-lg text-gray-600 mb-6">{modalStatusType.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')} Units</p>

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
                      const disableEdit = modalStatusType === 'scheduled';

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
                              {/* Removed Last Cleaning Date input from edit form */}
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
                            // Default View
                            <div>
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-gray-900">{device.name}</p>
                                {!disableEdit && (
                                  <Button onClick={() => handleEditDevice(device)} variant="ghost" size="icon">
                                    <Edit className="w-4 h-4 text-blue-500" />
                                  </Button>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">{brand} | {acType} | {horsepower}</p>
                              
                              {device.last_cleaning_date && (
                                <div className="mt-2 space-y-3">
                                  <p className="text-xs text-gray-500">
                                    Last serviced: {format(new Date(device.last_cleaning_date), 'MMM d, yyyy')}
                                  </p>

                                  {/* 3-month Progress Bar */}
                                  <div>
                                    <p className="text-xs font-semibold text-gray-700 mb-1">Due in 3 Months</p>
                                    <div className="flex items-center space-x-2">
                                      {/* FIX: Ensure a valid number is passed */}
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
                                      {/* FIX: Ensure a valid number is passed */}
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
                                      {/* FIX: Ensure a valid number is passed */}
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
    </>
  );
}