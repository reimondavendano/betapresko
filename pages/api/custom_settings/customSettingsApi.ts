// src/api/customSettingsApi.ts
import { supabase } from '../../../lib/supabase';
import { CustomSetting, ParsedCustomSettings } from '../../../types/database'; // Import new types


export const customSettingsApi = {
  getAll: async (): Promise<CustomSetting[]> => {
    const { data, error } = await supabase
      .from('custom_settings')
      .select('*')

    if (error) {
      console.error('Error fetching custom settings:', error.message)
      return []
    }
    return data as CustomSetting[]
  },

  getSetting: async (key: string): Promise<CustomSetting | null> => {
    const { data, error } = await supabase
      .from('custom_settings')
      .select('*')
      .eq('setting_key', key)
      .maybeSingle()

    if (error) {
      console.error(`Error fetching custom setting: ${key}`, error.message)
      return null
    }
    return data as CustomSetting | null
  },

  getCustomSettings: async (): Promise<ParsedCustomSettings> => {
    const { data, error } = await supabase
      .from('custom_settings')
      .select('setting_key, setting_value')

    if (error) {
      console.error('Error fetching custom settings:', error)
      throw new Error(error.message)
    }

    const parsedSettings: ParsedCustomSettings = {
      discount: 0,
      windowTypePrice: 0,
      splitTypePrice: 0,
      surcharge: 0,
      familyDiscount: 0,
      repairPrice: 0,
    }

    data.forEach((setting: { setting_key: string; setting_value: string }) => {
      const value = parseFloat(setting.setting_value)
      if (!isNaN(value)) {
        switch (setting.setting_key) {
          case 'discount':
            parsedSettings.discount = value
            break
          case 'window_type_price':
            parsedSettings.windowTypePrice = value
            break
          case 'split_type_price':
            parsedSettings.splitTypePrice = value
            break
          case 'surcharge':
            parsedSettings.surcharge = value
            break
          case 'family_discount':
            parsedSettings.familyDiscount = value
            break
          case 'repair_price':
            parsedSettings.repairPrice = value
            break
          // 🔑 Add new numeric settings here if needed
        }
      }
    })

    return parsedSettings
  },

  getDeviceBasePrice: async (acTypeName: string): Promise<number> => {
    let settingKey: string;

    if (acTypeName.toLowerCase().includes("window")) {
      settingKey = "window_type_price";
    } else if (
      acTypeName.toLowerCase().includes("split") ||
      acTypeName.toLowerCase().includes("u-shape") ||
      acTypeName.toLowerCase().includes("u shape")
    ) {
      settingKey = "split_type_price";
    } else {
      throw new Error(`Unknown AC type: ${acTypeName}`);
    }

    const value = await customSettingsApi.getSetting(settingKey);
    return Number(value?.setting_value ?? 0);
  },

  create: async (setting: Partial<CustomSetting>): Promise<CustomSetting | null> => {
    const { data, error } = await supabase
      .from('custom_settings')
      .insert(setting)
      .select()
      .single()

    if (error) {
      console.error('Error creating custom setting:', error.message)
      return null
    }
    return data as CustomSetting
  },

  update: async (id: string, setting: Partial<CustomSetting>): Promise<CustomSetting | null> => {
    const { data, error } = await supabase
      .from('custom_settings')
      .update(setting)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error(`Error updating custom setting with id ${id}:`, error.message)
      return null
    }
    return data as CustomSetting
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('custom_settings')
      .delete()
      .eq('id', id)

    if (error) {
      console.error(`Error deleting custom setting with id ${id}:`, error.message)
      return false
    }
    return true
  },
}
