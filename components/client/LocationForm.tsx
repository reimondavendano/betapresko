'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { clientLocationApi } from '../../pages/api/clientLocation/clientLocationApi';
import type { ClientLocation, UUID } from '@/types/database';
import 'leaflet/dist/leaflet.css';
import type * as L from 'leaflet';

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
      barangay: address.quarter || address.neighbourhood,
      city: address.city || address.town || address.village,
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
  const [locationInfo, setLocationInfo] = useState<Partial<ClientLocation>>({
    name: '',
    address_line1: '',
    street: '',
    barangay: '',
    city: '',
    landmark: '',
  });
  const [locationMethod, setLocationMethod] = useState<'manual' | 'current'>('manual');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrimary, setIsPrimary] = useState(false); // New state for the checkbox
  
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [L, setL] = useState<any>(null);

  // Dynamically import Leaflet
  useEffect(() => {
    import('leaflet').then((module) => {
      setL(module);
    }).catch(console.error);
  }, []);

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
          const cleanAddress = Object.fromEntries(Object.entries(address).map(([k, v]) => [k, v ?? '']));
          setLocationInfo(prev => ({ ...prev, ...cleanAddress }));
          setLocationMethod('manual');
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

  // Handle "Use My Current Location"
  const handleCurrentLocation = () => {
    setLocationMethod('current');
    setIsGettingLocation(true);
    setLocationError(null);

    mockGeolocation(
      async (position) => {
        try {
          const address = await getGeocodedAddress(position.coords.latitude, position.coords.longitude);
          const cleanAddress = Object.fromEntries(Object.entries(address).map(([k, v]) => [k, v ?? '']));
          setLocationInfo(prev => ({ ...prev, ...cleanAddress, name: 'Current Location' }));
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
        barangay: locationInfo.barangay!,
        city: locationInfo.city!,
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

  const isFormValid = locationInfo.address_line1 && locationInfo.barangay && locationInfo.city;

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
              placeholder="e.g., My Home, Office"
              value={locationInfo.name || ''}
              onChange={handleInputChange}
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
              Set as Primary (can be changed later)
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="barangay">Barangay</Label>
            <Input
              id="barangay"
              name="barangay"
              placeholder="Ex: Caingin"
              value={locationInfo.barangay || ''}
              onChange={handleInputChange}
              disabled={isGettingLocation}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              name="city"
              placeholder="Ex: Malolos"
              value={locationInfo.city || ''}
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
    </div>
  );
}
