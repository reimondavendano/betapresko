'use client';

import { useState, useEffect } from 'react';
import { User, MapPin, Phone, Mail, Home, Edit, Loader2, AlertCircle, Trash2, Plus } from 'lucide-react';

// Import UI components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Import API functions
import { clientApi } from '../../pages/api/clients/clientApi';
import { clientLocationApi } from '../../pages/api/clientLocation/clientLocationApi';


// Import types
import { Client, ClientLocation, UUID } from '../../types/database';

interface ClientInfoTabProps {
  clientId: string;
}

export function ClientInfoTab({ clientId }: ClientInfoTabProps) {
  const [client, setClient] = useState<Client | null>(null);
  const [locations, setLocations] = useState<ClientLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  // Fetch client-specific data
  useEffect(() => {
    const fetchClientData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedClient = await clientApi.getClientById(clientId);
        if (!fetchedClient) {
          setError('Client not found.');
          setIsLoading(false);
          return;
        }
        setClient(fetchedClient);

        const fetchedLocations = await clientLocationApi.getByClientId(clientId);
        setLocations(fetchedLocations);

      } catch (err: any) {
        console.error('Error fetching client info data:', err);
        setError(err.message || 'Failed to load client information.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientData();
  }, [clientId]);

  // --- Helper functions to get names from IDs ---


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-gray-50 rounded-xl shadow-lg">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
        <p className="ml-4 text-gray-600">Loading client information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-red-50 rounded-xl shadow-lg text-red-700 p-6">
        <AlertCircle className="w-12 h-12 mb-4" />
        <h2 className="text-xl font-bold mb-2">Error Loading Client Info</h2>
        <p className="text-center">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4 bg-blue-600 hover:bg-blue-700">
          Retry
        </Button>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-orange-50 rounded-xl shadow-lg text-orange-700 p-6">
        <AlertCircle className="w-12 h-12 mb-4" />
        <h2 className="text-xl font-bold mb-2">Client Not Found</h2>
        <p className="text-center">The client ID provided does not exist.</p>
        <Button onClick={() => window.location.href = '/'} className="mt-4 bg-blue-600 hover:bg-blue-700">
          Go to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <Card className="rounded-xl shadow-lg p-6 bg-white">
        <CardHeader className="p-0 mb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center">
            <User className="w-5 h-5 mr-2 text-blue-600" />
            Personal Information
          </CardTitle>
          {/* <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" /> Edit
          </Button> */}
        </CardHeader>
        <CardContent className="p-0 space-y-4">
          <div>
            <p className="font-semibold text-gray-900">Full Name</p>
            <p className="text-gray-700">{client.name}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Mobile Number</p>
            <div className="flex items-center text-gray-700">
              <Phone className="w-4 h-4 mr-2 text-gray-500" /> {client.mobile}
            </div>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Email Address</p>
            <div className="flex items-center text-gray-700">
              <Mail className="w-4 h-4 mr-2 text-gray-500" /> {client.email || 'N/A'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registered Locations */}
      <Card className="rounded-xl shadow-lg p-6 bg-white">
        <CardHeader className="p-0 mb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-blue-600" />
            Registered Locations
          </CardTitle>
          {/* <Button variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" /> Add Location
          </Button> */}
        </CardHeader>
        <CardContent className="p-0 space-y-4">
          {locations.length > 0 ? (
            locations.map((location) => (
              <div key={location.id} className="border rounded-lg p-4 bg-gray-50 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <Home className="w-5 h-5 mr-2 text-gray-600" />
                    <h3 className="font-medium">{location.name}</h3>
                    {location.is_primary && (
                      <Badge className="ml-2 bg-blue-100 text-blue-800">Primary</Badge>
                    )}
                  </div>
                  {/* <div className="flex space-x-2">
                    <Button size="sm" variant="ghost">
                      <Edit className="w-4 h-4 text-gray-600" />
                    </Button>
                    {!location.is_primary && (
                      <Button size="sm" variant="ghost" className="text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div> */}
                </div>
                <p className="text-gray-600 text-sm">
                  {location.address_line1}, {location.street}, {location.barangay_name}, {location.city_name}
                </p>
                {location.landmark && (
                  <p className="text-gray-500 text-sm">Landmark: {location.landmark}</p>
                )}
              </div>
            ))
          ) : (
            <p className="text-gray-600 text-center py-4">No locations registered.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
