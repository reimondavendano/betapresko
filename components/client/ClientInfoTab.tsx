'use client';

import { useState, useEffect } from 'react';
import {
  User,
  MapPin,
  Phone,
  Mail,
  Home,
  Edit,
  Loader2,
  AlertCircle,
  QrCode,
  Gift,
  CheckCircle,
  Calendar,
  MessageSquare,
} from 'lucide-react';

import QRCode from "react-qr-code";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

import { clientApi } from '../../pages/api/clients/clientApi';
import { clientLocationApi } from '../../pages/api/clientLocation/clientLocationApi';

import { Client, ClientLocation } from '../../types/database';
import { customSettingsApi } from '@/pages/api/custom_settings/customSettingsApi';

interface ClientInfoTabProps {
  clientId: string;
}

export function ClientInfoTab({ clientId }: ClientInfoTabProps) {
  const [client, setClient] = useState<Client | null>(null);
  const [locations, setLocations] = useState<ClientLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Client>>({});
  const [siteUrl, setSiteUrl] = useState<string>('');


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
        setFormData(fetchedClient);

        const fetchedLocations = await clientLocationApi.getByClientId(clientId);
        setLocations(fetchedLocations);
      } catch (err: any) {
        setError(err.message || 'Failed to load client information.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientData();
  }, [clientId]);

  useEffect(() => {
  const fetchSiteUrl = async () => {
    try {
      const setting = await customSettingsApi.getSetting('site_url');
      if (setting?.setting_value) {
        setSiteUrl(setting.setting_value);
      } else if (typeof window !== 'undefined') {
        setSiteUrl(window.location.origin);
      }
    } catch (err) {
      console.error('Error fetching site_url:', err);
      if (typeof window !== 'undefined') {
        setSiteUrl(window.location.origin);
      }
    }
  };

  fetchSiteUrl();
}, []);

  const handleUpdate = async () => {
    if (!client) return;
    try {
      const updated = await clientApi.updateClient(client.id, {
        name: formData.name,
        mobile: formData.mobile,
        email: formData.email,
        sms_opt_in: formData.sms_opt_in,
      });
      setClient(updated);
      setIsEditOpen(false);
    } catch (err: any) {
      console.error('Update failed', err);
      alert('Failed to update client info.');
    }
  };

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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <Card className="rounded-xl shadow-lg p-6 bg-white">
        <CardHeader className="p-0 mb-6 flex flex-row items-center justify-between border-b pb-3">
          <CardTitle className="text-xl font-bold flex items-center">
            <User className="w-6 h-6 mr-2 text-blue-600" />
            Client Profile
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
            <Edit className="w-4 h-4 mr-2 text-gray-600" /> Edit Profile
          </Button>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {/* Name */}
            <div className="flex items-center">
              <User className="w-5 h-5 mr-3 text-blue-500" />
              <div>
                <p className="text-sm font-semibold text-gray-700">Name</p>
                <p className="text-gray-900">{client.name}</p>
              </div>
            </div>

            {/* Mobile */}
            <div className="flex items-center">
              <Phone className="w-5 h-5 mr-3 text-green-500" />
              <div>
                <p className="text-sm font-semibold text-gray-700">Mobile</p>
                <p className="text-gray-900">{client.mobile}</p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-center">
              <Mail className="w-5 h-5 mr-3 text-purple-500" />
              <div>
                <p className="text-sm font-semibold text-gray-700">Email</p>
                <p className="text-gray-900">{client.email || 'N/A'}</p>
              </div>
            </div>

            {/* Points */}
            <div className="flex items-center">
              <Gift className="w-5 h-5 mr-3 text-orange-500" />
              <div>
                <p className="text-sm font-semibold text-gray-700">Points</p>
                <p className="text-gray-900">{client.points}</p>
              </div>
            </div>

            {/* SMS Opt In */}
            <div className="flex items-center">
              <MessageSquare className="w-5 h-5 mr-3 text-indigo-500" />
              <div>
                <p className="text-sm font-semibold text-gray-700">SMS Opt In</p>
                {client.sms_opt_in ? (
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-lg">
                    Yes
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg">
                    No
                  </span>
                )}
              </div>
            </div>

            {/* QR Code */}
             <div className="flex items-center">
              <QrCode className="w-5 h-5 mr-3 text-pink-500" />
              <div>
                <p className="text-sm font-semibold text-gray-700">Scan for user profile</p>
                <div className="mt-1 border rounded-lg shadow-sm p-2 bg-gray-50 inline-block">
                  <QRCode
                    value={`${siteUrl}${client.qr_code}`}
                    size={200}
                    bgColor="transparent" // optional
                  />
                </div>
              </div>
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
        </CardHeader>
        <CardContent className="p-0 space-y-4">
          {locations.length > 0 ? (
            locations.map((location) => (
              <div key={location.id} className="border rounded-lg p-4 bg-gray-50 shadow-sm">
                <div className="flex items-center">
                  <Home className="w-5 h-5 mr-2 text-gray-600" />
                  <h3 className="font-medium">{location.name}</h3>
                  {location.is_primary && (
                    <Badge className="ml-2 bg-blue-100 text-blue-800">Primary</Badge>
                  )}
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

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Client Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Name</label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Mobile</label>
              <Input
                value={formData.mobile || ''}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Email</label>
              <Input
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={formData.sms_opt_in || false}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, sms_opt_in: !!checked })
                }
              />
              <label className="text-sm">SMS Opt In</label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdate}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
