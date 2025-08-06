import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Client, ClientLocation, Device, Appointment, UUID, Service, DateString, BlockedDate, ParsedCustomSettings, Brand, ACType, HorsepowerOption } from '../../../types/database' // Adjusted import path

export interface BookingDevice { 
  brand_id: UUID | null; // Changed to allow null
  ac_type_id: UUID | null; // Changed to allow null
  horsepower_id: UUID | null; // Changed to allow null
  quantity: number;
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
    selectedDevices: Device[]; // Existing devices selected for service
    newDevices: BookingDevice[]; // New devices to be added
    appointmentDate: DateString | null;
    totalAmount: number;
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
    removeDevice: (state, action: PayloadAction<UUID>) => {
      state.devices = state.devices.filter(device => device.id !== action.payload)
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
    toggleSelectedDevice: (state, action: PayloadAction<Device>) => {
      const index = state.booking.selectedDevices.findIndex(d => d.id === action.payload.id);
      if (index !== -1) {
        state.booking.selectedDevices.splice(index, 1);
      } else {
        state.booking.selectedDevices.push(action.payload);
      }
    },
    // New action to select/deselect all existing devices
    toggleSelectAllExistingDevices: (state, action: PayloadAction<boolean>) => {
      if (action.payload) {
        // Select all devices
        state.booking.selectedDevices = [...state.devices];
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
  removeDevice,
  clearClientData,
  // New booking flow actions
  setAvailableServices,
  setSelectedBookingService,
  toggleSelectedDevice,
  toggleSelectAllExistingDevices, // Export the new action
  addNewDevice,
  removeNewDevice,
  updateNewDeviceProperty,
  setBookingAppointmentDate,
  setBookingTotalAmount,
  setBookingResources,
  resetClientBooking,
} = clientSlice.actions

export default clientSlice.reducer
