'use client'

import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '../../lib/store'
import { setStep, setLocationInfo } from '../../lib/features/booking/bookingSlice'
import { MapPin, ChevronRight, Loader2, Frown } from 'lucide-react'
import { ClientLocation, City, Barangay, UUID } from '@/types/database';
import 'leaflet/dist/leaflet.css';
import type * as L from 'leaflet';
import { cityApi } from '../../pages/api/cities/cityApi';
import { barangayApi } from '../../pages/api/barangays/barangayApi';
import { customSettingsApi } from '../../pages/api/custom_settings/customSettingsApi' // add this import

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'


const toBoolean = (value: unknown): boolean => !!value;

// A helper function to get the current geolocation
const getGeolocation = (onSuccess: (position: GeolocationPosition) => void, onError: () => void) => {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    });
  } else {
    onError();
  }
};

const getGeocodedAddress = async (lat: number, lng: number): Promise<Partial<ClientLocation>> => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    if (!response.ok) throw new Error('Failed to fetch address');

    const data = await response.json();
    const address = data.address;

    return {
      address_line1: address.house_number ? `${address.house_number} ${address.residential}` : address.road,
      street: address.road,
      // Try to get a barangay name from common Nominatim keys
      barangay_name: address.quarter,
      city_name: address.city,
      landmark: address.amenity || address.shop || address.historic,
    };
  } catch (error) {
    console.error('Reverse Geocoding Error:', error);
    throw new Error('Could not get address');
  }
};

