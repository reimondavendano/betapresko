// src/lib/features/booking/bookingSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { City, Barangay, Service, Brand, ACType, HorsepowerOption, BlockedDate, UUID, DateString, ParsedCustomSettings } from '../../../types/database'; // Added ParsedCustomSettings and BlockedDate

export interface BookingDevice { // Exported the interface
  id?: UUID; // Make the ID optional, will be present for existing devices
  brand_id: UUID;
  ac_type_id: UUID;
  horsepower_id: UUID;
  quantity: number;
}

interface BookingState {
  step: number;
  selectedCity: City | null;
  selectedBarangay: Barangay | null;
  selectedService: Service | null;
  selectedDevices: BookingDevice[];
  clientInfo: {
    name: string;
    mobile: string;
    email: string; // Added email field
  };
  locationInfo: {
    name: string;
    address_line1: string;
    street: string;
    landmark: string;
  };
  appointmentDate: DateString | null;
  appointmentTime: string | null; // Added appointmentTime
  totalAmount: number; // This will now represent the final total after discount
  isExistingClient: boolean;
  clientId: UUID | null;
  
  availableBrands: Brand[];
  availableACTypes: ACType[];
  availableHorsepowerOptions: HorsepowerOption[];
  discount: number; // New: To store the discount value
  availableBlockedDates: BlockedDate[]; // Added for blocked dates
  
  // New: Custom pricing settings from database
  customPricingSettings: ParsedCustomSettings; 
}

const initialState: BookingState = {
  step: 1,
  selectedCity: null,
  selectedBarangay: null,
  selectedService: null,
  selectedDevices: [],
  clientInfo: {
    name: '',
    mobile: '',
    email: '', // Initialize email
  },
  locationInfo: {
    name: 'My House',
    address_line1: '',
    street: '',
    landmark: '',
  },
  appointmentDate: null,
  appointmentTime: null, // Initialize appointmentTime
  totalAmount: 0,
  isExistingClient: false,
  clientId: null,
  
  availableBrands: [],
  availableACTypes: [],
  availableHorsepowerOptions: [],
  discount: 0, // Default discount
  availableBlockedDates: [], // Initialize blocked dates
  
  // Initialize customPricingSettings with default values to avoid errors before fetching
  customPricingSettings: {
    splitTypePrice: 0,
    windowTypePrice: 0,
    surcharge: 0,
    discount: 0,
  },
};

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setStep: (state, action: PayloadAction<number>) => {
      state.step = action.payload;
    },
    setSelectedCity: (state, action: PayloadAction<City | null>) => {
      state.selectedCity = action.payload;
      state.selectedBarangay = null;
    },
    setSelectedBarangay: (state, action: PayloadAction<Barangay | null>) => {
      state.selectedBarangay = action.payload;
    },
    setSelectedService: (state, action: PayloadAction<Service | null>) => {
      state.selectedService = action.payload;
    },
    setSelectedDevices: (state, action: PayloadAction<BookingDevice[]>) => {
      state.selectedDevices = action.payload;
    },
    addDevice: (state, action: PayloadAction<BookingDevice>) => {
      state.selectedDevices.push(action.payload);
    },
    removeDevice: (state, action: PayloadAction<number>) => {
      state.selectedDevices.splice(action.payload, 1);
    },
    updateDevice: (state, action: PayloadAction<{ index: number; device: BookingDevice }>) => {
      state.selectedDevices[action.payload.index] = action.payload.device;
    },
    setClientInfo: (state, action: PayloadAction<Partial<BookingState['clientInfo']>>) => {
      state.clientInfo = { ...state.clientInfo, ...action.payload };
    },
    setLocationInfo: (state, action: PayloadAction<Partial<BookingState['locationInfo']>>) => {
      state.locationInfo = { ...state.locationInfo, ...action.payload };
    },
    setAppointmentDate: (state, action: PayloadAction<DateString | null>) => {
      state.appointmentDate = action.payload;
    },
    setAppointmentTime: (state, action: PayloadAction<string | null>) => { // New reducer for time
      state.appointmentTime = action.payload;
    },
    setTotalAmount: (state, action: PayloadAction<number>) => {
      state.totalAmount = action.payload;
    },
    setIsExistingClient: (state, action: PayloadAction<boolean>) => {
      state.isExistingClient = action.payload;
    },
    setClientId: (state, action: PayloadAction<UUID | null>) => {
      state.clientId = action.payload;
    },
    // Removed setSelectedLocationId
    resetBooking: () => initialState,

    setAvailableBrands: (state, action: PayloadAction<Brand[]>) => {
      state.availableBrands = action.payload;
    },
    setAvailableACTypes: (state, action: PayloadAction<ACType[]>) => {
      state.availableACTypes = action.payload;
    },
    setAvailableHorsepowerOptions: (state, action: PayloadAction<HorsepowerOption[]>) => {
      state.availableHorsepowerOptions = action.payload;
    },
    setDiscount: (state, action: PayloadAction<number>) => { // New reducer for discount
      state.discount = action.payload;
    },
    setAvailableBlockedDates: (state, action: PayloadAction<BlockedDate[]>) => { // New reducer
      state.availableBlockedDates = action.payload;
    },
    // New reducer to set all custom pricing settings
    setCustomPricingSettings: (state, action: PayloadAction<ParsedCustomSettings>) => {
      state.customPricingSettings = action.payload;
      // Also update the discount in the main state for backward compatibility if needed
      state.discount = action.payload.discount;
    },
  },
});

export const {
  setStep,
  setSelectedCity,
  setSelectedBarangay,
  setSelectedService,
  setSelectedDevices,
  addDevice,
  removeDevice,
  updateDevice,
  setClientInfo,
  setLocationInfo,
  setAppointmentDate,
  setAppointmentTime, // Export new action
  setTotalAmount,
  setIsExistingClient,
  setClientId,
  // Removed setSelectedLocationId
  resetBooking,
  setAvailableBrands,
  setAvailableACTypes,
  setAvailableHorsepowerOptions,
  setDiscount, // Export new action
  setAvailableBlockedDates, // Export new action
  setCustomPricingSettings, // Export new action
} = bookingSlice.actions;

export default bookingSlice.reducer;
