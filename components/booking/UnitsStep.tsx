'use client'

import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '@/lib/store' // Use type-only import for RootState
import { 
  setSelectedDevices, 
  setTotalAmount, 
  setStep, 
  setAvailableBrands, 
  setAvailableACTypes, 
  setAvailableHorsepowerOptions, 
  setDiscount, // Re-added setDiscount
  setCustomPricingSettings, // Kept setCustomPricingSettings
  BookingDevice // Corrected: Imported as named export
} from '@/lib/features/booking/bookingSlice' 
import { brandsApi } from '../../pages/api/brands/brandsApi' // Adjust path
import { acTypesApi } from '../../pages/api/types/acTypesApi' // Adjust path
import { horsepowerApi } from '../../pages/api/horsepower/horsepowerApi' // Adjust path
import { customSettingsApi } from '../../pages/api/custom_settings/customSettingsApi' // Adjust path
import { Brand, ACType, HorsepowerOption, UUID, ParsedCustomSettings, DateString } from '../../types/database' // Import ParsedCustomSettings
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Minus, ChevronRight, ChevronLeft, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input' // Added Input import

export function UnitsStep() {
  const dispatch = useDispatch();
  const { 
    selectedService,
    selectedDevices, 
    availableBrands, 
    availableACTypes, 
    availableHorsepowerOptions, 
    customPricingSettings, // Access custom pricing settings
    discount, // Access discount from Redux state
  } = useSelector((state: RootState) => state.booking);

  // Initialize devices state from Redux, or with one empty device if none selected
  const [devices, setDevices] = useState<BookingDevice[]>(
    selectedDevices.length > 0 ? selectedDevices : [
      { brand_id: '', ac_type_id: '', horsepower_id: '', quantity: 1 }
    ]
  );

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch brands, AC types, horsepower options, and ALL custom settings on component mount
  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [brands, acTypes, horsepowerOptions, fetchedCustomSettings] = await Promise.all([
          brandsApi.getBrands(),
          acTypesApi.getACTypes(),
          horsepowerApi.getHorsepowerOptions(),
          customSettingsApi.getCustomSettings(), // Fetch ALL custom settings
        ]);
        dispatch(setAvailableBrands(brands));
        dispatch(setAvailableACTypes(acTypes));
        dispatch(setAvailableHorsepowerOptions(horsepowerOptions));
        dispatch(setCustomPricingSettings(fetchedCustomSettings)); // Dispatch all custom settings
        
      } catch (err: any) {
        setError(err.message || 'Failed to load unit options or settings.');
      } finally {
        setIsLoading(false);
      }
    };
    
    // Only fetch if data is not already in Redux.
    if (availableBrands.length === 0 || availableACTypes.length === 0 || availableHorsepowerOptions.length === 0 || Object.keys(customPricingSettings).length === 0) {
      fetchAllData();
    } else {
      setIsLoading(false); // Data already loaded
    }
  }, [dispatch, availableBrands, availableACTypes, availableHorsepowerOptions, customPricingSettings]);


  const addDevice = () => {
    setDevices([...devices, { 
      brand_id: '', 
      ac_type_id: '', 
      horsepower_id: '', 
      quantity: 1,
    }]);
  };

  const removeDevice = (index: number) => {
    if (devices.length > 1) {
      setDevices(devices.filter((_, i) => i !== index));
    }
  };

  const updateDevice = (index: number, field: keyof BookingDevice, value: UUID | number | string | null) => {
    const updatedDevices = devices.map((device, i) => 
      i === index ? { ...device, [field]: value as any } : device // Type assertion for simplicity
    );
    setDevices(updatedDevices);
  };

  const updateQuantity = (index: number, increment: boolean) => {
    const updatedDevices = devices.map((device, i) => {
      if (i === index) {
        const newQuantity = increment ? device.quantity + 1 : Math.max(1, device.quantity - 1);
        return { ...device, quantity: newQuantity };
      }
      return device;
    });
    setDevices(updatedDevices);
  };

  // Calculate the price for a single unit based on AC Type, HP, and custom settings
  const getUnitPrice = (device: BookingDevice): number => {
    // Ensure custom pricing settings object is populated.
    if (Object.keys(customPricingSettings).length === 0) {
        return 0; // Settings not loaded yet
    }

    // Check if the selected service is a repair service
    const isRepairService = selectedService?.name?.toLowerCase().includes('repair') || false;
    
    if (isRepairService) {
      // For repair services, use the fixed repair price from custom settings
      return customPricingSettings.repairPrice || 0;
    }

    // For non-repair services, use the original pricing logic
    let unitPrice = 0;
    const acType = availableACTypes.find(type => type.id === device.ac_type_id);
    const horsepowerOption = availableHorsepowerOptions.find(hp => hp.id === device.horsepower_id);

    // Ensure we have the necessary data (AC Type and Horsepower)
    if (!acType || !horsepowerOption) {
      return 0; // Return 0 if AC Type or Horsepower is not selected/found
    }

    const hpValue = horsepowerOption.value; // e.g., 1.0, 1.5, 2.0, 2.5, 3.0

    if (acType.name === 'Split Type' || acType.name === 'U-shaped') {
      // Split Type and U-shaped pricing logic
      if (hpValue <= 1.5) { // 2HP and below
        unitPrice = customPricingSettings.splitTypePrice;
      } else { // Above 2HP
        unitPrice = customPricingSettings.splitTypePrice + customPricingSettings.surcharge;
      }
    } else if (acType.name === 'Window Type') {
      // Window Type pricing logic
      if (hpValue <= 1.5) { // 1.5HP and below
        unitPrice = customPricingSettings.windowTypePrice;
      } else { // Above 1.5HP
        unitPrice = customPricingSettings.windowTypePrice + customPricingSettings.surcharge;
      }
    }
    // Add other AC types if they exist and have different pricing rules
    
    return unitPrice;
  };

  // Calculate the subtotal of all selected units
  const calculateSubtotal = (): number => {
    return devices.reduce((subtotal, device) => {
      const unitPrice = getUnitPrice(device);
      return subtotal + (unitPrice * device.quantity);
    }, 0);
  };

  // Calculate the final total after applying discount

  const calculateFinalTotal = (): number => {
    const subtotal = calculateSubtotal();
    
    // Check if the selected service is a repair service
    const isRepairService = selectedService?.name?.toLowerCase().includes('repair') || false;
    
    if (isRepairService) {
      return subtotal; // no discount for repair
    }
    
    // percentage discount
    const discountRate = customPricingSettings.discount || 0;
    const discountAmount = subtotal * (discountRate / 100);
    
    const finalTotal = Math.max(0, subtotal - discountAmount);
    return finalTotal;
  };

  // helper for view
  const calculateDiscountAmount = (): number => {
    const subtotal = calculateSubtotal();
    const discountRate = customPricingSettings.discount || 0;
    return subtotal * (discountRate / 100);
  };


  const isFormValid = () => {
    const isValid = devices.every((device, index) => {
      const brandValid = !!device.brand_id;
      const acTypeValid = !!device.ac_type_id;
      const hpValid = !!device.horsepower_id;
      const quantityValid = device.quantity > 0;

      return brandValid && acTypeValid && hpValid && quantityValid;
    });

    return isValid;
  };

  const handleNext = () => {
    if (isFormValid()) {
      dispatch(setSelectedDevices(devices));
      dispatch(setTotalAmount(calculateFinalTotal())); // Dispatch the final total
      dispatch(setStep(4)); // Proceed to Schedule Step (Step 4 in the new flow)
    } else {

    }
  };

  const handleBack = () => {
    dispatch(setStep(2)); // Go back to Service Step (Step 2 in the new flow)
  };

  const currentSubtotal = calculateSubtotal();
  const currentFinalTotal = calculateFinalTotal();

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center flex flex-col items-center justify-center min-h-[400px] font-inter">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-gray-600 text-lg">Loading unit options and settings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center flex flex-col items-center justify-center min-h-[400px] font-inter">
        <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
        <p className="text-red-700 text-lg mb-2">Error loading data:</p>
        <p className="text-red-600 text-sm">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4 rounded-lg w-full sm:w-auto border-teal-400 text-teal-600 hover:bg-white bg-white shadow-md">
          Retry
        </Button>
      </div>
    );
  }

  // Also check if core lookup data is available
  if (availableBrands.length === 0 || availableACTypes.length === 0 || availableHorsepowerOptions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center flex flex-col items-center justify-center min-h-[400px] font-inter">
        <AlertCircle className="w-10 h-10 text-orange-500 mb-4" />
        <p className="text-orange-700 text-lg">No unit options available at the moment.</p>
        <p className="text-orange-600 text-sm">Please ensure brands, AC types, and horsepower options are configured in your database.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 font-inter">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Select Your AC Units</h2>
        <p className="text-gray-600">Add details for each aircon unit you want serviced</p>
      </div>

      <div className="space-y-6 mb-8">
        {devices.map((device, index) => (
          <Card key={index} className="relative rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Unit {index + 1}</CardTitle>
              {devices.length > 1 && (
                <Button
                  onClick={() => removeDevice(index)}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                {/* Removed Unit Name input as it's not part of BookingDevice in bookingSlice */}
                {/* Brand */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                  <Select
                    value={device.brand_id ?? ''}
                    onValueChange={(value) => updateDevice(index, 'brand_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBrands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* AC Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <Select
                    value={device.ac_type_id ?? ''}
                    onValueChange={(value) => updateDevice(index, 'ac_type_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableACTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          <span>{type.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Horsepower */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Horsepower</label>
                  <Select
                    value={device.horsepower_id ?? ''}
                    onValueChange={(value) => updateDevice(index, 'horsepower_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select HP" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableHorsepowerOptions.map((hp) => (
                        <SelectItem key={hp.id} value={hp.id}>
                          {hp.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => updateQuantity(index, false)}
                      variant="outline"
                      size="sm"
                      className="w-8 h-8 p-0"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-8 text-center font-medium">{device.quantity}</span>
                    <Button
                      onClick={() => updateQuantity(index, true)}
                      variant="outline"
                      size="sm"
                      className="w-8 h-8 p-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Price Preview */}
              {device.ac_type_id && device.horsepower_id && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Unit price:</span>
                    <span className="font-medium">
                      ₱{getUnitPrice(device).toLocaleString()} × {device.quantity}
                    </span>
                  </div>
                  <div className="flex justify-between items-center font-semibold">
                    <span>Subtotal:</span>
                    <span className="text-blue-600">
                      ₱{(getUnitPrice(device) * device.quantity).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        <Button
          onClick={addDevice}
          variant="outline"
          className="w-full py-3 border-dashed border-2 rounded-lg w-full sm:w-auto border-teal-400 text-teal-600 hover:bg-white bg-white shadow-md"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Another Unit
        </Button>
      </div>

      {/* Total Summary */}
      <Card className="mb-8 rounded-xl">
        <CardContent className="pt-6 space-y-2">
          <div className="flex justify-between items-center text-lg">
            <span>Subtotal:</span>
            <span className="font-semibold">₱{currentSubtotal.toLocaleString()}</span>
          </div>
          {(() => {
            const isRepairService = selectedService?.name?.toLowerCase().includes('repair') || false;
            if (!isRepairService && customPricingSettings.discount > 0) {
              const discountAmount = calculateDiscountAmount();
              return (
                <div className="flex justify-between items-center text-lg text-red-600">
                  <span>Discount ({customPricingSettings.discount}%):</span>
                  <span className="font-semibold text-red-600">- ₱{discountAmount.toLocaleString()}</span>
                </div>
              );
            }
            return null;
          })()}
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between items-center text-xl font-bold">
              <span>Total Amount:</span>
              <span className="text-blue-600">₱{currentFinalTotal.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>


      <div className="flex flex-col md:flex-row justify-between gap-4">
        <Button
          onClick={handleBack}
          variant="outline"
          className="px-6 py-3 rounded-lg w-full sm:w-auto bg-gray-to-r border-teal-400 text-teal-600 bg-white hover:bg-white shadow-md"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Services
        </Button>
        
        <Button
          onClick={handleNext}
          disabled={!isFormValid()}
          variant="outline"
          className="px-8 py-3 rounded-lg w-full sm:w-auto border-teal-400 text-teal-600 hover:bg-white bg-white shadow-md"
        >
          Continue to Schedule
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
