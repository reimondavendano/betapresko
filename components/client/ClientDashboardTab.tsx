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
  Check,
  SprayCan,
  HardHat,
  Zap
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

import { Client, ClientLocation, Appointment, Device, Service, Brand, ACType, HorsepowerOption, UUID, BlockedDate, City } from '../../types/database';
import { barangayApi } from '@/pages/api/barangays/barangayApi';
import { cityApi } from '@/pages/api/cities/cityApi';
import { PointsAppointments } from './client_components/PointsAppointments';
import { useRealtime } from '@/app/RealtimeContext';
import { toast } from 'sonner';
import { loyaltyPointsApi } from '@/pages/api/loyalty_points/loyaltyPointsApi';

interface ClientDashboardTabProps {
  clientId: string;
  onBookNewCleaningClick: () => void;
  onReferClick: () => void;
  onViewProfile: () => void;
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

export function ClientDashboardTab({ clientId, onBookNewCleaningClick, onReferClick, onViewProfile }: ClientDashboardTabProps) {
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
  const cleaningStatusItemsPerPage = 1; // Show 2 locations per page

  const [pointsAppointmentsPage, setPage] = useState(1);
  const [pointsAppointmentTotalPage, setTotalPages] = useState(1);
  // --- Booking Modal State and Handlers ---
  const [isBookingModalOpen, setIsBookingModal] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<UUID | null>(null);
  const [selectedDevices, setSelectedDevices] = useState<UUID[]>([]);
 const [bookingDate, setBookingDate] = useState<string>(
    format(addDays(new Date(), 1), "yyyy-MM-dd")
  );

  // --- NEW: Enhanced Booking Modal State ---
  const [selectedServiceId, setSelectedServiceId] = useState<UUID | null>(null);
  const [showAdditionalService, setShowAdditionalService] = useState(false);
  const [additionalServiceId, setAdditionalServiceId] = useState<UUID | null>(null);
  const [additionalServiceDevices, setAdditionalServiceDevices] = useState<UUID[]>([]);
  const [additionalServiceDate, setAdditionalServiceDate] = useState<string>(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  // --- NEW: New Units Modal State (for locations with 0 devices) ---
  const [showNewUnitsForm, setShowNewUnitsForm] = useState(false);
  const [newUnits, setNewUnits] = useState<Array<{
    brand_id: UUID | null;
    ac_type_id: UUID | null;
    horsepower_id: UUID | null;
    quantity: number;
  }>>([]);

  // --- Details Modal State and Handlers ---

  const [isDetailsModalOpen, setIsDetailsModal] = useState(false);
  const [modalLocation, setModalLocation] = useState<ClientLocation | null>(null);
  const [modalStatusType, setModalStatusType] = useState<'scheduled' | 'due' | 'well-maintained' | 'repair' | 'no-service' | 'voided' | null>(null);
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
  const [isEditLocationModalOpen, setIsEditLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<ClientLocation | null>(null);
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [citySearchTerm, setCitySearchTerm] = useState("");
  const [cities, setCities] = useState<any[]>([]);
  const [barangays, setBarangays] = useState<any[]>([]);
  const [selectedCity, setSelectedCity] = useState<any | null>(null);
  const [selectedBarangay, setSelectedBarangay] = useState<any | null>(null);
  const [isFetchingCities, setIsFetchingCities] = useState(false);
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [referralCount, setReferralCount] = useState(0);
  const [loyaltyPointsHistory, setLoyaltyPointsHistory] = useState<any[]>([]);

  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false);
  const [loyaltyPointsDiscount, setLoyaltyPointsDiscount] = useState(0);
  const [showFriendsDiscountWarning, setShowFriendsDiscountWarning] = useState(false);
  const [redemptionEventsThisYear, setRedemptionEventsThisYear] = useState(0);

  const [locationForm, setLocationForm] = useState<{
    name: string;
    address_line1: string;
    street: string;
    landmark: string;
    city_id: UUID | null;
    barangay_id: UUID | null;
  }>({
    name: '',
    address_line1: '',
    street: '',
    landmark: '',
    city_id: null,
    barangay_id: null,
  });

  const filteredCities = cities.filter(city =>
    city.name.toLowerCase().includes(citySearchTerm.toLowerCase())
  );

  const handleBarangaySelect = (value: string) => {
    const barangay = barangays.find(b => b.id === value) || null;
    setSelectedBarangay(barangay);

    setLocationForm(f => ({
      ...f,
      barangay_id: value || null,
    }));
  };

  const handleCitySelect = async (city: { id: string; name: string }) => {
    setSelectedCity(city);
    setCitySearchTerm(city.name);
    setIsCityDropdownOpen(false);

    //  update form state
    setLocationForm(f => ({
      ...f,
      city_id: city.id,
      barangay_id: null, // reset barangay when city changes
    }));

    //  fetch barangays for this city
    const fetchedBarangays = await barangayApi.getBarangaysByCity(city.id as UUID);
    setBarangays(fetchedBarangays);
    setSelectedBarangay(null);
  };
  

  const openEditLocation = async (loc: ClientLocation) => {
    setEditingLocation(loc);
    setLocationForm({
      name: loc.name || '',
      address_line1: loc.address_line1 || '',
      street: loc.street || '',
      landmark: loc.landmark || '',
      city_id: (loc as any).city_id || null,
      barangay_id: (loc as any).barangay_id || null,
    });

    //  Fetch cities if not already loaded
    let fetchedCities = cities;
    if (cities.length === 0) {
      fetchedCities = await cityApi.getCities();
      setCities(fetchedCities);
    }

    //  Select default city
    const city = fetchedCities.find(c => c.id === loc.city_id) || null;
    setSelectedCity(city);
    setCitySearchTerm(city?.name ?? "");

    //  Fetch barangays for this city
    if (loc.city_id) {
      const fetchedBarangays = await barangayApi.getBarangaysByCity(loc.city_id as UUID);
      setBarangays(fetchedBarangays);

      //  Select default barangay
      const barangay = fetchedBarangays.find(b => b.id === loc.barangay_id) || null;
      setSelectedBarangay(barangay);
    }

    setIsEditLocationModalOpen(true);
  };


  const closeEditLocation = () => {
    setIsEditLocationModalOpen(false);
    setEditingLocation(null);
  };

  const saveEditLocation = async () => {
    if (!editingLocation) return;
    try {
      setIsSavingLocation(true);

      // Adjust this if your API uses a different method name/signature.
      await clientLocationApi.updateClientLocation(editingLocation.id, {
        name: locationForm.name,
        address_line1: locationForm.address_line1,
        street: locationForm.street,
        landmark: locationForm.landmark,
        city_id: locationForm.city_id,
        barangay_id: locationForm.barangay_id,
      });

      // Re-fetch so the UI recomputes totals/grouping with the new location info
      await fetchLocations();

      // Close modal
      closeEditLocation();
    } catch (err) {
      console.error(err);
      alert('Failed to update location. Please try again.');
    } finally {
      setIsSavingLocation(false);
    }
  };

  const handleOpenBookingModal = (locationId: UUID) => {
    setSelectedLocationId(locationId);
    setIsBookingModal(true);
    setSelectedDevices([]);
    setBookingDate(format(addDays(new Date(), 1), "yyyy-MM-dd"));
    setSelectedServiceId(null);
    setShowAdditionalService(false);
    setAdditionalServiceId(null);
    setAdditionalServiceDevices([]);
    setAdditionalServiceDate(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  };



  const handleCloseBookingModal = () => {
    setIsBookingModal(false);
    setSelectedLocationId(null);
    setSelectedServiceId(null);
    setShowAdditionalService(false);
    setAdditionalServiceId(null);
    setAdditionalServiceDevices([]);
    setShowNewUnitsForm(false);
    setNewUnits([]);

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

  const handleRescheduleAppointment = async (appointmentId: UUID, newDate: string) => {
    try {
      const updated = await appointmentApi.updateAppointment(appointmentId, {
        appointment_date: newDate,
      });

      setAppointments((prev) =>
        prev.map((appt) =>
          appt.id === appointmentId ? { ...appt, appointment_date: newDate } : appt
        )
      );

      return updated;
    } catch (err) {
      console.error("Failed to reschedule appointment:", err);
      alert("Failed to update appointment date. Please try again.");
      throw err;
    }
  };


  const handleConfirmBooking = async () => {
    if (
      !client ||
      !selectedLocationId ||
      !selectedServiceId ||
      (selectedDevices.length === 0 && newUnits.length === 0 && additionalUnits.length === 0)
    ) {
      handleCloseBookingModal();
      return;
    }

    try {
      const appointmentDate = bookingDate;
      let totalUnits = selectedDevices.length;
      let amount = 0;
      let stored_discount = 0;
      let discount_type = 'Standard';
      let stored_loyalty_points = 0;
      let newDeviceIds: UUID[] = [];
      let additionalDeviceIds: UUID[] = [];

      // --- Pricing calculation with loyalty points ---
      const pricing = calculateCombinedTotalPriceWithLoyalty();
      
      // Use the final total after applying loyalty points discount
      amount = pricing.finalTotal;
      stored_discount = pricing.discount;
      discount_type = pricing.discount_type;
      stored_loyalty_points = useLoyaltyPoints ? loyaltyPointsDiscount : 0;
      totalUnits = selectedDevices.length + 
                  newUnits.reduce((sum, unit) => sum + unit.quantity, 0) +
                  additionalUnits.reduce((sum, unit) => sum + unit.quantity, 0);

      // --- Create main appointment ---
      const newAppointment = await appointmentApi.createAppointment({
        client_id: client.id,
        location_id: selectedLocationId,
        service_id: selectedServiceId,
        appointment_date: appointmentDate,
        appointment_time: null,
        amount,
        stored_discount,
        discount_type,
        total_units: totalUnits,
        notes: "Client panel booking",
        stored_loyalty_points: stored_loyalty_points,
      });

      // --- Handle loyalty points redemption ---
      if (useLoyaltyPoints && loyaltyPointsDiscount > 0) {
        try {
          // Calculate actual points to redeem (only multiples of 5)
          const pointsToRedeem = Math.floor(loyaltyPoints / 5) * 5;
          
          if (pointsToRedeem >= 5) {
            // Find multiple redeemable loyalty points that sum to the points needed
            const redeemablePointsData = await loyaltyPointsApi.getRedeemablePoints(client.id, pointsToRedeem);
            
            if (redeemablePointsData.length > 0) {
              await loyaltyPointsApi.redeemMultiplePoints(redeemablePointsData);
              
              toast.success(`Redeemed ${pointsToRedeem} Presko Reward points for ₱${loyaltyPointsDiscount} discount!`);
              
              // Show remaining points if any
              const remainingPoints = loyaltyPoints % 5;
              if (remainingPoints > 0) {
                toast.info(`${remainingPoints} point(s) remaining in your account`);
              }
            }
          }
        } catch (loyaltyError) {
          console.error('Error handling Presko Reward points redemption:', loyaltyError);
          toast.error('Booking successful, but failed to redeem Presko Reward points. Please contact support.');
        }
      }

      // --- Insert new devices for additionalUnits ---
      for (const unit of additionalUnits) {
        if (!unit.brand_id || !unit.ac_type_id || !unit.horsepower_id) continue;
        const brand = allBrands.find((b) => b.id === unit.brand_id)?.name || "Unknown";
        const acType = allACTypes.find((t) => t.id === unit.ac_type_id)?.name || "Unknown";
        const deviceName = `${brand} ${acType}`;

        for (let i = 0; i < unit.quantity; i++) {
          const newDevice = await deviceApi.createDevice({
            client_id: client.id,
            location_id: selectedLocationId,
            name: deviceName,
            brand_id: unit.brand_id,
            ac_type_id: unit.ac_type_id,
            horsepower_id: unit.horsepower_id,
            last_cleaning_date: null,
            last_repair_date: null,
          });
          additionalDeviceIds.push(newDevice.id);
        }
      }

      // --- Create appointment_devices joins ---
      const joinRows = selectedDevices.map((deviceId) => ({
        appointment_id: newAppointment.id,
        device_id: deviceId,
      }));
      const newDeviceJoinRows = newDeviceIds.map((deviceId) => ({
        appointment_id: newAppointment.id,
        device_id: deviceId,
      }));
      const additionalJoinRows = additionalDeviceIds.map((deviceId) => ({
        appointment_id: newAppointment.id,
        device_id: deviceId,
      }));

      await appointmentDevicesApi.createMany([...joinRows, ...newDeviceJoinRows, ...additionalJoinRows] as any);

      // --- Additional Service appointment (separate) ---
      if (showAdditionalService && additionalServiceId && additionalServiceDevices.length > 0) {
        const additionalPricing = calculateAdditionalServicePrice();
        const additionalAmount = additionalPricing.total;
        const additionalDiscounted = additionalPricing.discount;
        const additionalAppointment = await appointmentApi.createAppointment({
          client_id: client.id,
          location_id: selectedLocationId,
          service_id: additionalServiceId,
          appointment_date: additionalServiceDate,
          appointment_time: null,
          amount: additionalAmount,
          stored_discount: additionalDiscounted,
          discount_type: discount_type,
          total_units: additionalServiceDevices.length,
          notes: "Client panel booking - Additional service",
          stored_loyalty_points: stored_loyalty_points,
        });

        const additionalJoinRows = additionalServiceDevices.map((deviceId) => ({
          appointment_id: additionalAppointment.id,
          device_id: deviceId,
        }));

        await appointmentDevicesApi.createMany(additionalJoinRows as any);
      }

      // --- Update device fields for existing devices if needed ---
      const deviceUpdatePromises = selectedDevices.map(async (deviceId) => {
        const device = devices.find((d) => d.id === deviceId);
        if (!device) return Promise.resolve();
        const updatePayload: Partial<Device> = {};
        
        if (selectedLocationId && device.location_id !== selectedLocationId) {
          updatePayload.location_id = selectedLocationId;
        }

        const service = allServices.find(s => s.id === selectedServiceId);
        if (service) {
          const serviceName = service.name.toLowerCase();
          if (serviceName.includes("repair") || serviceName.includes("maintenance")) {
            updatePayload.last_repair_date = appointmentDate;
          } else if (serviceName.includes("cleaning")) {
            updatePayload.last_cleaning_date = appointmentDate;
          }
        }

        if (Object.keys(updatePayload).length > 0) {
          await deviceApi.updateDevice(deviceId, updatePayload);
        }
      });

      await Promise.all(deviceUpdatePromises);

      try {
        await fetch("/api/send-push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "client_to_admin",
            client_id: client.id,
            client_name: client.name,
            title: "📅 New Booking",
          }),
        });

        toast.success("Admins notified!");
      } catch (err) {
        console.error("❌ Failed to notify admins", err);
        toast.error("Failed to notify admins");
      }

      // --- Create notification entry ---
      try {
        let isReferral = false;
        const referralId = sessionStorage.getItem("referralId");
        if (referralId && referralId.trim() !== "") {
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
        if (referralId) sessionStorage.removeItem("referralId");
      } catch (notificationError) {
        console.error("Error creating notification:", notificationError);
      }

      // --- Refresh local state ---
      const [fetchedDevices, fetchedAppointments] = await Promise.all([
        deviceApi.getByClientId(client.id),
        appointmentApi.getByClientId(client.id),
      ]);
      setDevices(fetchedDevices);
      setAppointments(fetchedAppointments);

      // Reset forms and loyalty points state
      setNewUnits([]);
      setAdditionalUnits([]);
      setUseLoyaltyPoints(false);
      setLoyaltyPointsDiscount(0);
      
    } catch (err) {
      console.error("Failed to confirm booking:", err);
      toast.error("Failed to confirm booking. Please try again.");
    } finally {
      handleCloseBookingModal();
      handleCloseSummaryModal();
      setTimeout(() => setIsSuccessModalOpen(true), 10);
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

      //  Update global devices state
      setDevices((prevDevices) =>
        prevDevices.map((d) => (d.id === updatedDevice.id ? updatedDevice : d))
      );

      //  Update modalDevices state so the modal reflects changes instantly
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
  const handleOpenDetailsModal = (locationId: UUID, statusType: 'scheduled' | 'due' | 'well-maintained' | 'repair' | 'no-service' | 'voided', serviceName?: string) => {
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

  // --- Additional Units State ---
const [showAdditionalUnits, setShowAdditionalUnits] = useState(false);
const [additionalUnits, setAdditionalUnits] = useState<Array<{
  brand_id: UUID | null;
  ac_type_id: UUID | null;
  horsepower_id: UUID | null;
  quantity: number;
  appointment_date: string;
}>>([]);

const handleAddAdditionalUnit = () => {
  setAdditionalUnits(prev => [...prev, {
    brand_id: null,
    ac_type_id: null,
    horsepower_id: null,
    quantity: 1,
    appointment_date: bookingDate, // default to selected booking date
  }]);
};

  const handleToggleAdditionalUnitsForm = (shouldShow: boolean) => {
    setShowAdditionalUnits(shouldShow);
    if (shouldShow && additionalUnits.length === 0) {
      handleAddAdditionalUnit();
    }
  };

const handleRemoveAdditionalUnit = (index: number) => {
  setAdditionalUnits(prev => prev.filter((_, i) => i !== index));
};

const handleUpdateAdditionalUnit = (index: number, field: string, value: any) => {
  setAdditionalUnits(prev => prev.map((unit, i) =>
    i === index ? { ...unit, [field]: value } : unit
  ));
};

  const { refreshKey } = useRealtime();
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
          setError("Client not found.");
          setIsLoading(false);
          return;
        }

        const [
          fetchedLocations,
          fetchedDevices,
          fetchedAppointments,
          fetchedPoints,
          fetchedReferrals,
          fetchedPointsHistoryResponse,
          redemptionCount
        ] = await Promise.all([
          clientLocationApi.getByClientId(clientId),
          deviceApi.getByClientId(clientId),
          appointmentApi.getByClientId(clientId),
          loyaltyPointsApi.getClientPoints(clientId), 
          loyaltyPointsApi.getReferralCount(clientId),    
          loyaltyPointsApi.getLoyaltyPoints(clientId),
          loyaltyPointsApi.getRedemptionEventCountAccurate(clientId)
        ]);

        
        setClient(fetchedClient);
        setLoyaltyPoints(fetchedPoints);                                  
        setReferralCount(fetchedReferrals);                               
        setLoyaltyPointsHistory(fetchedPointsHistoryResponse.data || []); 
        setRedemptionEventsThisYear(redemptionCount);
        setLocations(fetchedLocations);
        setDevices(fetchedDevices);
        setAppointments(fetchedAppointments);

      } catch (err: any) {
        console.error("Error fetching client dashboard data:", err);
        setError(err.message || "Failed to load client data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientData();
  }, [clientId, refreshKey]);


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
  }, [devices, appointments, refreshKey]);

   const getDeviceCleaningStatus = () => {
      const statusByLocation = new Map<UUID, {
        location: ClientLocation,
        totalDevices: number,
        lastServiceDate: string | null,
        lastCleaningDate: string | null;
        lastRepairDate: string | null,
        serviceGroups: Array<{
          service: Service,
          scheduledDevices: number,
          dueDevices: number, 
          wellMaintainedDevices: number,
          voidedDevices?: number;
          repairDevices: number,
          lastServiceDate: string | null,
          devices: Array<{
            device: Device;
            appointment: Appointment | undefined;
            status: 'scheduled' | 'due' | 'well-maintained' | 'no-service' | 'repair' | 'voided';
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
          lastCleaningDate:  null,
          lastRepairDate:  null,
          serviceGroups: [],
        });
      });

      devices.forEach(device => {
        const locationId = device.location_id;
        if (!locationId) return;
        const locationStatus = statusByLocation.get(locationId);
        if (!locationStatus) return;

        locationStatus.totalDevices++;

        const cleaningService = allServices.find(s => s.name.toLowerCase().includes('clean'));
        if (device.last_cleaning_date && cleaningService) {
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

        const hasLastCleaning = !!device.last_cleaning_date && completedAppts.some(a => {
          const service = allServices.find(s => s.id === a.service_id);
          return service?.name.toLowerCase().includes("clean");
        });
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
                lastServiceDate: null,
                devices: []
              };
              locationStatus.serviceGroups.push(serviceGroup);
            }
            serviceGroup.repairDevices++;
            serviceGroup.devices.push({ device, appointment: appt, status: 'repair', brand, acType, horsepower});
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
                voidedDevices: 0,
                lastServiceDate: null,
                devices: []
              };
              locationStatus.serviceGroups.push(serviceGroup);
            }
            serviceGroup.scheduledDevices++;
            serviceGroup.devices.push({ device, appointment: appt, status: 'scheduled', brand, acType, horsepower });
          });
        } else {
          let deviceStatus: 'scheduled' | 'due' | 'well-maintained' | 'voided' | 'no-service' = 'no-service';
          let serviceToUse: Service | undefined = undefined;
          let appointmentToUse: Appointment | undefined = undefined;

          const voidedAppts = deviceAppointments.filter(a => a.status === 'voided');
          const latestVoidedCleaning = voidedAppts
            .map(appt => ({ appt, service: allServices.find(s => s.id === appt.service_id) }))
            .filter(x => x.service?.name.toLowerCase().includes("clean"));

          const latestCompletedCleaning = completedAppts
            .map(a => ({ appt: a, service: allServices.find(s => s.id === a.service_id) }))
            .filter(x => x.service?.name.toLowerCase().includes("clean"));

          // Merge voided + completed, sort by date, pick latest
          const latestCleaning = [...latestVoidedCleaning, ...latestCompletedCleaning]
            .sort((a, b) => new Date(b.appt.appointment_date).getTime() - new Date(a.appt.appointment_date).getTime())[0];

          if (latestCleaning) {
            if (latestCleaning.appt.status === "voided") {
              deviceStatus = "voided";
            } else {
              deviceStatus = hasDueDates && isDue ? "due" : "well-maintained";
            }
            serviceToUse = latestCleaning.service!;
            appointmentToUse = latestCleaning.appt;
          }

          if (serviceToUse) {
            let serviceGroup = locationStatus.serviceGroups.find(sg => sg.service.id === serviceToUse!.id);
            if (!serviceGroup) {
              serviceGroup = {
                service: serviceToUse,
                scheduledDevices: 0,
                dueDevices: 0,
                wellMaintainedDevices: 0,
                voidedDevices: 0,
                repairDevices: 0,
                lastServiceDate: null,
                devices: []
              };
              locationStatus.serviceGroups.push(serviceGroup);
            }

            if (deviceStatus === 'due') serviceGroup.dueDevices++;
            else if (deviceStatus === 'well-maintained') serviceGroup.wellMaintainedDevices++;
            else if (deviceStatus === 'voided') serviceGroup.voidedDevices = (serviceGroup.voidedDevices || 0) + 1;

            serviceGroup.devices.push({ device, appointment: appointmentToUse, status: deviceStatus, brand, acType, horsepower });
          }
        }
      });

      return Array.from(statusByLocation.values()).map(locationStatus => {
        const allDeviceEntries: any[] = [];
        const uniqueDeviceIds = new Set<string>();
        let totalScheduled = 0;
        let totalDue = 0;
        let totalWellMaintained = 0;
        let totalVoided = 0;

        let lastCleaningDate: string | null = null;

        locationStatus.serviceGroups.forEach(serviceGroup => {
          const isRepair =
            serviceGroup.service.name.toLowerCase().includes('repair') ||
            serviceGroup.service.name.toLowerCase().includes('maintenance');

          // Only consider CLEANING appointments for lastCleaningDate
          if (!isRepair) {
            serviceGroup.devices.forEach(deviceEntry => {
              if (
                deviceEntry.appointment &&
                deviceEntry.appointment.status === "completed" &&
                serviceGroup.service?.name?.toLowerCase().includes("clean")
              ) {
                const candidateDate = deviceEntry.appointment.appointment_date;
                if (candidateDate) {
                  if (!lastCleaningDate || candidateDate > lastCleaningDate) {
                    lastCleaningDate = candidateDate;
                  }
                }
              }
            });
          }

          serviceGroup.lastServiceDate = lastCleaningDate;

          if (isRepair) {
            serviceGroup.devices.forEach(deviceEntry => {
              uniqueDeviceIds.add(deviceEntry.device.id);
              allDeviceEntries.push({ ...deviceEntry, service: serviceGroup.service });
            });
            return;
          }

          totalScheduled += serviceGroup.scheduledDevices;
          totalDue += serviceGroup.dueDevices;
          totalWellMaintained += serviceGroup.wellMaintainedDevices;
          totalVoided += serviceGroup.voidedDevices || 0;

          serviceGroup.devices.forEach(deviceEntry => {
            uniqueDeviceIds.add(deviceEntry.device.id);
            allDeviceEntries.push({ ...deviceEntry, service: serviceGroup.service });
          });
        });

        return {
          location: locationStatus.location,
          totalDevices: uniqueDeviceIds.size,
          scheduledDevices: totalScheduled,
          dueDevices: totalDue,
          wellMaintainedDevices: totalWellMaintained,
          voidedDevices: totalVoided,
          devices: allDeviceEntries,
          serviceGroups: locationStatus.serviceGroups,
          lastCleaningDate: lastCleaningDate,
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
        <Button onClick={() => window.location.reload()} className="mt-4 rounded-lg w-full sm:w-auto rounded-lg border-teal-400 text-teal-600 shadow-md">
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
        <Button onClick={() => window.location.href = '/'} className="mt-4 rounded-lg w-full sm:w-auto rounded-lg border-teal-400 text-teal-600 shadow-md">
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
    
    if (acType.name.toLowerCase() === 'split type' && hpValue > 1.50) {
      surcharge = customSettings.surcharge || 0;
    } else if (acType.name.toLowerCase() === 'u-shaped' && hpValue > 1.50) {
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


    if (client.discounted) {
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

  // Calculate total price for selected devices, new units, and additional units
  const calculateTotalPrice = () => {
    const serviceName = allServices.find(s => s.id === selectedServiceId)?.name?.toLowerCase() || '';
    const isRepair = serviceName.includes('repair');

    // 1. Price for existing selected devices
    const selectedDevicesSubtotal = selectedDevices.reduce((total, deviceId) => {
      const device = devices.find(d => d.id === deviceId);
      if (!device) return total;
      return total + (isRepair ? (customSettings.repairPrice || 0) : calculateDevicePrice(device));
    }, 0);

    // 2. Price for newly added units in the modal
    const newUnitsSubtotal = newUnits.reduce((total, unit) => {
      if (!unit.brand_id || !unit.ac_type_id || !unit.horsepower_id) return total;
      
      if (isRepair) {
        return total + (customSettings.repairPrice || 0) * unit.quantity;
      }

      const acType = allACTypes.find(t => t.id === unit.ac_type_id);
      const horsepower = allHorsepowerOptions.find(h => h.id === unit.horsepower_id);
      if (!acType || !horsepower) return total;

      let basePrice = 0;
      const acTypeName = acType.name.toLowerCase();
      const hpValue = horsepower.value;

      if (acTypeName.includes('split') || acTypeName.includes('u-shaped')) {
        basePrice = customSettings.splitTypePrice;
        if (hpValue > 1.5) basePrice += customSettings.surcharge;
      } else if (acTypeName.includes('window')) {
        basePrice = customSettings.windowTypePrice;
        if (hpValue > 1.5) basePrice += customSettings.surcharge;
      }
      return total + (basePrice * unit.quantity);
    }, 0);
    
    // 3. Price for additional units to existing service
    const additionalUnitsSubtotal = additionalUnits.reduce((total, unit) => {
        if (!unit.brand_id || !unit.ac_type_id || !unit.horsepower_id) return total;

        if (isRepair) {
          return total + (customSettings.repairPrice || 0) * unit.quantity;
        }

        const acType = allACTypes.find((t) => t.id === unit.ac_type_id);
        const horsepower = allHorsepowerOptions.find((h) => h.id === unit.horsepower_id);
        if (!acType || !horsepower) return total;

        let basePrice = 0;
        const acTypeName = acType.name.toLowerCase();
        const hpValue = horsepower.value;

        if (acTypeName.includes("split") || acTypeName.includes("u-shaped")) {
          basePrice = customSettings.splitTypePrice;
          if (hpValue > 1.5) basePrice += customSettings.surcharge;
        } else if (acTypeName.includes("window")) {
          basePrice = customSettings.windowTypePrice;
          if (hpValue > 1.5) basePrice += customSettings.surcharge;
        }

        return total + basePrice * unit.quantity;
      }, 0);


    const subtotal = selectedDevicesSubtotal + newUnitsSubtotal + additionalUnitsSubtotal;

    let discountValue = 0;
    let discountAmount = 0;
    if (!isRepair) {
      const discount = calculateDiscount();
      discountValue = discount.value;
      discountAmount = (subtotal * discount.value) / 100;
    }
    
    const total = subtotal - discountAmount;
    const discount_type = calculateDiscount().type;

    return {
      subtotal,
      discount: discountValue,
      discount_type,
      discountAmount,
      total
    };
  };

  // Calculate total price for additional service devices
  const calculateAdditionalServicePrice = () => {
    const serviceName = allServices.find(s => s.id === additionalServiceId)?.name?.toLowerCase() || '';
    const isRepair = serviceName.includes('repair');

    const perDevicePrice = (device: Device) => {
      if (isRepair) {
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
    if (!isRepair) {
      const discount = calculateDiscount();
      discountValue = discount.value;
      discountAmount = (subtotal * discount.value) / 100;
    }
    const total = subtotal - discountAmount;
    const discount_type = calculateDiscount().type;
    
    return {
      subtotal,
      discount: discountValue,
      discount_type,
      discountAmount,
      total,
    };
  };

  // Add this helper function to calculate loyalty points discount
  const calculateLoyaltyPointsDiscount = (points: number): number => {
    if (points <= 0) return 0;
    
    // New calculation: Only redeem in multiples of 5 points
    // 1 point = ₱100, but can only redeem 5+ points at a time
    const redeemablePoints = Math.floor(points / 5) * 5; // Round down to nearest multiple of 5
    return redeemablePoints * 100; // 1 point = ₱100
  };

  // Add this helper function to check if loyalty points can be used
  const canUseLoyaltyPoints = (): boolean => {
    if (!client || loyaltyPoints <= 0) return false;
    
    // Check if client has friends/family discount (discounted = true)
    if (client.discounted) return false;
    
    return true;
  };

  // Updated checkRedemptionLimit function
  const checkRedemptionLimit = async (): Promise<boolean> => {
    try {
      if (!client) return false;
      
      // Fetch the latest redemption count from database
      const currentRedemptionCount = await loyaltyPointsApi.getRedemptionEventCountAccurate(client.id);
      
      // Update the local state with fresh data
      setRedemptionEventsThisYear(currentRedemptionCount);
      
      console.log(`Current redemption events this year: ${currentRedemptionCount}/3`);
      
      // Check if under the limit
      return currentRedemptionCount < 10000; // Max 3 redemption events per year
    } catch (error) {
      console.error('Error checking redemption limit:', error);
      return false;
    }
  };

  // Add this handler for loyalty points toggle
  const handleLoyaltyPointsToggle = async (checked: boolean) => {
    if (!client) return;
    
    // Check if client has friends/family discount
    if (client.discounted) {
      setShowFriendsDiscountWarning(true);
      return;
    }
    
    if (checked) {
      // Always fetch fresh redemption count from database
      const canRedeem = await checkRedemptionLimit();
      
      if (!canRedeem) {
        // Get the actual count for a more informative message
        const currentCount = await loyaltyPointsApi.getRedemptionEventCountAccurate(client.id);
        alert(`You have already redeemed loyalty points ${currentCount} times this year. Maximum of 3 redemptions per year allowed.`);
        return;
      }
      
      const discount = calculateLoyaltyPointsDiscount(loyaltyPoints);
      setLoyaltyPointsDiscount(discount);
      setUseLoyaltyPoints(true);
    } else {
      setLoyaltyPointsDiscount(0);
      setUseLoyaltyPoints(false);
    }
  };

  // Optional: Add a helper to refresh redemption count periodically
  const refreshRedemptionCount = async () => {
    if (!client) return;
    
    try {
      const updatedCount = await loyaltyPointsApi.getRedemptionEventCountAccurate(client.id);
      setRedemptionEventsThisYear(updatedCount);
    } catch (error) {
      console.error('Error refreshing redemption count:', error);
    }
  };

  const calculateCombinedTotalPriceWithLoyalty = () => {
    const basePricing = calculateCombinedTotalPrice();
    
    let finalTotal = basePricing.total;
    let loyaltyDiscount = 0;
    
    if (useLoyaltyPoints && loyaltyPointsDiscount > 0) {
      loyaltyDiscount = Math.min(loyaltyPointsDiscount, finalTotal); // Can't discount more than total
      finalTotal = Math.max(0, finalTotal - loyaltyDiscount); // Ensure total doesn't go below 0
    }
    
    return {
      ...basePricing,
      loyaltyPointsDiscount: loyaltyDiscount,
      finalTotal: finalTotal
    };
  };

  // Calculate combined total price for both services
  const calculateCombinedTotalPrice = () => {
    const mainPricing = calculateTotalPrice();
    const discount_type = calculateDiscount();
    
    const additionalPricing = showAdditionalService && additionalServiceDevices.length > 0 
      ? calculateAdditionalServicePrice() 
      : { subtotal: 0, discount: 0, discountAmount: 0, total: 0 };
    
    return {
      subtotal: mainPricing.subtotal + additionalPricing.subtotal,
      discount: mainPricing.discount, // Assuming same discount applies, or adjust as needed
      discountAmount: mainPricing.discountAmount + additionalPricing.discountAmount,
      total: mainPricing.total + additionalPricing.total,
      discount_type: discount_type.type
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

  const getServiceIcon = (serviceName: string) => {
    const lowerCaseName = serviceName.toLowerCase();
    if (lowerCaseName.includes('cleaning')) {
      return <SprayCan className="w-5 h-5 mr-2 text-blue-500" />;
    } else if (lowerCaseName.includes('repair')) {
      return <HardHat className="w-5 h-5 mr-2 text-red-500" />;
    } else {
      return <Zap className="w-5 h-5 mr-2 text-yellow-500" />;
    }
  }


  return (
    <>
      <div className="space-y-8">
        <DashboardHeader
          clientName={client.name}
          locationLabel={
            primaryLocation
              ? `${primaryLocation.city_name}, Philippines`
              : "Philippines"
          }
          points={client.points}
          loyaltyPoints={loyaltyPoints}
          onViewProfile={() => onViewProfile()} // ✅ add this
        />

        <StatsOverview referralCount={referralCount} loyaltyPoints={loyaltyPoints} bookingsCount={appointments.length} devicesCount={devices.length} appointments={appointments} />

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
          onEditLocation={openEditLocation}
          onAddLocation={handleOpenLocationModal}
          
        />


       <PointsAppointments
        appointments={appointments}
        deviceIdToAppointmentId={deviceIdToAppointmentId}
        points={client?.points ?? 0}
        pointsExpiry={client?.points_expiry}
        getServiceName={getServiceName}
        clientId={clientId}
        locations={locations}
        devices={devices}
        brands={allBrands}                   
        acTypes={allACTypes}                
        horsepowerOptions={allHorsepowerOptions} 
        onApplyDeviceUpdate={async (id, patch) => {
          const updated = await deviceApi.updateDevice(id, patch);
          return updated;
        }}
        onDeviceUpdated={(updated) => {
          setDevices((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
        }}
        onReferClick={onReferClick}
        allServices={allServices || []}
        loyaltyPointsHistory={loyaltyPointsHistory}
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
        setBookingDate={setBookingDate}
        selectedServiceId={selectedServiceId}
        setSelectedServiceId={setSelectedServiceId}
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
        // 🔽 NEW PROPS
        showAdditionalUnits={showAdditionalUnits}
        setShowAdditionalUnits={handleToggleAdditionalUnitsForm}
        additionalUnits={additionalUnits}
        onAddAdditionalUnit={handleAddAdditionalUnit}
        onRemoveAdditionalUnit={handleRemoveAdditionalUnit}
        onUpdateAdditionalUnit={handleUpdateAdditionalUnit}
        availableBlockedDates={availableBlockedDates}
        onDateBlocked={setShowBlockedDateModal}
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
        onRescheduleAppointment={handleRescheduleAppointment}
        availableBlockedDates={availableBlockedDates}
      />

      {/* NEW: Summary Modal */}
      {isSummaryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] relative flex flex-col">
            <div className="p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
              <button onClick={handleCloseSummaryModal} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 z-10">
                <X className="w-6 h-6" />
              </button>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 pr-8">Booking Summary</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="space-y-4 sm:space-y-6">
                {/* Primary Service */}
                <div className="p-3 sm:p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                  <div className="flex items-start mb-2">
                    {getServiceIcon(allServices.find(s => s.id === selectedServiceId)?.name || 'N/A')}
                    <h3 className="text-base sm:text-lg lg:text-xl font-bold text-blue-800 ml-2 leading-tight">
                      {allServices.find(s => s.id === selectedServiceId)?.name}
                    </h3>
                  </div>
                  <div className="flex items-center text-gray-600 mb-3">
                    <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="font-medium text-gray-700 text-sm sm:text-base">
                      {format(new Date(bookingDate), 'MMMM d, yyyy')}
                    </span>
                  </div>
                  <div className="text-gray-600">
                    <span className="font-bold text-sm sm:text-base block mb-2">Devices:</span>
                    {(selectedDevices.length > 0 || newUnits.length > 0 || additionalUnits.length > 0) ? (
                      <div className="bg-white rounded p-2 max-h-32 sm:max-h-40 overflow-y-auto">
                        <ul className="space-y-1">
                          {selectedDevices.map(deviceId => {
                            const device = devices.find(d => d.id === deviceId);
                            if (!device) return null;
                            const brand = allBrands.find(b => b.id === device.brand_id)?.name || 'N/A';
                            const acType = allACTypes.find(t => t.id === device.ac_type_id)?.name || 'N/A';
                            const horsepower = allHorsepowerOptions.find(h => h.id === device.horsepower_id)?.display_name || 'N/A';
                            return (
                              <li key={`sel-${device.id}`} className="text-xs sm:text-sm text-gray-700 bg-gray-50 p-2 rounded border-l-4 border-blue-400">
                                <div className="font-medium">{device.name}</div>
                                <div className="text-gray-600">{brand} • {acType} • {horsepower}</div>
                              </li>
                            );
                          })}
                          {newUnits.map((unit, index) => {
                            if (!unit.brand_id || !unit.ac_type_id || !unit.horsepower_id) return null;
                            const brand = allBrands.find(b => b.id === unit.brand_id)?.name || 'N/A';
                            const acType = allACTypes.find(t => t.id === unit.ac_type_id)?.name || 'N/A';
                            const horsepower = allHorsepowerOptions.find(h => h.id === unit.horsepower_id)?.display_name || 'N/A';
                            return (
                              <li key={`new-${index}`} className="text-xs sm:text-sm text-gray-700 bg-gray-50 p-2 rounded border-l-4 border-green-400">
                                <div className="font-medium">New Unit (Qty: {unit.quantity})</div>
                                <div className="text-gray-600">{brand} • {acType} • {horsepower}</div>
                              </li>
                            );
                          })}
                          {additionalUnits.map((unit, index) => {
                            if (!unit.brand_id || !unit.ac_type_id || !unit.horsepower_id) return null;
                            const brand = allBrands.find(b => b.id === unit.brand_id)?.name || 'N/A';
                            const acType = allACTypes.find(t => t.id === unit.ac_type_id)?.name || 'N/A';
                            const horsepower = allHorsepowerOptions.find(h => h.id === unit.horsepower_id)?.display_name || 'N/A';
                            return (
                              <li key={`additional-${index}`} className="text-xs sm:text-sm text-gray-700 bg-gray-50 p-2 rounded border-l-4 border-green-400">
                                <div className="font-medium">New Unit (Qty: {unit.quantity})</div>
                                <div className="text-gray-600">{brand} • {acType} • {horsepower}</div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </div>
                </div>

                {/* Additional Service */}
                {showAdditionalService && additionalServiceId && additionalServiceDevices.length > 0 && (
                  <div className="p-3 sm:p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                    <div className="flex items-start mb-2">
                      {getServiceIcon(allServices.find(s => s.id === additionalServiceId)?.name || 'N/A')}
                      <h3 className="text-base sm:text-lg lg:text-xl font-bold text-purple-800 ml-2 leading-tight">
                        {allServices.find(s => s.id === additionalServiceId)?.name}
                      </h3>
                    </div>
                    <div className="flex items-center text-gray-600 mb-3">
                      <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="font-medium text-gray-700 text-sm sm:text-base">
                        {format(new Date(additionalServiceDate), 'MMMM d, yyyy')}
                      </span>
                    </div>
                    <div className="text-gray-600">
                      <span className="font-bold text-sm sm:text-base block mb-2">Devices:</span>
                      <div className="bg-white rounded p-2 max-h-40 overflow-y-auto">
                        <ul className="space-y-1">
                          {additionalServiceDevices.map(deviceId => {
                            const device = devices.find(d => d.id === deviceId);
                            if (!device) return null;
                            const brand = allBrands.find(b => b.id === device.brand_id)?.name || 'N/A';
                            const acType = allACTypes.find(t => t.id === device.ac_type_id)?.name || 'N/A';
                            const horsepower = allHorsepowerOptions.find(h => h.id === device.horsepower_id)?.display_name || 'N/A';
                            return (
                              <li key={device.id} className="text-xs sm:text-sm text-gray-700 bg-gray-50 p-2 rounded border-l-4 border-purple-400">
                                <div className="font-medium">{device.name}</div>
                                <div className="text-gray-600">{brand} • {acType} • {horsepower}</div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Loyalty Points Section */}
                {canUseLoyaltyPoints() && loyaltyPoints >= 5 && (
                  <div className="p-3 sm:p-4 bg-green-50 rounded-lg border-2 border-green-200">
                    <div className="flex flex-col space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 mr-3">
                          <h3 className="text-sm sm:text-base lg:text-lg font-bold text-green-800">Use Presko Reward Points</h3>
                          <p className="text-xs sm:text-sm text-green-600 mt-1">
                            Available: {loyaltyPoints} Presko reward points
                          </p>
                          <p className="text-xs sm:text-sm text-green-600">
                            Can redeem: {Math.floor(loyaltyPoints / 5) * 5} points = ₱{calculateLoyaltyPointsDiscount(loyaltyPoints)} discount
                          </p>
                          {loyaltyPoints % 5 > 0 && (
                            <p className="text-xs text-amber-600 mt-1">
                              {loyaltyPoints % 5} point(s) will remain (minimum 5 points required)
                            </p>
                          )}
                        </div>
                        <Checkbox
                          checked={useLoyaltyPoints}
                          onCheckedChange={handleLoyaltyPointsToggle}
                          className="h-5 w-5 flex-shrink-0"
                        />
                      </div>
                      {useLoyaltyPoints && (
                        <div className="text-xs sm:text-sm text-green-700 bg-green-100 p-3 rounded">
                          <div className="flex items-start">
                            <Star className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                            <div>
                              <div>Using {Math.floor(loyaltyPoints / 5) * 5} loyalty points for ₱{loyaltyPointsDiscount} discount</div>
                              {loyaltyPoints % 5 > 0 && (
                                <div className="text-amber-700 mt-1">
                                  {loyaltyPoints % 5} point(s) remaining in your account
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Friends/Family Discount Warning */}
                {client?.discounted && (
                  <div className="p-3 sm:p-4 bg-amber-50 rounded-lg border-2 border-amber-200">
                    <div className="flex items-start">
                      <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" />
                      <p className="text-xs sm:text-sm text-amber-800">
                        No points for this booking since a friends discount is applied.
                      </p>
                    </div>
                  </div>
                )}

                {/* Price Breakdown */}
                <div className="p-3 sm:p-4 bg-gray-100 rounded-xl">
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-4 text-gray-800">Price Breakdown</h3>
                  {(() => {
                    const pricing = calculateCombinedTotalPriceWithLoyalty();
                    return (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm sm:text-base">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="font-semibold text-gray-800">₱{pricing.subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm sm:text-base">
                          <span className="text-gray-600 flex-1 mr-2">
                            Discount ({pricing.discount}% - {pricing.discount_type}):
                          </span>
                          <span className="font-semibold text-red-600 flex-shrink-0">
                            -₱{pricing.discountAmount.toLocaleString()}
                          </span>
                        </div>
                        {pricing.loyaltyPointsDiscount > 0 && (
                          <div className="flex justify-between items-center text-sm sm:text-base">
                            <span className="text-gray-600 flex-1 mr-2">Presko Rewards Discount:</span>
                            <span className="font-semibold text-green-600 flex-shrink-0">
                              -₱{pricing.loyaltyPointsDiscount.toLocaleString()}
                            </span>
                          </div>
                        )}
                        <div className="border-t-2 border-gray-300 pt-3 mt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-base sm:text-lg lg:text-xl font-extrabold text-gray-800 flex-1 mr-2">
                              Total Amount:
                            </span>
                            <span className="text-base sm:text-lg lg:text-xl font-extrabold text-blue-600 flex-shrink-0">
                              ₱{pricing.finalTotal.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Fixed Footer Buttons */}
            <div className="flex-shrink-0 p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4">
                <Button 
                  onClick={handleCloseSummaryModal} 
                  variant="outline" 
                  className="w-full sm:w-auto rounded-lg border-teal-400 text-teal-600 shadow-md order-2 sm:order-1"
                >
                  Go Back
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleConfirmBooking} 
                  className="w-full sm:w-auto rounded-lg border-teal-400 text-teal-600 shadow-md bg-white hover:bg-white font-bold py-2 px-6 order-1 sm:order-2"
                >
                  Confirm Booking
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Friends/Family Discount Warning Modal */}
      {showFriendsDiscountWarning && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex flex-col items-center space-y-4">
              <AlertCircle className="w-12 h-12 text-amber-500" />
              <h3 className="text-lg font-bold text-gray-800">Cannot Use Points</h3>
              <p className="text-center text-gray-600">
                No points for this booking since a friends discount is applied.
              </p>
              <Button 
                onClick={() => setShowFriendsDiscountWarning(false)} 
                className="w-full rounded-lg border-teal-400 text-teal-600 shadow-md"
                variant="outline"
              >
                OK
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
               <Button variant="outline" onClick={handleCloseSuccessModal} className="w-full rounded-lg w-full rounded-lg border-teal-400 text-teal-600 bg-white hover:bg-white shadow-md">
                 OK
               </Button>
             </div>
           </div>
         </div>
       )}

       {isEditLocationModalOpen && editingLocation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative">
              <h3 className="text-lg font-semibold mb-4">Edit Location</h3>

              <div className="space-y-3">
                {/* Location Name */}
                <div>
                  <label className="block text-sm font-medium mb-1">Location Name</label>
                  <input
                    className="w-full border rounded-md px-3 py-2"
                    value={locationForm.name}
                    onChange={e => setLocationForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>

                {/* Address Line */}
                <div>
                  <label className="block text-sm font-medium mb-1">Address Line</label>
                  <input
                    className="w-full border rounded-md px-3 py-2"
                    value={locationForm.address_line1}
                    onChange={e => setLocationForm(f => ({ ...f, address_line1: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Street</label>
                    <input
                      className="w-full border rounded-md px-3 py-2"
                      value={locationForm.street}
                      onChange={e => setLocationForm(f => ({ ...f, street: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Landmark</label>
                    <input
                      className="w-full border rounded-md px-3 py-2"
                      value={locationForm.landmark}
                      onChange={e => setLocationForm(f => ({ ...f, landmark: e.target.value }))}
                    />
                  </div>
                </div>

                {/* City Selector */}
                <div className="space-y-2 relative">
                  <label className="block text-sm font-medium">City</label>
                  <input
                    type="text"
                    className="w-full border rounded-md px-3 py-2"
                    value={citySearchTerm}
                    onChange={e => {
                      setCitySearchTerm(e.target.value);
                      setIsCityDropdownOpen(true);
                    }}
                    onFocus={() => setIsCityDropdownOpen(true)}
                  />
                  {isCityDropdownOpen && !isFetchingCities && filteredCities.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                      {filteredCities.map(city => (
                        <div
                          key={city.id}
                          className="px-3 py-1.5 hover:bg-gray-100 cursor-pointer"
                          onClick={() => {
                            handleCitySelect(city);
                            setCitySearchTerm(city.name); //  lock in selected name
                            setIsCityDropdownOpen(false);
                          }}
                        >
                          {city.name}
                        </div>
                      ))}
                    </div>
                  )}
                  {isCityDropdownOpen && !isFetchingCities && filteredCities.length === 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-4">
                      {citySearchTerm ? 'No cities found.' : 'Start typing to search for a city.'}
                    </div>
                  )}
                </div>

                {/* Barangay Selector */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Barangay</label>
                  <Select
                    value={locationForm.barangay_id ?? ''}
                    onValueChange={handleBarangaySelect}
                    disabled={!locationForm.city_id}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a barangay" />
                    </SelectTrigger>
                    <SelectContent>
                      {barangays.length > 0 ? (
                        barangays.map(barangay => (
                          <SelectItem key={barangay.id} value={barangay.id}>
                            {barangay.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-barangays-found" disabled>
                          No barangays found
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={closeEditLocation}>Cancel</Button>
                <Button variant="outline" className="rounded-lg w-full sm:w-auto rounded-lg border-teal-400 text-teal-600 shadow-md" onClick={saveEditLocation} disabled={isSavingLocation}>
                  {isSavingLocation ? 'Saving…' : 'Save'}
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
                 className="w-full border-dashed border-2 rounded-lg w-full sm:w-auto rounded-lg border-teal-400 text-teal-600 shadow-md py-4"
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
                       if (hpValue > 1.5) {
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
                   variant="outline"
                   className="rounded-lg w-full sm:w-auto rounded-lg border-teal-400 text-teal-600 shadow-md"
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