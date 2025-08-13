/*
  # Aircon Booking System Database Schema

  1. New Tables
    - `clients` - Customer information with points system
    - `client_locations` - Customer addresses and locations
    - `services` - Available services (cleaning, repair, etc.)
    - `cities` - Cities in Bulacan
    - `barangays` - Barangays under each city
    - `brands` - AC brands
    - `ac_types` - AC types (Split, Window, etc.)
    - `horsepower_options` - Available horsepower options
    - `appointments` - Service appointments
    - `devices` - AC units owned by clients
    - `blocked_dates` - Unavailable booking dates
    - `booking_settings` - System configuration and SMS settings
    - `admin_users` - Admin accounts

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users and admin access
    - Public access for booking flow tables

  3. Features
    - Points system for clients
    - QR code generation
    - SMS notifications
    - Dynamic pricing
    - Location-based services
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cities table
CREATE TABLE IF NOT EXISTS cities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  province text DEFAULT 'Bulacan',
  created_at timestamptz DEFAULT now()
);

-- Barangays table
CREATE TABLE IF NOT EXISTS barangays (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id uuid REFERENCES cities(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Services table
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  base_price decimal(10,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Brands table
CREATE TABLE IF NOT EXISTS brands (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- AC Types table
CREATE TABLE IF NOT EXISTS ac_types (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  price decimal(10,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Horsepower options table
CREATE TABLE IF NOT EXISTS horsepower_options (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  value decimal(3,2) NOT NULL,
  display_name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  mobile text UNIQUE NOT NULL,
  email text,
  points integer DEFAULT 0,
  points_expiry date,
  discounted boolean DEFAULT false,
  sms_opt_in boolean DEFAULT true,
  qr_code text GENERATED ALWAYS AS ('https://quickchart.io/qr?text=https://presko-web.github.io/client-portal/index.html?customerId=' || id::text) STORED,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Client locations table
CREATE TABLE IF NOT EXISTS client_locations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'My House',
  is_primary boolean DEFAULT false,
  address_line1 text,
  street text,
  barangay_id uuid REFERENCES barangays(id),
  city_id uuid REFERENCES cities(id),
  landmark text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  location_id uuid REFERENCES client_locations(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id),
  appointment_date date NOT NULL,
  appointment_time time,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'voided')),
  amount decimal(10,2) DEFAULT 0,
  total_units integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Devices table
CREATE TABLE IF NOT EXISTS devices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  location_id uuid REFERENCES client_locations(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES appointments(id),
  brand_id uuid REFERENCES brands(id),
  ac_type_id uuid REFERENCES ac_types(id),
  horsepower_id uuid REFERENCES horsepower_options(id),
  last_cleaning_date date,
  due_3_months date GENERATED ALWAYS AS (last_cleaning_date + INTERVAL '3 months') STORED,
  due_4_months date GENERATED ALWAYS AS (last_cleaning_date + INTERVAL '4 months') STORED,
  due_6_months date GENERATED ALWAYS AS (last_cleaning_date + INTERVAL '6 months') STORED,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Blocked dates table
CREATE TABLE IF NOT EXISTS blocked_dates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL DEFAULT 'Fully Booked',
  from_date date NOT NULL,
  to_date date NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- Booking settings table
CREATE TABLE IF NOT EXISTS booking_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key text UNIQUE NOT NULL,
  setting_value text,
  setting_type text DEFAULT 'text',
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  username text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text DEFAULT 'admin',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE barangays ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE ac_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE horsepower_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Public access policies for booking flow
CREATE POLICY "Public can read cities" ON cities FOR SELECT TO anon USING (true);
CREATE POLICY "Public can read barangays" ON barangays FOR SELECT TO anon USING (true);
CREATE POLICY "Public can read services" ON services FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Public can read brands" ON brands FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Public can read ac_types" ON ac_types FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Public can read horsepower_options" ON horsepower_options FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Public can read blocked_dates" ON blocked_dates FOR SELECT TO anon USING (true);
CREATE POLICY "Public can read booking_settings" ON booking_settings FOR SELECT TO anon USING (true);

-- Client policies
CREATE POLICY "Public can create clients" ON clients FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public can read clients" ON clients FOR SELECT TO anon USING (true);
CREATE POLICY "Public can update clients" ON clients FOR UPDATE TO anon USING (true);

CREATE POLICY "Public can create client_locations" ON client_locations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public can read client_locations" ON client_locations FOR SELECT TO anon USING (true);
CREATE POLICY "Public can update client_locations" ON client_locations FOR UPDATE TO anon USING (true);

CREATE POLICY "Public can create appointments" ON appointments FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public can read appointments" ON appointments FOR SELECT TO anon USING (true);
CREATE POLICY "Public can update appointments" ON appointments FOR UPDATE TO anon USING (true);

CREATE POLICY "Public can create devices" ON devices FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public can read devices" ON devices FOR SELECT TO anon USING (true);
CREATE POLICY "Public can update devices" ON devices FOR UPDATE TO anon USING (true);

-- Admin policies
CREATE POLICY "Admin full access" ON admin_users FOR ALL TO authenticated USING (true);

-- Insert sample data
INSERT INTO cities (name) VALUES 
  ('Malolos'),
  ('Meycauayan'),
  ('Marilao'),
  ('Bocaue'),
  ('Balagtas'),
  ('Guiguinto'),
  ('Pandi'),
  ('Plaridel'),
  ('Pulilan'),
  ('Calumpit');

INSERT INTO barangays (city_id, name) VALUES 
  ((SELECT id FROM cities WHERE name = 'Malolos'), 'Caingin'),
  ((SELECT id FROM cities WHERE name = 'Malolos'), 'Barihan'),
  ((SELECT id FROM cities WHERE name = 'Malolos'), 'Banga'),
  ((SELECT id FROM cities WHERE name = 'Malolos'), 'Bulihan'),
  ((SELECT id FROM cities WHERE name = 'Meycauayan'), 'Calvario'),
  ((SELECT id FROM cities WHERE name = 'Meycauayan'), 'Camalig'),
  ((SELECT id FROM cities WHERE name = 'Meycauayan'), 'Langka'),
  ((SELECT id FROM cities WHERE name = 'Marilao'), 'Abangan Norte'),
  ((SELECT id FROM cities WHERE name = 'Marilao'), 'Abangan Sur'),
  ((SELECT id FROM cities WHERE name = 'Bocaue'), 'Bundukan'),
  ((SELECT id FROM cities WHERE name = 'Bocaue'), 'Lolomboy');

INSERT INTO services (name, description, base_price) VALUES 
  ('Cleaning', 'Complete aircon cleaning service', 0),
  ('Repair', 'Aircon repair and maintenance', 0),
  ('Installation', 'New aircon installation', 0),
  ('Maintenance', 'Regular maintenance check', 0);

INSERT INTO brands (name) VALUES 
  ('LG'),
  ('Samsung'),
  ('Panasonic'),
  ('Daikin'),
  ('Carrier'),
  ('Mitsubishi'),
  ('Sharp'),
  ('Kolin'),
  ('Condura'),
  ('Other');

INSERT INTO ac_types (name, price) VALUES 
  ('Split', 1000),
  ('Window', 600),
  ('U-Shaped', 800);

INSERT INTO horsepower_options (value, display_name) VALUES 
  (0.5, '0.5 HP'),
  (0.75, '0.75 HP'),
  (1.0, '1.0 HP'),
  (1.5, '1.5 HP'),
  (2.0, '2.0 HP'),
  (2.5, '2.5 HP'),
  (3.0, '3.0 HP');

INSERT INTO booking_settings (setting_key, setting_value, setting_type, description) VALUES 
  ('confirmed_notes', 'Our cleaning crew will arrive at your home on your scheduled booking date.', 'text', 'Booking confirmed notes'),
  ('completed_notes', 'Thank you!', 'text', 'Booking completed notes'),
  ('sms_url', 'https://api.semaphore.co/api/v4/messages', 'text', 'SMS API URL'),
  ('sms_active', 'true', 'boolean', 'SMS API active status'),
  ('sms_api_key', '6c43c5a417fca5663001083f33dc4367', 'text', 'SMS API Key'),
  ('sms_sender_name', 'PRESKOAC', 'text', 'SMS Sender Name'),
  ('booking_completed_sms', 'Hi {0}, Thank you! Your booking with us is now completed. To check your earned points, scan your Presko QR Code or visit: presko-web.github.io/client-portal/index.html?customerId={1} We appreciate your support and we look forward to serving you again! Be cool, Stay Presko!', 'textarea', 'Booking completed SMS template'),
  ('booking_confirmed_sms', 'Hi {0}, Your booking with us is confirmed! Cleaning Date: {1} Total Aircon Units: {2} Amount: {3} To check your booking, please scan your Presko QR Code or visit: presko-web.github.io/client-portal/index.html?customerId={4} Thank you for choosing Presko!', 'textarea', 'Booking confirmed SMS template'),
  ('month_3_reminder', 'Hi {0} It''s been 3 months since your last Presko aircon cleaning. If your unit is used nonstop, you have pets, or your home is near the road (prone to dust), now''s the perfect time to book a cleaning to keep it running efficiently. Book here: presko-web.github.io/client-portal/index.html?customerId={1}', 'textarea', '3 month reminder SMS'),
  ('month_4_reminder', 'Hi {0}, It''s been 4 months since your last aircon cleaning. Did you know that quarterly cleaning helps maintain cooling performance, extend unit lifespan, and reduce electric bills? Stay on track with your next cleaning: presko-web.github.io/client-portal/index.html?customerId={1}', 'textarea', '4 month reminder SMS'),
  ('month_6_reminder', 'Hi {0}, It''s been 6 months since your last Presko aircon cleaning. Dirt and moisture can lead to mold buildup, which affects air quality and can trigger allergies or asthma. Your unit may also be using more energy and cooling less. Protect your health and save on bills — book now: presko-web.github.io/client-portal/index.html?customerId={1}', 'textarea', '6 month reminder SMS'),
  ('window_type_price', '600', 'number', 'Window type base price'),
  ('split_type_price', '1000', 'number', 'Split type base price'),
  ('surcharge', '200', 'number', 'Additional surcharge'),
  ('discount', '10', 'number', 'Default discount'),
  ('family_discount', '20', 'number', 'Family discount');

INSERT INTO admin_users (username, email, password_hash, role) VALUES 
  ('admin', 'admin@presko.com', '$2b$10$rQZ8kqVZ8qVZ8qVZ8qVZ8O', 'admin');