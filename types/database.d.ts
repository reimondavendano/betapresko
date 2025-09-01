// types/database.d.ts

// Common types
type UUID = string;
type Timestamp = string; // ISO 8601 string, e.g., "2024-08-06T10:00:00Z"
type DateString = string; // YYYY-MM-DD format
type TimeString = string; // HH:MM AM/PM format


export interface Service {
  id: UUID;
  name: string;
  description: string | null;
  base_price: number; // decimal(10,2) in SQL maps to number in TS
  is_active: boolean;
  set_inactive: boolean;
  created_at: Timestamp;
}

export interface Brand {
  id: UUID;
  name: string;
  is_active: boolean;
  created_at: Timestamp;
}

export interface ACType {
  id: UUID;
  name: string;
  // Removed 'price' field as pricing will now come from custom_settings
  is_active: boolean;
  created_at: Timestamp;
}

export interface HorsepowerOption {
  id: UUID;
  value: number; // decimal(3,2) in SQL maps to number in TS
  display_name: string;
  is_active: boolean;
  created_at: Timestamp;
}

export interface Client {
  id: UUID;
  name: string;
  mobile: string;
  email: string | null;
  points: number;
  points_expiry: DateString | null;
  discounted: boolean;
  sms_opt_in: boolean;
  ref_id: string | null;
  qr_code: string; // GENERATED ALWAYS as text
  created_at: Timestamp;
  updated_at: Timestamp;
}

// New: Interface for the 'cities' table
export interface City {
  id: UUID;
  name: string;
  province: string;
  created_at: Timestamp;
}

// New: Interface for the 'barangays' table
export interface Barangay {
  id: UUID;
  city_id: UUID; // Foreign key to the cities table
  name: string;
  is_set: boolean; // Indicates if this barangay is part of the service area
  created_at: Timestamp;
}

