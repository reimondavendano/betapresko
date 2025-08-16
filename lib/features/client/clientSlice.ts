// clientSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Client, ClientLocation, Device, Appointment, UUID, Service, DateString, BlockedDate, ParsedCustomSettings, Brand, ACType, HorsepowerOption } from '../../../types/database' // Adjusted import path

export interface BookingDevice { 
  brand_id: UUID | null; // Changed to allow null
  ac_type_id: UUID | null; // Changed to allow null
  horsepower_id: UUID | null; // Changed to allow null
  quantity: number;
  location_id?: UUID | null;
}

// Define a new type for a device to be booked, which includes its assigned location
interface BookedClientDevice extends Device {
  location_id: UUID;
}

interface ClientState {
  currentClient: Client | null;
  locations: ClientLocation[];
  devices: Device[];
  appointments: Appointment[];
  loading: boolean;
  error: string | null;

  // New booking flow state for the client panel
  booking: {
    selectedService: Service | null;
    selectedDevices: BookedClientDevice[]; // Existing devices selected for service
    newDevices: BookingDevice[]; // New devices to be added
    appointmentDate: DateString | null;
    
    totalAmount: number;
    totalUnits: number; // Added new property for total units
    availableServices: Service[];
    availableBrands: Brand[];
    availableACTypes: ACType[];
    availableHorsepowerOptions: HorsepowerOption[];
    availableBlockedDates: BlockedDate[];
    customPricingSettings: ParsedCustomSettings;
  };
}

const initialState: ClientState = {
  currentClient: null,
  locations: [],
  devices: [],
  appointments: [],
  loading: false,
  error: null,

  booking: {
    selectedService: null,
    selectedDevices: [],
    newDevices: [],
    appointmentDate: null,
    totalAmount: 0,
    totalUnits: 0, // Initialized new property
    availableServices: [],
    availableBrands: [],
    availableACTypes: [],
    availableHorsepowerOptions: [],
    availableBlockedDates: [],
    customPricingSettings: {
      splitTypePrice: 0,
      windowTypePrice: 0,
      surcharge: 0,
      discount: 0,
      familyDiscount: 0,
      repairPrice: 0
    },
  },
}

