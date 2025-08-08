'use client'

import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '../../lib/store'
import { setStep, setLocationInfo, setLocationMethod, setClientId } from '../../lib/features/booking/bookingSlice'
import { MapPin, ChevronRight, Loader2 } from 'lucide-react'
import { ClientLocation } from '@/types/database';
import { clientLocationApi } from '../../pages/api/clientLocation/clientLocationApi';
import 'leaflet/dist/leaflet.css';
import type * as L from 'leaflet';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

const toBoolean = (value: unknown): boolean => !!value;

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

const getGeocodedAddress = async (lat: number, lng: number): Promise<Partial<ClientLocation>> => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    if (!response.ok) throw new Error('Failed to fetch address');

    const data = await response.json();
    const address = data.address;

    console.log(address);

    return {
      address_line1: address.house_number ? `${address.house_number} ${address.residential}` : address.road,
      street: address.road,
      barangay: address.quarter,
      city: address.city + ', ' + address.state,
      landmark: address.amenity || address.shop || address.historic,
    };
  } catch (error) {
    console.error('Reverse Geocoding Error:', error);
    throw new Error('Could not get address');
  }
};

export function LocationStep() {
  const dispatch = useDispatch();
  const { locationInfo, locationMethod, clientId } = useSelector((state: RootState) => state.booking);

  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const locationMethodRef = useRef(locationMethod);
  const [L, setL] = useState<any>(null);

  useEffect(() => {
    import('leaflet').then((module) => {
      setL(module);
    }).catch(console.error);
  }, []);

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

      let markerWasDragged = false;

      marker.on('dragstart', () => {
        isDraggingRef.current = true;
        markerWasDragged = true;
      });

      marker.on('dragend', async () => {
        const pos = marker.getLatLng();
        isDraggingRef.current = false;

        setIsGettingLocation(true);
        try {
          const address = await getGeocodedAddress(pos.lat, pos.lng);
          const cleanAddress = Object.fromEntries(Object.entries(address).map(([k, v]) => [k, v ?? '']));
          dispatch(setLocationInfo({ ...locationInfo, ...cleanAddress, name: 'My House' }));
          dispatch(setLocationMethod('manual'));
          setLocationError(null);
        } catch (error) {
          setLocationError('Could not get address.');
        } finally {
          setIsGettingLocation(false);
          markerWasDragged = false;
        }
      });

      map.on('moveend', async () => {
        if (markerWasDragged) return;

        const center = map.getCenter();
        setIsGettingLocation(true);
        try {
          const address = await getGeocodedAddress(center.lat, center.lng);
          const cleanAddress = Object.fromEntries(Object.entries(address).map(([k, v]) => [k, v ?? '']));
          dispatch(setLocationInfo({ ...locationInfo, ...cleanAddress, name: 'My House' }));
          if (locationMethodRef.current !== 'current') {
            dispatch(setLocationMethod('manual'));
          }
          setLocationError(null);
        } catch (error) {
          setLocationError('Could not get address.');
        } finally {
          setIsGettingLocation(false);
        }
      });
    }
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [L]);

  useEffect(() => {
    locationMethodRef.current = locationMethod;

    if (locationMethod === 'current' && L && mapRef.current && markerRef.current) {
      setIsGettingLocation(true);
      setLocationError(null);

      const timeoutId = setTimeout(() => {
        if (locationMethodRef.current === 'current') {
          setLocationError('Timed out. Please try again.');
          setIsGettingLocation(false);
          dispatch(setLocationMethod('manual'));
        }
      }, 7000);

      mockGeolocation(
        async (position) => {
          try {
            const address = await getGeocodedAddress(position.coords.latitude, position.coords.longitude);
            const cleanAddress = Object.fromEntries(Object.entries(address).map(([k, v]) => [k, v ?? '']));
            dispatch(setLocationInfo({ ...locationInfo, ...cleanAddress, name: 'Current Location' }));
            mapRef.current?.setView([position.coords.latitude, position.coords.longitude], 18);
            markerRef.current?.setLatLng([position.coords.latitude, position.coords.longitude]);
          } catch (error) {
            setLocationError('Could not get address.');
          } finally {
            clearTimeout(timeoutId);
            setIsGettingLocation(false);
          }
        },
        () => {
          clearTimeout(timeoutId);
          setLocationError('Failed to get current location.');
          setIsGettingLocation(false);
          dispatch(setLocationMethod('manual'));
        }
      );

      return () => clearTimeout(timeoutId);
    }
  }, [locationMethod, dispatch, L]);

  useEffect(() => {
    const updateMapFromAddress = async () => {
      if (!L || !mapRef.current || !markerRef.current) return;

      const { address_line1, street, barangay, city } = locationInfo;
      if (!address_line1 || !street || !barangay || !city) return;

      const fullAddress = `${address_line1}, ${street}, ${barangay}, ${city}, Philippines`;

      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}`);
        const data = await response.json();
        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          const latNum = parseFloat(lat);
          const lonNum = parseFloat(lon);
          mapRef.current.setView([latNum, lonNum], 18);
          markerRef.current.setLatLng([latNum, lonNum]);
        }
      } catch (err) {
        console.error("Geocoding failed:", err);
      }
    };

    updateMapFromAddress();
  }, [locationInfo.address_line1, locationInfo.street, locationInfo.barangay, locationInfo.city, L]);

  const handleNext = () => {
    dispatch(setStep(2));
  };

  const handleLocationMethodChange = (value: 'manual' | 'current') => {
    dispatch(setLocationMethod(value));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    dispatch(setLocationInfo({ ...locationInfo, [name]: type === 'checkbox' ? toBoolean(checked) : value }));
  };
  


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

            {/* Location Method Selection */}
            <RadioGroup
              onValueChange={handleLocationMethodChange}
              value={locationMethod}
              className="flex space-x-4 mb-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="current" id="current" />
                <Label htmlFor="current" className="text-gray-700">Use My Current Location</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="manual" />
                <Label htmlFor="manual" className="text-gray-700">Manual Input Address</Label>
              </div>
            </RadioGroup>

            {locationMethod === 'current' && (
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
            )}

            {/* Form Inputs */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location-name">Location Name</Label>
                  <Input
                    id="location-name"
                    name="name"
                    placeholder="e.g., My Home, Office"
                    value={locationInfo.name}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="flex items-center space-x-2">
                   <Checkbox
                    id="is-primary"
                    name="is_primary"
                    checked={true} // Hardcoded to true
                    disabled // Making it read-only
                  />
                  <Label htmlFor="is-primary" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Set as Primary
                  </Label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address-line1">Address Line 1</Label>
                  <Input
                    id="address-line1"
                    name="address_line1"
                    placeholder="Ex: Block C Lot 3"
                    value={locationInfo.address_line1}
                    onChange={handleInputChange}
                    disabled={isGettingLocation && locationMethod === 'current'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="street">Street</Label>
                  <Input
                    id="street"
                    name="street"
                    placeholder="Ex: 24 De Agosto"
                    value={locationInfo.street}
                    onChange={handleInputChange}
                    disabled={isGettingLocation && locationMethod === 'current'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="barangay">Barangay</Label>
                  <Input
                    id="barangay"
                    name="barangay"
                    placeholder="Ex: Caingin"
                    value={locationInfo.barangay}
                    onChange={handleInputChange}
                    disabled={isGettingLocation && locationMethod === 'current'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    name="city"
                    placeholder="Ex: Malolos"
                    value={locationInfo.city}
                    onChange={handleInputChange}
                    disabled={isGettingLocation && locationMethod === 'current'}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="landmark">Landmark</Label>
                <Input
                  id="landmark"
                  name="landmark"
                  placeholder="Ex: Beside Alfamart"
                  value={locationInfo.landmark}
                  onChange={handleInputChange}
                  disabled={isGettingLocation && locationMethod === 'current'}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center mt-8">
          <Button
            onClick={handleNext}
            disabled={!locationInfo.address_line1 || !locationInfo.barangay || !locationInfo.city}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700"
          >
            Continue to Services
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
