'use client';

import { useState, useEffect } from 'react';
import { MapPin, Plus, Loader2, AlertCircle, Home } from 'lucide-react';
import { ClientLocation, UUID } from '@/types/database';
import { clientLocationApi } from '../../pages/api/clientLocation/clientLocationApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

// Import the new LocationForm component
import { LocationForm } from '../../components/client/LocationForm';
import { Badge } from '../ui/badge';

interface ClientAddLocationTabProps {
  clientId: string;
}

const formatAddress = (location: ClientLocation) => {
  const parts = [
    location.address_line1,
    location.street,
    location.barangay_name,
    location.city_name
  ].filter(Boolean);
  return parts.join(', ');
};

export function ClientAddLocationTab({ clientId }: ClientAddLocationTabProps) {
  const [locations, setLocations] = useState<ClientLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [isUpdatingPrimary, setIsUpdatingPrimary] = useState(false);

  const fetchLocations = async () => {
    setIsLoading(true);
    try {
      const fetchedLocations = await clientLocationApi.getByClientId(clientId as UUID);
      setLocations(fetchedLocations);

      // Set the selected radio button to the current primary location on load
      const primaryLocation = fetchedLocations.find(loc => loc.is_primary);
      if (primaryLocation) {
        setSelectedLocationId(primaryLocation.id);
      }
    } catch (err: any) {
      console.error('Error fetching client locations:', err);
      setError(err.message || 'Failed to load locations.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePrimary = async () => {
    if (!selectedLocationId) return;

    setIsUpdatingPrimary(true);
    try {
      // Find the currently selected location and its original state
      const newPrimaryLocation = locations.find(loc => loc.id === selectedLocationId);
      const currentPrimaryLocation = locations.find(loc => loc.is_primary);

      // Only proceed if the selected location is different from the current primary
      if (newPrimaryLocation && newPrimaryLocation.id !== currentPrimaryLocation?.id) {
        const updatePromises = [];

        // Set the new primary to true
        updatePromises.push(clientLocationApi.updateClientLocation(newPrimaryLocation.id, { is_primary: true }));
        
        // If there was a previous primary, set it to false
        if (currentPrimaryLocation) {
          updatePromises.push(clientLocationApi.updateClientLocation(currentPrimaryLocation.id, { is_primary: false }));
        }

        await Promise.all(updatePromises);
        
        // Refetch locations to show the updated state
        await fetchLocations();
      }
    } catch (err: any) {
      console.error('Error updating primary location:', err);
      setError('Failed to update primary location. Please try again.');
    } finally {
      setIsUpdatingPrimary(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, [clientId]);

  const handleLocationAdded = () => {
    fetchLocations();
    setIsModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-gray-50 rounded-xl shadow-lg">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
        <p className="ml-4 text-gray-600">Loading client locations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-red-50 rounded-xl shadow-lg text-red-700 p-6">
        <AlertCircle className="w-12 h-12 mb-4" />
        <h2 className="text-xl font-bold mb-2">Error Loading Locations</h2>
        <p className="text-center">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="rounded-xl shadow-lg p-6 bg-white">
        <CardHeader className="p-0 mb-4 flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-gray-700" />
            Your Locations
          </CardTitle>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" /> Add New Location
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <Home className="w-5 h-5 mr-2" /> Add New Location
                </DialogTitle>
              </DialogHeader>
              <LocationForm clientId={clientId} onSave={handleLocationAdded} />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0 space-y-4">
          {locations.length > 0 ? (
            <>
              <RadioGroup
                value={selectedLocationId || ''}
                onValueChange={setSelectedLocationId}
                className="space-y-4"
              >
                {locations.map((location) => (
                  <div
                    key={location.id}
                    className="flex items-start p-4 border border-gray-200 rounded-lg shadow-sm transition-all hover:bg-gray-50"
                  >
                    <RadioGroupItem
                      value={location.id}
                      id={`location-${location.id}`}
                      className="mt-1"
                    />
                    <div className="ml-4 flex-grow">
                      <div className="flex items-center space-x-2">
                        <Label htmlFor={`location-${location.id}`} className="flex-grow">
                          <p className="font-semibold text-lg flex items-center">
                            <Home className="w-4 h-4 mr-2 text-gray-500" />
                            {location.name}
                          </p>
                          <p className="text-sm text-gray-600">{formatAddress(location)}</p>
                        </Label>
                        {location.is_primary && (
                          <Badge className="bg-green-500 hover:bg-green-600 text-white">
                            Primary
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </RadioGroup>
              <div className="flex justify-end mt-4">
                <Button
                  onClick={handleUpdatePrimary}
                  disabled={!selectedLocationId || isUpdatingPrimary}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isUpdatingPrimary ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating...
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4 mr-2" /> Update Primary Location
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">No locations found. Click `Add New Location` to get started.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
