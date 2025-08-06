// src/api/customSettingsApi.ts
import { supabase } from '../../../lib/supabase';
import { CustomSetting, ParsedCustomSettings } from '../../../types/database'; // Import new types

export const customSettingsApi = {
  /**
   * Fetches all custom settings and parses them into a structured object.
   */
  getCustomSettings: async (): Promise<ParsedCustomSettings> => {
    const { data, error } = await supabase
      .from('custom_settings')
      .select('setting_key, setting_value');

    if (error) {
      console.error('Error fetching custom settings:', error);
      throw new Error(error.message);
    }

    // Initialize with default values to ensure all properties exist
    const parsedSettings: ParsedCustomSettings = {
      discount: 0,
      windowTypePrice: 0,
      splitTypePrice: 0,
      surcharge: 0,
    };

    // Map fetched settings to the structured object
    data.forEach((setting: { setting_key: string; setting_value: string }) => {
      const value = parseFloat(setting.setting_value); // Parse value to number
      if (!isNaN(value)) {
        switch (setting.setting_key) {
          case 'discount':
            parsedSettings.discount = value;
            break;
          case 'window_type_price':
            parsedSettings.windowTypePrice = value;
            break;
          case 'split_type_price':
            parsedSettings.splitTypePrice = value;
            break;
          case 'surcharge':
            parsedSettings.surcharge = value;
            break;
          // Add other cases for new settings here
        }
      }
    });

    return parsedSettings;
  },
};
