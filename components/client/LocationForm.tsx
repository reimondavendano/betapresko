'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { clientLocationApi } from '../../pages/api/clientLocation/clientLocationApi';
import type { ClientLocation, UUID, City, Barangay } from '@/types/database';
import 'leaflet/dist/leaflet.css';
import type * as L from 'leaflet';
import { cityApi } from '../../pages/api/cities/cityApi';
import { barangayApi } from '../../pages/api/barangays/barangayApi';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface LocationFormProps {
  clientId: string;
  onSave: () => void;
}

const getGeocodedAddress = async (lat: number, lng: number): Promise<Partial<ClientLocation>> => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    if (!response.ok) throw new Error('Failed to fetch address');

    const data = await response.json();
    const address = data.address;

    return {
      address_line1: address.house_number ? `${address.house_number} ${address.residential}` : address.road,
      street: address.road,
      barangay_name: address.quarter,
      city_name: address.city,
      landmark: address.amenity || address.shop || address.historic,
    };
  } catch (error) {
    console.error('Reverse Geocoding Error:', error);
    throw new Error('Could not get address');
  }
};

const mockGeolocation = (onSuccess: (position: GeolocationPosition) => void, onError: () => void) => {
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

export function LocationForm({ clientId, onSave }: LocationFormProps) {
  const normalizeName = (name?: string | null) =>
    (name || '')
      .toLowerCase()
      .replace(/city of\s+/g, '')
      .replace(/\scity$/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  const [locationInfo, setLocationInfo] = useState<Partial<ClientLocation>>({
    name: '',
    address_line1: '',
    street: '',
    barangay_name: '',
    city_name: '',
    barangay_id: null,
    city_id: null,
    landmark: '',
  });
  const [locationMethod, setLocationMethod] = useState<'manual' | 'current'>('manual');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrimary, setIsPrimary] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [L, setL] = useState<any>(null);
  // New: dynamic city/barangay state
  const [allCities, setAllCities] = useState<City[]>([]);
  const [filteredCities, setFilteredCities] = useState<City[]>([]);
  const [isFetchingCities, setIsFetchingCities] = useState(false);
  const [citySearchTerm, setCitySearchTerm] = useState<string>('');
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const cityInputRef = useRef<HTMLDivElement>(null);
  // Keep the latest cities list for map event handlers
  const allCitiesRef = useRef<City[]>([]);

  // Dynamically import Leaflet
  useEffect(() => {
    import('leaflet').then((module) => {
      setL(module);
    }).catch(console.error);
  }, []);

  // Fetch all cities on mount
  useEffect(() => {
    const fetchAllCities = async () => {
      setIsFetchingCities(true);
      try {
        const fetched = await cityApi.getCities();
        setAllCities(fetched);
        setFilteredCities(fetched);
      } catch (e) {
        console.error('Error fetching cities:', e);
        setLocationError('Failed to load cities. Please try again.');
      } finally {
        setIsFetchingCities(false);
      }
    };
    fetchAllCities();
  }, []);

  // Require explicit location name (no default)

  // Keep ref in sync with latest cities
  useEffect(() => {
    allCitiesRef.current = allCities;
  }, [allCities]);

  // Filter cities based on search term
  useEffect(() => {
    if (!citySearchTerm) {
      setFilteredCities(allCities);
    } else {
      const filtered = allCities.filter(c => c.name.toLowerCase().includes(citySearchTerm.toLowerCase()));
      setFilteredCities(filtered);
    }
  }, [citySearchTerm, allCities]);

  // Fetch barangays when city changes
  useEffect(() => {
    const fetchB = async () => {
      if (locationInfo.city_id) {
        try {
          const fetched = await barangayApi.getBarangaysByCity(locationInfo.city_id as UUID);
          setBarangays(fetched);
          if (locationInfo.barangay_id && !fetched.some(b => b.id === locationInfo.barangay_id)) {
            setLocationInfo(prev => ({ ...prev, barangay_id: null, barangay_name: '' }));
          }
        } catch (e) {
          console.error('Error fetching barangays:', e);
          setBarangays([]);
        }
      } else {
        setBarangays([]);
      }
    };
    fetchB();
  }, [locationInfo.city_id, locationInfo.barangay_id]);

  // Initialize and clean up the map
  useEffect(() => {
    if (L && !mapRef.current) {
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

      marker.on('dragend', async (e: L.DragEndEvent) => {
        const pos = e.target.getLatLng();
        setIsGettingLocation(true);
        try {
          const address = await getGeocodedAddress(pos.lat, pos.lng);
          // map names to ids (robust normalization)
          const geoCityNorm = normalizeName(address.city_name);
          const cityMatch = allCitiesRef.current.find(c => {
            const dbNorm = normalizeName(c.name);
            return dbNorm === geoCityNorm || dbNorm.includes(geoCityNorm) || geoCityNorm.includes(dbNorm);
          });
          let barangayMatch: Barangay | undefined;
          if (cityMatch) {
            const fetched = await barangayApi.getBarangaysByCity(cityMatch.id as UUID);
            setBarangays(fetched);
            const geoBarangayNorm = normalizeName(address.barangay_name);
            barangayMatch = fetched.find(b => {
              const dbNorm = normalizeName(b.name);
              return dbNorm === geoBarangayNorm || dbNorm.includes(geoBarangayNorm) || geoBarangayNorm.includes(dbNorm);
            });
            // City is valid in service area; immediately enable barangay dropdown
            setIsGettingLocation(false);
          } else {
            // City not found in service area: reset IDs and show dialog
            setLocationInfo(prev => ({
              ...prev,
              city_id: null,
              city_name: '',
              barangay_id: null,
              barangay_name: '',
            }));
            setCitySearchTerm('');
            setBarangays([]);
            setIsModalOpen(true);
          }
          const cleanAddress = Object.fromEntries(Object.entries(address).map(([k, v]) => [k, v ?? '']));
          setLocationInfo(prev => ({
            ...prev,
            ...cleanAddress,
            city_id: cityMatch?.id ?? null,
            city_name: cityMatch?.name ?? (address.city_name || ''),
            barangay_id: barangayMatch?.id ?? null,
            barangay_name: barangayMatch?.name ?? (address.barangay_name || ''),
          }));
          setCitySearchTerm(cityMatch?.name ?? (address.city_name || ''));
          setLocationMethod('manual');
          setLocationError(null);
        } catch (error) {
          setLocationError('Could not get address.');
        } finally {
          // Keep as safety; no harm if already false
          setIsGettingLocation(false);
        }
      });
    }
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [L]);

  // Handle "Use My Current Location"
  const handleCurrentLocation = () => {
    setLocationMethod('current');
    setIsGettingLocation(true);
    setLocationError(null);

    mockGeolocation(
      async (position) => {
        try {
          const address = await getGeocodedAddress(position.coords.latitude, position.coords.longitude);
          const geoCityNorm = normalizeName(address.city_name);
          const cityMatch = allCitiesRef.current.find(c => {
            const dbNorm = normalizeName(c.name);
            return dbNorm === geoCityNorm || dbNorm.includes(geoCityNorm) || geoCityNorm.includes(dbNorm);
          });
          let barangayMatch: Barangay | undefined;
          if (cityMatch) {
            const fetched = await barangayApi.getBarangaysByCity(cityMatch.id as UUID);
            setBarangays(fetched);
            const geoBarangayNorm = normalizeName(address.barangay_name);
            barangayMatch = fetched.find(b => {
              const dbNorm = normalizeName(b.name);
              return dbNorm === geoBarangayNorm || dbNorm.includes(geoBarangayNorm) || geoBarangayNorm.includes(dbNorm);
            });
          } else {
            // Not a serviced city; clear IDs, disable barangay, and show dialog
            setLocationInfo(prev => ({
              ...prev,
              city_id: null,
              city_name: '',
              barangay_id: null,
              barangay_name: '',
            }));
            setCitySearchTerm('');
            setBarangays([]);
            setIsModalOpen(true);
          }
          const cleanAddress = Object.fromEntries(Object.entries(address).map(([k, v]) => [k, v ?? '']));
          setLocationInfo(prev => ({
            ...prev,
            ...cleanAddress,
            city_id: cityMatch?.id ?? null,
            city_name: cityMatch?.name ?? (address.city_name || ''),
            barangay_id: barangayMatch?.id ?? null,
            barangay_name: barangayMatch?.name ?? (address.barangay_name || ''),
            name: 'Current Location',
          }));
          setCitySearchTerm(cityMatch?.name ?? (address.city_name || ''));
          mapRef.current?.setView([position.coords.latitude, position.coords.longitude], 18);
          markerRef.current?.setLatLng([position.coords.latitude, position.coords.longitude]);
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

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocationInfo(prev => ({ ...prev, [name]: value }));
  };

  // City typeahead handlers
  const handleCitySearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCitySearchTerm(e.target.value);
    setIsCityDropdownOpen(true);
    if (locationInfo.city_name && e.target.value !== locationInfo.city_name) {
      setLocationInfo(prev => ({ ...prev, city_id: null, city_name: '', barangay_id: null, barangay_name: '' }));
    }
  };

  const handleCitySelect = (city: City) => {
    setCitySearchTerm(city.name);
    setIsCityDropdownOpen(false);
    setLocationInfo(prev => ({ ...prev, city_id: city.id, city_name: city.name, barangay_id: null, barangay_name: '' }));
  };

  const handleBarangaySelect = (barangayId: string) => {
    const selected = barangays.find(b => b.id === barangayId);
    if (selected) {
      setLocationInfo(prev => ({ ...prev, barangay_id: selected.id, barangay_name: selected.name }));
    } else {
      setLocationInfo(prev => ({ ...prev, barangay_id: null, barangay_name: '' }));
    }
  };

  // Close city dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cityInputRef.current && !cityInputRef.current.contains(event.target as Node)) {
        setIsCityDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle saving the new location
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // If the new location is set as primary, first update all other locations for this client to be non-primary.
      if (isPrimary) {
        const locations = await clientLocationApi.getByClientId(clientId as UUID);
        for (const loc of locations) {
          if (loc.is_primary) {
            await clientLocationApi.updateClientLocation(loc.id, { is_primary: false });
          }
        }
      }

      const newLocationData = {
        client_id: clientId as UUID,
        name: locationInfo.name || 'My Home',
        address_line1: locationInfo.address_line1!,
        street: locationInfo.street!,
        barangay_id: locationInfo.barangay_id!,
        city_id: locationInfo.city_id!,
        landmark: locationInfo.landmark || null,
        is_primary: isPrimary,
      };
      
      await clientLocationApi.createClientLocation(newLocationData);
      onSave(); // Call the parent's onSave to refresh the list and close the modal
    } catch (err: any) {
      console.error('Error saving location:', err);
      setLocationError('Failed to save location. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const isFormValid = !!(locationInfo.name && locationInfo.address_line1 && locationInfo.barangay_id && locationInfo.city_id && locationInfo.landmark);

  return (
    <div className="space-y-6">
      <div id="map" className="w-full h-64 rounded-lg shadow-inner"></div>

      {locationMethod === 'current' ? (
        <div className="flex items-center space-x-2 text-blue-600">
          {isGettingLocation ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Getting your location...</span>
            </>
          ) : locationError ? (
            <span className="text-red-500">{locationError}</span>
          ) : (
            <span className="text-green-600">Location autofilled successfully!</span>
          )}
        </div>
      ) : null}

      <div className="flex space-x-4 mb-4">
        <Button onClick={handleCurrentLocation} variant="outline" className="flex items-center">
          <MapPin className="h-4 w-4 mr-2" /> Use My Current Location
        </Button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="location-name">Location Name</Label>
            <Input
              id="location-name"
              name="name"
              placeholder="Ex: My House"
              value={locationInfo.name || ''}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="flex items-center space-x-2 mt-4">
            <Checkbox
              id="is-primary"
              name="is_primary"
              checked={isPrimary}
              onCheckedChange={(checked: boolean) => setIsPrimary(checked)}
            />
            <Label htmlFor="is-primary" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-30 overflow-y-auto">
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
              <SelectContent className="max-h-64 overflow-y-auto">
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
              value={locationInfo.address_line1 || ''}
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
              value={locationInfo.street || ''}
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
            value={locationInfo.landmark || ''}
            onChange={handleInputChange}
            disabled={isGettingLocation}
            required
          />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSave}
          disabled={!isFormValid || isSaving}
          className="px-8 py-3 bg-green-600 hover:bg-green-700"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" /> Save Location
            </>
          )}
        </Button>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px] z-[9999]">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-500">
              Location Not in Range
            </DialogTitle>
            <DialogDescription>
              Your city isn`t in our service area yet. Please choose your location from the dropdowns to continue.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setIsModalOpen(false)}>Okay</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