export interface ClientLocation {
  id: UUID;
  client_id: UUID;
  name: string;
  is_primary: boolean;
  address_line1: string | null;
  street: string | null;
  barangay_id: UUID | null; // Updated to reference barangays(id)
  barangay_name: string | null; // Added for front-end convenience
  city_id: UUID | null; // Updated to reference cities(id)
  city_name: string | null; // Added for front-end convenience
  landmark: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export type DeviceWithLocation = Device & {
  client_locations?: {
    id: string;
    address_line1: string | null;
    street: string | null;
    landmark: string | null;
    barangays?: { id: string; name: string } | null;
    cities?: { id: string; name: string } | null;
  } | null;
};

export type ClientLocationWithDetails = ClientLocation & {
  barangays?: { id: string; name: string } | null;
  cities?: { id: string; name: string } | null;
};


export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'voided';

export interface Appointment {
  id: UUID;
  client_id: UUID;
  location_id: UUID;
  service_id: UUID;
  appointment_date: DateString;
  appointment_time: TimeString | null;
  status: AppointmentStatus;
  amount: number; // decimal(10,2) in SQL maps to number in TS
  stored_discount: number;
  discount_type: string; // New field to capture discount type
  total_units: number;
  notes: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Device {
  id: UUID;
  client_id: UUID;
  location_id: UUID;
  name: string; // Added 'name' field for unique identifier
  brand_id: UUID | null;
  ac_type_id: UUID | null;
  horsepower_id: UUID | null;
  last_cleaning_date: DateString | null;
  last_repair_date: DateString | null;
  due_3_months: DateString | null; // GENERATED ALWAYS AS date
  due_4_months: DateString | null; // GENERATED ALWAYS AS date
  due_6_months: DateString | null; // GENERATED ALWAYS AS date
  created_at: Timestamp;
  updated_at: Timestamp;
}

// New: appointment_devices join table
export interface AppointmentDevice {
  id: UUID;
  appointment_id: UUID;
  device_id: UUID;
}

// New: Interface for device_history table
export interface DeviceHistory {
  id: UUID; // Primary key for the history record
  device_id: UUID; // Foreign key to the devices table
  appointment_id: UUID; // Foreign key to the appointments table
  service_date: DateString; // Date when the service was performed
  service_type_id: UUID; // Foreign key to the services table (e.g., Cleaning, Repair)
  notes: string | null;
  created_at: Timestamp;
}

// New: Interface for the notifications table
export interface Notification {
  id: UUID;
  client_id: UUID;
  send_to_admin: boolean;
  send_to_client: boolean;
  is_referral: boolean;
  date: DateString;
  created_at: Timestamp;
}

export interface BlockedDate {
  id: UUID;
  name: string;
  from_date: DateString;
  to_date: DateString;
  reason: string | null;
  created_at: Timestamp;
}

export interface CustomSetting {
  id: UUID;
  setting_category: string;
  setting_key: string;
  setting_value: string | null;
  setting_type: string;
  description: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// New: Parsed structure for custom pricing settings
export interface ParsedCustomSettings {
  splitTypePrice: number;
  windowTypePrice: number;
  surcharge: number;
  discount: number;
  familyDiscount: number;
  repairPrice: number;
}

export interface AdminUser {
  id: UUID;
  username: string;
  email: string;
  password_hash: string;
  role: string;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// Dashboard Analytics Types
export interface DashboardStats {
  totalSales: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  bookingStatusBreakdown: {
    pending: number;
    confirmed: number;
    completed: number;
    voided: number;
  };
  devicesData: {
    dueWithin30Days: number;
    churnRisk: number;
  };
  clientStats: {
    newThisMonth: number;
    returningClients: number;
  };
}

export interface MonthlySalesData {
  month: string;
  sales: number;
  bookings: number;
}

export interface UpcomingAppointment {
  id: UUID;
  client_name: string;
  client_mobile: string;
  appointment_date: DateString;
  appointment_time: TimeString | null;
  service_name: string;
  location_name: string;
  amount: number;
}



export interface TopClient {
  id: UUID;
  name: string;
  mobile: string;
  totalSpend: number;
  appointmentCount: number;
}

export interface ClientsByArea {
  area: string;
  city: string;
  clientCount: number;
  totalRevenue: number;
}

export interface DeviceDueSoon {
  id: UUID;
  name: string;
  client_name: string;
  location_name: string;
  brand_name?: string;
  ac_type_name?: string;
  due_date: DateString;
  due_type: '3_months' | '4_months' | '6_months';
}

export interface ForecastData {
  month: string;
  projectedRevenue: number;
  projectedBookings: number;
  devicesScheduled: number;
}

export interface ChurnRiskClient {
  id: UUID;
  name: string;
  mobile: string;
  deviceCount: number;
  lastAppointment: DateString | null;
  daysSinceLastAppointment: number;
}


export interface ReturnClient {
  id: string;
  name: string;
  mobile: string;
  count: number;
}


// Pagination interface
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface LoyaltyPoint {
  id: string;
  points: number;
  status: string;
  date_earned: string;
  date_expiry: string | null;

  clients?: {
    id: string;
    name: string;
  };

  client_locations?: {
    id: string;
    name: string;
    address_line1: string;
    barangays?: { name: string };
    cities?: { name: string };
  };

  appointments?: {
    id: string;
    service_id: string;
    services?: { name: string };
    appointment_devices?: {
      devices?: {
        id: string;
        name: string;
        brands?: { name: string };
        ac_types?: { name: string };
        horsepower_options?: { display_name: string };
      };
    }[];
  };
}



// Extended appointment type with related data for admin view
export interface AppointmentWithDetails extends Appointment {
  clients?: {
    id: string;
    name: string;
    mobile: string;
    email: string;
  };
  services?: {
    id: string;
    name: string;
    description: string | null;
    base_price: number;
  };
  client_locations?: {
    id: string;
    name: string;
    address_line1: string | null;
    street: string | null;
    barangay_id: UUID | null;
    city_id: UUID | null;
    cities?: { name: string; province: string } | null;
    barangays?: { name: string } | null;
  };
  appointment_devices?: Array<{
    id: string;
    device_id: string;
    devices?: {
      id: string;
      name: string;
      last_cleaning_date: DateString | null;
      due_3_months: DateString | null;
      due_4_months: DateString | null;
      due_6_months: DateString | null;
      brands?: { name: string } | null;
      horsepower_options?: { value: number; display_name: string } | null;
      ac_types?: { name: string } | null;
    };
  }>;
}

// Supabase Database Type Definition
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      services: {
        Row: Service
        Insert: Omit<Service, 'id' | 'created_at'>
        Update: Partial<Omit<Service, 'id' | 'created_at'>>
      }
      brands: {
        Row: Brand
        Insert: Omit<Brand, 'id' | 'created_at'>
        Update: Partial<Omit<Brand, 'id' | 'created_at'>>
      }
      ac_types: { // Assuming your table name is 'ac_types'
        Row: ACType
        Insert: Omit<ACType, 'id' | 'created_at'>
        Update: Partial<Omit<ACType, 'id' | 'created_at'> >
      }
      horsepower_options: { // Assuming your table name is 'horsepower_options'
        Row: HorsepowerOption
        Insert: Omit<HorsepowerOption, 'id' | 'created_at'>
        Update: Partial<Omit<HorsepowerOption, 'id' | 'created_at'>>
      }
      clients: {
        Row: Client
        Insert: Omit<Client, 'id' | 'created_at' | 'updated_at' | 'qr_code'> // Omit generated fields
        Update: Partial<Omit<Client, 'id' | 'created_at' | 'updated_at' | 'qr_code'>>
      }
      cities: {
        Row: City
        Insert: Omit<City, 'id' | 'created_at'>
        Update: Partial<Omit<City, 'id' | 'created_at'>>
      }
      barangays: {
        Row: Barangay
        Insert: Omit<Barangay, 'id' | 'created_at'>
        Update: Partial<Omit<Barangay, 'id' | 'created_at'>>
      }
      client_locations: { // Assuming your table name is 'client_locations'
        Row: ClientLocation
        Insert: Omit<ClientLocation, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ClientLocation, 'id' | 'created_at' | 'updated_at'>>
      }
      appointments: {
        Row: Appointment
        Insert: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Appointment, 'id' | 'created_at' | 'updated_at'>>
      }
      devices: {
        Row: Device
        Insert: Omit<Device, 'id' | 'created_at' | 'updated_at' | 'due_3_months' | 'due_4_months' | 'due_6_months'>
        Update: Partial<Omit<Device, 'id' | 'created_at' | 'updated_at' | 'due_3_months' | 'due_4_months' | 'due_6_months'>>
      }
      appointment_devices: {
        Row: AppointmentDevice;
        Insert: Omit<AppointmentDevice, 'id'>;
        Update: Partial<Omit<AppointmentDevice, 'id'>>;
      }
      device_history: { // New: Table for device history
        Row: DeviceHistory;
        Insert: Omit<DeviceHistory, 'id' | 'created_at'>;
        Update: Partial<Omit<DeviceHistory, 'id' | 'created_at'>>;
      }
      blocked_dates: {
        Row: BlockedDate
        Insert: Omit<BlockedDate, 'id' | 'created_at'>
        Update: Partial<Omit<BlockedDate, 'id' | 'created_at'>>
      }
      custom_settings: { // Assuming your table name is 'custom_settings'
        Row: CustomSetting
        Insert: Omit<CustomSetting, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<CustomSetting, 'id' | 'created_at' | 'updated_at'>>
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'id' | 'created_at'>
        Update: Partial<Omit<Notification, 'id' | 'created_at'>>
      }
      admin_users: {
        Row: AdminUser
        Insert: Omit<AdminUser, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<AdminUser, 'id' | 'created_at' | 'updated_at'>>
      }
      // Add other tables here following the same pattern
    }
    Views: {
      // Add views here if you have any
    }
    Functions: {
      // Add stored procedures/functions here if you have any
    }
    Enums: {
      // Add enums here if you have any
    }
    CompositeTypes: {
      // Add composite types here if you have any
    }
  }
}