const clientSlice = createSlice({
  name: 'client',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
    
    setCurrentClient: (state, action: PayloadAction<Client | null>) => {
      state.currentClient = action.payload
    },
    setLocations: (state, action: PayloadAction<ClientLocation[]>) => {
      state.locations = action.payload
    },
    setDevices: (state, action: PayloadAction<Device[]>) => {
      state.devices = action.payload
    },
    setAppointments: (state, action: PayloadAction<Appointment[]>) => {
      state.appointments = action.payload
    },
    addLocation: (state, action: PayloadAction<ClientLocation>) => {
      state.locations.push(action.payload)
    },
    updateLocation: (state, action: PayloadAction<ClientLocation>) => {
      const index = state.locations.findIndex(loc => loc.id === action.payload.id)
      if (index !== -1) {
        state.locations[index] = action.payload
      }
    },
    removeLocation: (state, action: PayloadAction<UUID>) => {
      state.locations = state.locations.filter(loc => loc.id !== action.payload)
    },
    addDevice: (state, action: PayloadAction<Device>) => {
      state.devices.push(action.payload)
    },
    updateDevice: (state, action: PayloadAction<Device>) => {
      const index = state.devices.findIndex(device => device.id === action.payload.id)
      if (index !== -1) {
        state.devices[index] = action.payload
      }
    },
    updateDeviceLocation: (state, action: PayloadAction<{ deviceId: UUID; locationId: UUID }>) => {
      const { deviceId, locationId } = action.payload;
      const deviceIndex = state.devices.findIndex(device => device.id === deviceId);
      if (deviceIndex !== -1) {
        state.devices[deviceIndex].location_id = locationId;
        state.devices[deviceIndex].updated_at = new Date().toISOString();
      }
    },
        // New reducer to update the location of multiple devices
    updateDevicesLocations: (state, action: PayloadAction<{ deviceIds: UUID[], locationId: UUID }>) => {
      const { deviceIds, locationId } = action.payload;
      state.devices = state.devices.map(device => 
        deviceIds.includes(device.id) ? { ...device, location_id: locationId } : device
      );
    },
    removeDevice: (state, action: PayloadAction<UUID>) => {
      state.devices = state.devices.filter(device => device.id !== action.payload)
    },
    setTotalUnits: (state, action: PayloadAction<number>) => {
      state.booking.totalUnits = action.payload;
    },
    setBookingDevices: (state, action: PayloadAction<{ selectedDevices: BookedClientDevice[]; newDevices: BookingDevice[] }>) => {
      state.booking.selectedDevices = action.payload.selectedDevices;
      state.booking.newDevices = action.payload.newDevices;
    },
    clearClientData: (state) => {
      state.currentClient = null;
      state.locations = [];
      state.devices = [];
      state.appointments = [];
      state.loading = false;
      state.error = null;
      state.booking = initialState.booking; // Reset booking state as well
    },
    // New reducers for client panel booking flow
    setAvailableServices: (state, action: PayloadAction<Service[]>) => {
      state.booking.availableServices = action.payload;
    },
    setSelectedBookingService: (state, action: PayloadAction<Service | null>) => {
      state.booking.selectedService = action.payload;
    },
    toggleSelectedDevice: (state, action: PayloadAction<{ device: Device; locationId: UUID }>) => {
      const { device, locationId } = action.payload;
      const index = state.booking.selectedDevices.findIndex(d => d.id === device.id);
      if (index !== -1) {
        // If the device is already selected, remove it.
        state.booking.selectedDevices.splice(index, 1);
      } else {
        // If the device is not selected, add it with the locationId.
        state.booking.selectedDevices.push({
          ...device,
          location_id: locationId,
        });
      }
    },
    updateSelectedDeviceLocation: (state, action: PayloadAction<{ deviceId: UUID; locationId: UUID }>) => {
      const { deviceId, locationId } = action.payload;
      const device = state.booking.selectedDevices.find(d => d.id === deviceId);
      if (device) {
        device.location_id = locationId;
      }
    },
    // New action to select/deselect all existing devices
    toggleSelectAllExistingDevices: (state, action: PayloadAction<boolean>) => {
      if (action.payload) {
        // Select all devices and use each device's actual location or fall back to primary location
        const primaryLocation = state.locations.find(loc => loc.is_primary);
        const primaryLocationId = primaryLocation?.id || state.locations[0]?.id || null;
        
        if (primaryLocationId || state.devices.some(device => device.location_id)) {
          state.booking.selectedDevices = state.devices
            .filter(device => device.location_id || primaryLocationId) // Only include devices with valid location
            .map(device => ({
              ...device,
              location_id: device.location_id || primaryLocationId!,
            }));
        } else {
          state.booking.selectedDevices = [];
        }
      } else {
        // Deselect all devices
        state.booking.selectedDevices = [];
      }
    },
    addNewDevice: (state, action: PayloadAction<BookingDevice>) => {
      state.booking.newDevices.push(action.payload);
    },
    removeNewDevice: (state, action: PayloadAction<number>) => {
      state.booking.newDevices.splice(action.payload, 1);
    },
    // New reducer to update a property of a specific new device
    updateNewDeviceProperty: (state, action: PayloadAction<{ index: number; field: keyof BookingDevice; value: UUID | number | null }>) => {
      const { index, field, value } = action.payload;
      if (state.booking.newDevices[index]) {
        // Ensure immutability by creating a new object for the updated device
        state.booking.newDevices[index] = {
          ...state.booking.newDevices[index],
          [field]: value,
        };
      }
    },
    setBookingAppointmentDate: (state, action: PayloadAction<DateString | null>) => {
      state.booking.appointmentDate = action.payload;
    },
    setBookingTotalAmount: (state, action: PayloadAction<number>) => {
      state.booking.totalAmount = action.payload;
    },
    setBookingResources: (state, action: PayloadAction<{
      brands: Brand[];
      acTypes: ACType[];
      horsepowers: HorsepowerOption[];
      blockedDates: BlockedDate[];
      customSettings: ParsedCustomSettings;
    }>) => {
      state.booking.availableBrands = action.payload.brands;
      state.booking.availableACTypes = action.payload.acTypes;
      state.booking.availableHorsepowerOptions = action.payload.horsepowers;
      state.booking.availableBlockedDates = action.payload.blockedDates;
      state.booking.customPricingSettings = action.payload.customSettings;
    },
    resetClientBooking: (state) => {
      state.booking = initialState.booking;
    },
  },
})

export const {
  setLoading,
  setError,
  setCurrentClient,
  setLocations,
  setDevices,
  setAppointments,
  addLocation,
  updateLocation,
  removeLocation,
  addDevice,
  updateDevice,
  updateDeviceLocation,
  updateDevicesLocations,
  removeDevice,
  clearClientData,
  // New booking flow actions
  setAvailableServices,
  setSelectedBookingService,
  toggleSelectedDevice,
  updateSelectedDeviceLocation,
  toggleSelectAllExistingDevices, // Export the new action
  addNewDevice,
  setTotalUnits,
  setBookingDevices,
  removeNewDevice,
  updateNewDeviceProperty,
  setBookingAppointmentDate,
  setBookingTotalAmount,
  setBookingResources,
  resetClientBooking,
} = clientSlice.actions

export default clientSlice.reducer