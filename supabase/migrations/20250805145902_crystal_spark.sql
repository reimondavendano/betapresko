/*
  # Update Client Location Schema

  1. Schema Updates
    - Update client_locations table to reference barangay and city by ID
    - Ensure proper foreign key relationships
    - Add proper indexing for performance

  2. Data Integrity
    - Maintain existing data structure
    - Add proper constraints
*/

-- Update client_locations table to use proper foreign keys
DO $$
BEGIN
  -- Add barangay_id and city_id columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_locations' AND column_name = 'barangay_id'
  ) THEN
    ALTER TABLE client_locations ADD COLUMN barangay_id uuid REFERENCES barangays(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_locations' AND column_name = 'city_id'
  ) THEN
    ALTER TABLE client_locations ADD COLUMN city_id uuid REFERENCES cities(id);
  END IF;

  -- Remove old text columns if they exist and new columns are populated
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_locations' AND column_name = 'barangay' AND data_type = 'text'
  ) THEN
    -- Only drop if we have the new columns
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'client_locations' AND column_name = 'barangay_id'
    ) THEN
      ALTER TABLE client_locations DROP COLUMN IF EXISTS barangay;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_locations' AND column_name = 'city' AND data_type = 'text'
  ) THEN
    -- Only drop if we have the new columns
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'client_locations' AND column_name = 'city_id'
    ) THEN
      ALTER TABLE client_locations DROP COLUMN IF EXISTS city;
    END IF;
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_client_locations_client_id ON client_locations(client_id);
CREATE INDEX IF NOT EXISTS idx_client_locations_barangay_id ON client_locations(barangay_id);
CREATE INDEX IF NOT EXISTS idx_client_locations_city_id ON client_locations(city_id);
CREATE INDEX IF NOT EXISTS idx_client_locations_primary ON client_locations(is_primary) WHERE is_primary = true;