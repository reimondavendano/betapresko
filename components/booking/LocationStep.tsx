'use client'

import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '../../lib/store' // Adjust path to your Redux store
import { setSelectedCity, setSelectedBarangay, setStep } from '../../lib/features/booking/bookingSlice' // Adjust path to your slice
import { locationApi } from '../../pages/api/city/locationApi' // Adjust path to your API file
import { City, Barangay } from '../../types/database' // Import types for City and Barangay
import { MapPin, ChevronRight, Loader2 } from 'lucide-react'

// --- UI COMPONENTS IMPORTED FROM COMPONENTS/UI ---
// These imports assume you have these components set up in your project
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// --- END UI COMPONENTS IMPORTED FROM COMPONENTS/UI ---


export function LocationStep() {
  const dispatch = useDispatch();
  const { selectedCity, selectedBarangay } = useSelector((state: RootState) => state.booking);

  const [cities, setCities] = useState<City[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(true);
  const [isLoadingBarangays, setIsLoadingBarangays] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch cities on component mount
  useEffect(() => {
    const fetchCities = async () => {
      setIsLoadingCities(true);
      setError(null);
      try {
        const fetchedCities = await locationApi.getCities();
        setCities(fetchedCities);
        // If a city was previously selected in Redux, try to find it in the fetched list
        if (selectedCity && !fetchedCities.some(c => c.id === selectedCity.id)) {
          dispatch(setSelectedCity(null)); // Clear if previously selected city is not found
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load cities.');
      } finally {
        setIsLoadingCities(false);
      }
    };
    fetchCities();
  }, [dispatch, selectedCity]); // Add selectedCity to dependencies to re-evaluate if it's still valid

  // Fetch barangays when selectedCity changes
  useEffect(() => {
    if (selectedCity) {
      const fetchBarangays = async () => {
        setIsLoadingBarangays(true);
        setError(null);
        try {
          const fetchedBarangays = await locationApi.getBarangaysByCityId(selectedCity.id);
          setBarangays(fetchedBarangays);
          // If a barangay was previously selected for this city, try to find it
          if (selectedBarangay && !fetchedBarangays.some(b => b.id === selectedBarangay.id)) {
            dispatch(setSelectedBarangay(null)); // Clear if previously selected barangay is not found
          }
        } catch (err: any) {
          setError(err.message || 'Failed to load barangays.');
        } finally {
          setIsLoadingBarangays(false);
        }
      };
      fetchBarangays();
    } else {
      setBarangays([]); // Clear barangays if no city is selected
      dispatch(setSelectedBarangay(null)); // Ensure Redux state is also cleared
    }
  }, [selectedCity, dispatch, selectedBarangay]); // Add selectedBarangay to dependencies

  const handleCitySelect = (cityId: string) => {
    const city = cities.find(c => c.id === cityId);
    if (city) {
      dispatch(setSelectedCity(city));
    } else {
      dispatch(setSelectedCity(null)); // Clear if no city selected (e.g., placeholder)
    }
  };

  const handleBarangaySelect = (barangayId: string) => {
    const barangay = barangays.find(b => b.id === barangayId);
    if (barangay) {
      dispatch(setSelectedBarangay(barangay));
    } else {
      dispatch(setSelectedBarangay(null)); // Clear if no barangay selected (e.g., placeholder)
    }
  };

  const handleNext = () => {
    if (selectedCity && selectedBarangay) {
      dispatch(setStep(2)); // Proceed to the next step (e.g., Device selection)
    }
  };

  const selectedCityName = selectedCity?.name;
  const selectedBarangayName = selectedBarangay?.name;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 font-inter">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Select Your Location</h2>
        <p className="text-gray-600">Choose your city and barangay to get started</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-blue-600" />
            Service Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* City Selection */}
          <div>
            <label htmlFor="city-select" className="block text-sm font-medium text-gray-700 mb-2">
              City *
            </label>
            <Select
              value={selectedCity?.id || ''}
              onValueChange={handleCitySelect}
              disabled={isLoadingCities}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={isLoadingCities ? 'Loading cities...' : 'Select your city'} />
              </SelectTrigger>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city.id} value={city.id}>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2 text-blue-500" />
                      {city.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Barangay Selection */}
          <div>
            <label htmlFor="barangay-select" className="block text-sm font-medium text-gray-700 mb-2">
              Barangay *
            </label>
            <Select
              value={selectedBarangay?.id || ''}
              onValueChange={handleBarangaySelect}
              disabled={!selectedCity || isLoadingBarangays || barangays.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    !selectedCity
                      ? 'Select a city first'
                      : isLoadingBarangays
                      ? 'Loading barangays...'
                      : barangays.length === 0
                      ? 'No barangays available'
                      : 'Select your barangay'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {barangays.map((barangay) => (
                  <SelectItem key={barangay.id} value={barangay.id}>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2 text-green-500" />
                      {barangay.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Location Summary */}
          {selectedCity && selectedBarangay && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Selected Location:</h4>
              <p className="text-blue-800">
                <MapPin className="w-4 h-4 inline mr-1" />
                {selectedBarangayName}, {selectedCityName}, Bulacan
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-center mt-8">
        <Button
          onClick={handleNext}
          disabled={!selectedCity || !selectedBarangay}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700"
        >
          Continue to Services
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}


