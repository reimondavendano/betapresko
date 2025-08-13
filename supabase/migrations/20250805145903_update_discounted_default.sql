-- Update the default value of the discounted column to true
ALTER TABLE clients ALTER COLUMN discounted SET DEFAULT true;

-- Update existing clients to have discounted = true if they don't have it set
UPDATE clients SET discounted = true WHERE discounted IS NULL OR discounted = false;

-- Insert family_discount setting if it doesn't exist
INSERT INTO custom_settings (setting_key, setting_value, setting_type, description)
VALUES ('family_discount', '20', 'number', 'Family discount')
ON CONFLICT (setting_key) DO NOTHING;
