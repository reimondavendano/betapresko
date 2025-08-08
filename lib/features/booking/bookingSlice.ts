// src/lib/features/booking/bookingSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Service, Brand, ACType, HorsepowerOption, BlockedDate, UUID, DateString, ParsedCustomSettings } from '../../../types/database';

export interface BookingDevice { 
  id?: UUID; 
  brand_id: UUID;
  ac_type_id: UUID;
  horsepower_id: UUID;
  quantity: number;
}

interface BookingState {
  step: number;
  selectedService: Service | null;
  selectedDevices: BookingDevice[];
  clientInfo: {
    name: string;
    mobile: string;
    email: string;
  };
  locationInfo: {
    name: string;
    address_line1: string;
    street: string;
    landmark: string;
    city: string;
    barangay: string;
    is_primary: boolean;
  };
  locationMethod: 'manual' | 'current';
  appointmentDate: DateString | null;
  appointmentTime: string | null;
  totalAmount: number;
  isExistingClient: boolean;
  clientId: UUID | null;
  
  availableBrands: Brand[];
  availableACTypes: ACType[];
  availableHorsepowerOptions: HorsepowerOption[];
  discount: number;
  availableBlockedDates: BlockedDate[];
  
  customPricingSettings: ParsedCustomSettings; 
}

const initialState: BookingState = {
  step: 1,
  selectedService: null,
  selectedDevices: [],
  clientInfo: {
    name: '',
    mobile: '',
    email: '',
  },
  locationInfo: {
    name: 'My House',
    address_line1: '',
    street: '',
    landmark: '',
    city: '',
    barangay: '',
    is_primary: false,
  },
  locationMethod: 'manual',
  appointmentDate: null,
  appointmentTime: null,
  totalAmount: 0,
  isExistingClient: false,
  clientId: null,
  
  availableBrands: [],
  availableACTypes: [],
  availableHorsepowerOptions: [],
  discount: 0,
  availableBlockedDates: [],
  
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
    setAppointmentTime: (state, action: PayloadAction<string | null>) => {
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
    resetBooking: () => initialState,
    setLocationMethod: (state, action: PayloadAction<'manual' | 'current'>) => {
      state.locationMethod = action.payload;
    },
    setAvailableBrands: (state, action: PayloadAction<Brand[]>) => {
      state.availableBrands = action.payload;
    },
    setAvailableACTypes: (state, action: PayloadAction<ACType[]>) => {
      state.availableACTypes = action.payload;
    },
    setAvailableHorsepowerOptions: (state, action: PayloadAction<HorsepowerOption[]>) => {
      state.availableHorsepowerOptions = action.payload;
    },
    setDiscount: (state, action: PayloadAction<number>) => {
      state.discount = action.payload;
    },
    setAvailableBlockedDates: (state, action: PayloadAction<BlockedDate[]>) => {
      state.availableBlockedDates = action.payload;
    },
    setCustomPricingSettings: (state, action: PayloadAction<ParsedCustomSettings>) => {
      state.customPricingSettings = action.payload;
      state.discount = action.payload.discount;
    },
  },
});

export const {
  setStep,
  setSelectedService,
  setSelectedDevices,
  addDevice,
  removeDevice,
  updateDevice,
  setClientInfo,
  setLocationInfo,
  setAppointmentDate,
  setAppointmentTime,
  setTotalAmount,
  setIsExistingClient,
  setClientId,
  resetBooking,
  setLocationMethod,
  setAvailableBrands,
  setAvailableACTypes,
  setAvailableHorsepowerOptions,
  setDiscount,
  setAvailableBlockedDates,
  setCustomPricingSettings,
} = bookingSlice.actions;

export default bookingSlice.reducer;