export function LocationStep() {
  const dispatch = useDispatch();
  const { locationInfo } = useSelector((state: RootState) => state.booking);

  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  const [allCities, setAllCities] = useState<City[]>([]);
  const [filteredCities, setFilteredCities] = useState<City[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  
  const [citySearchTerm, setCitySearchTerm] = useState<string>(locationInfo.city_name || '');
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [isFetchingCities, setIsFetchingCities] = useState(false);

  const [locationErrorMessage, setLocationErrorMessage] = useState<string>();


  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const cityInputRef = useRef<HTMLDivElement>(null);
  const [L, setL] = useState<any>(null);

  // Refs to hold the latest state values for the map event listeners
  const locationInfoRef = useRef(locationInfo);
  const allCitiesRef = useRef(allCities);

  // Dynamically import leaflet on component mount
  useEffect(() => {
    import('leaflet').then((module) => {
      setL(module);
    }).catch(console.error);
  }, []);
  
  // Keep refs in sync with state
  useEffect(() => {
    locationInfoRef.current = locationInfo;
  }, [locationInfo]);

  useEffect(() => {
    allCitiesRef.current = allCities;
  }, [allCities]);

  // fetch setting_key = "location_error"
  useEffect(() => {
    const fetchLocationErrorMessage = async () => {
      try {
        const setting = await customSettingsApi.getSetting('location_error');
        if (setting?.setting_value) {
          setLocationErrorMessage(setting.setting_value);
        }
      } catch (err) {
        console.error('Error fetching location_error setting:', err);
      }
    };

    fetchLocationErrorMessage();
  }, []);

  // Fetch all cities on component mount
  useEffect(() => {
    const fetchAllCities = async () => {
      setIsFetchingCities(true);
      try {
        const fetchedCities = await cityApi.getCities();
        setAllCities(fetchedCities);
        setFilteredCities(fetchedCities);
      } catch (error) {
        console.error('Error fetching all cities:', error);
        setLocationError('Failed to load cities. Please try again.');
      } finally {
        setIsFetchingCities(false);
      }
    };
    fetchAllCities();
  }, []);

  // Filter cities based on search term (now case-insensitive)
  useEffect(() => {
    if (citySearchTerm) {
      const filtered = allCities.filter(city =>
        city.name.toLowerCase().includes(citySearchTerm.toLowerCase())
      );
      setFilteredCities(filtered);
    } else {
      setFilteredCities(allCities);
    }
  }, [citySearchTerm, allCities]);

  // Default location name to Home if not set
  useEffect(() => {
    if (!locationInfo.name) {
      dispatch(setLocationInfo({ ...locationInfo, name: 'Home' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Fetch barangays when a city is selected manually
  useEffect(() => {
    if (locationInfo.city_id) {
      const fetchBarangays = async () => {
        try {
          const fetchedBarangays = await barangayApi.getBarangaysByCity(locationInfo.city_id as UUID);
          setBarangays(fetchedBarangays);
          const currentBarangayId = locationInfo.barangay_id;
          if (currentBarangayId && !fetchedBarangays.some(b => b.id === currentBarangayId)) {
            dispatch(setLocationInfo({ ...locationInfo, barangay_id: null, barangay_name: null }));
          }
        } catch (error) {
          console.error('Error fetching barangays:', error);
          setBarangays([]);
        }
      };
      fetchBarangays();
    } else {
      setBarangays([]);
    }
  }, [locationInfo.city_id, dispatch, locationInfo.barangay_id, locationInfo]);


  // Initialize and clean up the map (runs only once after L is loaded)
  useEffect(() => {
    if (!L || mapRef.current) return;
    
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const defaultCenter = [14.8436, 120.8124];
    const map = L.map('map').setView(defaultCenter, 18);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const marker = L.marker(defaultCenter, { draggable: true }).addTo(map);

    mapRef.current = map;
    markerRef.current = marker;
    setIsMapReady(true);

    const handleDragEnd = async () => {
      const pos = marker.getLatLng();
      setIsGettingLocation(true);
      try {
        const address = await getGeocodedAddress(pos.lat, pos.lng);
        const cityFromAPI = address.city_name;
        const barangayFromAPI = address.barangay_name;

        const city = allCitiesRef.current.find(c => c.name.toLowerCase() === cityFromAPI?.toLowerCase());

        if (!city) {
          setIsModalOpen(true);
          dispatch(setLocationInfo({ ...locationInfoRef.current, city_id: null, city_name: null, barangay_id: null, barangay_name: null, is_primary: true }));
          setCitySearchTerm('');
        } else {
          // New logic: fetch barangays for the found city and find the matching one
          const fetchedBarangays = await barangayApi.getBarangaysByCity(city.id as UUID);
          const barangay = fetchedBarangays.find(b => b.name.toLowerCase() === barangayFromAPI?.toLowerCase());

          dispatch(setLocationInfo({
            ...locationInfoRef.current,
            city_id: city.id,
            city_name: city.name,
            barangay_id: barangay?.id || null,
            barangay_name: barangay?.name || null,
            address_line1: address.address_line1,
            street: address.street,
            landmark: address.landmark,
            is_primary: true
          }));
          setCitySearchTerm(city.name);
          setBarangays(fetchedBarangays); // Update local state for the manual dropdown
          setLocationError(null);
          // City valid: ensure user can pick barangay immediately
          setIsGettingLocation(false);
        }
      } catch (error) {
        setLocationError('Could not get address.');
      } finally {
        // no-op; already handled when city matched, but keep for safety
        setIsGettingLocation(false);
      }
    };
    marker.on('dragend', handleDragEnd);

    return () => {
      marker.off('dragend', handleDragEnd);
      mapRef.current?.remove();
      mapRef.current = null;
      setIsMapReady(false);
    };
  }, [L, dispatch]);


  // Handle click on the new "Use My Current Location" button
  const handleUseCurrentLocation = () => {
    if (isGettingLocation || !isMapReady) return;
    
    setIsGettingLocation(true);
    setLocationError(null);

    getGeolocation(
      async (position) => {
        try {
          const address = await getGeocodedAddress(position.coords.latitude, position.coords.longitude);
          const cityFromAPI = address.city_name;
          const barangayFromAPI = address.barangay_name;

          const city = allCitiesRef.current.find(c => c.name.toLowerCase() === cityFromAPI?.toLowerCase());

          if (!city) {
            setIsModalOpen(true);
            dispatch(setLocationInfo({ ...locationInfoRef.current, city_id: null, city_name: null, barangay_id: null, barangay_name: null, is_primary: true }));
            setCitySearchTerm('');
          } else {
            // New logic: fetch barangays for the found city and find the matching one
            const fetchedBarangays = await barangayApi.getBarangaysByCity(city.id as UUID);
            const barangay = fetchedBarangays.find(b => b.name.toLowerCase() === barangayFromAPI?.toLowerCase());

            dispatch(setLocationInfo({
              ...locationInfoRef.current,
              city_id: city.id,
              city_name: city.name,
              barangay_id: barangay?.id || null,
              barangay_name: barangay?.name || null,
              address_line1: address.address_line1,
              street: address.street,
              landmark: address.landmark,
              is_primary: true
            }));
            setCitySearchTerm(city.name);
            setBarangays(fetchedBarangays); // Update local state for the manual dropdown
            setLocationError(null);
            
            // Check if map and marker exist before trying to use them
            if (L && mapRef.current && markerRef.current) {
             const latlng = L.latLng(position.coords.latitude, position.coords.longitude);
              mapRef.current.setView(latlng, 18);
              markerRef.current.setLatLng(latlng);
            }
          }
        } catch (error) {
          setLocationError('Could not get address.');
        } finally {
          setIsGettingLocation(false);
        }
      },
      () => {
        setLocationError('Failed to get current location.');
        setIsGettingLocation(false);
      }
    );
  };
  
  const handleNext = () => {
    dispatch(setStep(2));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    // This part is crucial, ensure we are not overwriting city_name with an empty string if the user is not editing that field
    if (name === 'city_name' && value === '') {
        dispatch(setLocationInfo({ ...locationInfo, city_id: null, city_name: null, barangay_id: null, barangay_name: null }));
    } else {
        dispatch(setLocationInfo({ ...locationInfo, [name]: type === 'checkbox' ? toBoolean(checked) : value }));
    }
  };

  // New handler for the city search input
  const handleCitySearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCitySearchTerm(e.target.value);
    setIsCityDropdownOpen(true);
    if (locationInfo.city_name && e.target.value !== locationInfo.city_name) {
      dispatch(setLocationInfo({ ...locationInfo, city_id: null, city_name: null, barangay_id: null, barangay_name: null }));
    }
  };

  const handleCitySelect = (city: City) => {
    setCitySearchTerm(city.name);
    dispatch(setLocationInfo({ ...locationInfo, city_id: city.id, city_name: city.name, barangay_id: null, barangay_name: null }));
    setIsCityDropdownOpen(false);
  };

  // This handler has been updated to explicitly get both the ID and name
  const handleBarangaySelect = (barangayId: string) => {
    const selectedBarangay = barangays.find(b => b.id === barangayId);
    if (selectedBarangay) {
        dispatch(setLocationInfo({
            ...locationInfo,
            barangay_id: selectedBarangay.id,
            barangay_name: selectedBarangay.name
        }));
    } else {
        // Fallback for an unlikely scenario where the barangay is not found
        dispatch(setLocationInfo({ ...locationInfo, barangay_id: null, barangay_name: null }));
    }
  };
  
  // Close city dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cityInputRef.current && !cityInputRef.current.contains(event.target as Node)) {
        setIsCityDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [cityInputRef]);

  return (
    <div className="flex justify-center p-4">
      <div className="max-w-xl w-full">
        <Card className="shadow-lg rounded-xl overflow-hidden">
          <CardHeader className="bg-[#99BCC0] text-white p-6">
            <CardTitle className="flex items-center text-2xl font-bold">
              <MapPin className="w-6 h-6 mr-3" />
              Your Location
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div id="map" className="w-full h-80 rounded-lg shadow-inner mb-4"></div>

            <Button
             variant="outline"
              onClick={handleUseCurrentLocation}
              disabled={isGettingLocation || !isMapReady}
              className="flex items-center justify-center space-x-2 rounded-lg w-full sm:w-auto border-teal-400 text-teal-600 bg-white hover:bg-white shadow-md p-3"
            >
              {isGettingLocation ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Getting your location...</span>
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4" />
                  <span>Use My Current Location</span>
                </>
              )}
            </Button>
            {locationError && (
              <p className="text-red-500 text-sm mt-2">{locationError}</p>
            )}

            <div className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="space-y-2">
                  <Label htmlFor="location-name">Location Name</Label>
                  <Input
                    id="location-name"
                    name="name"
                    placeholder="Ex: My House"
                    value={locationInfo.name ?? ''}
                    onChange={handleInputChange}
                    disabled={isGettingLocation}
                    required
                  />
                </div>
                <div className="flex items-center space-x-2 mt-auto">
                   <Checkbox
                    id="is-primary"
                    name="is_primary"
                    checked={true}
                    disabled={true}
                  />
                  <Label htmlFor="is-primary" className="text-sm font-medium leading-none">
                    Set as Primary
                  </Label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative" ref={cityInputRef}>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <div className="relative">
                    <Input
                      id="city"
                      name="city_name"
                      placeholder="Search for a city..."
                      value={citySearchTerm}
                      onChange={handleCitySearchChange}
                      onFocus={() => setIsCityDropdownOpen(true)}
                      autoComplete="off"
                      disabled={isGettingLocation || isFetchingCities}
                    />
                    {isFetchingCities && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      </div>
                    )}
                  </div>
                  {isCityDropdownOpen && !isFetchingCities && filteredCities.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                      {filteredCities.map((city) => (
                        <div
                          key={city.id}
                          className="px-3 py-1.5 hover:bg-gray-100 cursor-pointer"
                          onClick={() => handleCitySelect(city)}
                        >
                          {city.name}
                        </div>
                      ))}
                    </div>
                  )}
                  {isCityDropdownOpen && !isFetchingCities && filteredCities.length === 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-4">
                      {citySearchTerm ? 'No cities found.' : 'Start typing to search for a city.'}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="barangay">Barangay</Label>
                  <Select
                    onValueChange={handleBarangaySelect}
                    value={locationInfo.barangay_id ?? ''}
                    disabled={isGettingLocation || !locationInfo.city_id}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a barangay" />
                    </SelectTrigger>
                    <SelectContent>
                      {barangays.length > 0 ? (
                        barangays.map((barangay) => (
                          <SelectItem key={barangay.id} value={barangay.id}>
                            {barangay.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-barangays-found" disabled>No barangays found</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address-line1">Address Line 1</Label>
                  <Input
                    id="address-line1"
                    name="address_line1"
                    placeholder="Ex: Block C Lot 3"
                    value={locationInfo.address_line1 ?? ''}
                    onChange={handleInputChange}
                    disabled={isGettingLocation}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="street">Street</Label>
                  <Input
                    id="street"
                    name="street"
                    placeholder="Ex: 24 De Agosto"
                    value={locationInfo.street ?? ''}
                    onChange={handleInputChange}
                    disabled={isGettingLocation}
                  />
                </div>
              </div>

              

              <div className="space-y-2">
                <Label htmlFor="landmark">Landmark</Label>
                  <Input
                  id="landmark"
                  name="landmark"
                  placeholder="Ex: Beside Alfamart"
                  value={locationInfo.landmark ?? ''}
                  onChange={handleInputChange}
                    disabled={isGettingLocation}
                    required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center mt-8">
          <Button
            onClick={handleNext}
            variant="outline"
            disabled={!locationInfo.address_line1 || !locationInfo.barangay_id || !locationInfo.city_id || !locationInfo.name || !locationInfo.landmark}
            className="px-8 py-3 rounded-lg w-full sm:w-auto border-teal-400 text-teal-600 bg-white hover:bg-white shadow-md"
          >
            Continue to Services
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px] z-[9999]">
            <DialogHeader>
                <DialogTitle className="flex items-center text-red-500">
                    <Frown className="mr-2" /> Location Not in Range
                </DialogTitle>
                <DialogDescription>
                    {locationErrorMessage}
                </DialogDescription>
            </DialogHeader>
            <Button  variant="outline" className = "rounded-lg w-full sm:w-auto border-teal-400 text-teal-600 bg-white hover:bg-white shadow-md" onClick={() => setIsModalOpen(false)}>Okay</Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
