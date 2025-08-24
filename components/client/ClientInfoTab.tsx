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
  Crown,
  Star,
  Shield,
  Copy,
  ExternalLink,
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
import { ReferFriendTab } from './ReferFriendTab';


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

  // Helper function to copy QR code URL
  const copyQRCodeUrl = async () => {
    try {
      await navigator.clipboard.writeText(`${siteUrl}${client?.qr_code}`);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  return (
    <div className="space-y-8 mx-auto">
      {/* Hero Section - Client Overview */}
      <div className="rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden" style={{ backgroundColor: "#99BCC0" }}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between">
          <div className="flex items-center space-x-4 mb-6 md:mb-0">
            <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{client.name}</h1>
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center space-x-1">
                  <Phone className="w-4 h-4" />
                  <span className="text-blue-100">{client.mobile}</span>
                </div>
                {client.email && (
                  <div className="flex items-center space-x-1">
                    <Mail className="w-4 h-4" />
                    <span className="text-blue-100">{client.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mb-2">
                <Gift className="w-8 h-8 text-white" />
              </div>
              <p className="text-2xl font-bold">{client.points}</p>
              <p className="text-blue-100 text-sm">Loyalty Points</p>
            </div> */}
            
            <Button 
              onClick={() => setIsEditOpen(true)}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white"
              size="lg"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Client Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 p-6">
              <CardTitle className="text-xl font-bold text-gray-800 flex items-center">
                <div className="p-2 bg-blue-500 rounded-lg mr-3">
                  <User className="w-5 h-5 text-white" />
                </div>
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div className="group">
                  <div className="flex items-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
                    <div className="p-2 bg-blue-100 rounded-lg mr-4">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Full Name</p>
                      <p className="text-lg font-medium text-gray-900">{client.name}</p>
                    </div>
                  </div>
                </div>

                {/* Mobile */}
                <div className="group">
                  <div className="flex items-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
                    <div className="p-2 bg-green-100 rounded-lg mr-4">
                      <Phone className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Mobile Number</p>
                      <p className="text-lg font-medium text-gray-900">{client.mobile}</p>
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="group">
                  <div className="flex items-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
                    <div className="p-2 bg-purple-100 rounded-lg mr-4">
                      <Mail className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Email Address</p>
                      <p className="text-lg font-medium text-gray-900">{client.email || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                {/* SMS Preferences */}
                <div className="group">
                  <div className="flex items-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
                    <div className="p-2 bg-indigo-100 rounded-lg mr-4">
                      <MessageSquare className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">SMS Notifications</p>
                      <div className="flex items-center space-x-2 mt-1">
                        {client.sms_opt_in ? (
                          <>
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span className="text-lg font-medium text-green-700">Enabled</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-5 h-5 text-gray-400" />
                            <span className="text-lg font-medium text-gray-500">Disabled</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

                    {/* Refer a Friend Section */}
          <ReferFriendTab clientId={clientId} />
        </div>

        {/* Right Column - QR Code & Stats */}
        <div className="space-y-6">
          {/* QR Code Card */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-purple-50 rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 p-6">
              <CardTitle className="text-lg font-bold text-gray-800 flex items-center">
                <div className="p-2 bg-purple-500 rounded-lg mr-3">
                  <QrCode className="w-5 h-5 text-white" />
                </div>
                Client QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 text-center">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-purple-100 inline-block">
                <QRCode
                  value={`${siteUrl}${client.qr_code}`}
                  size={180}
                  bgColor="#ffffff"
                  fgColor="#6366f1"
                  className="rounded-lg"
                />
              </div>
              <p className="text-sm text-gray-600 mt-4 mb-4">Scan to view client profile</p>
              <div className="flex space-x-2">
                <Button 
                  onClick={copyQRCodeUrl}
                  variant="outline" 
                  size="sm" 
                  className="flex-1 border-purple-200 hover:bg-purple-50"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy URL
                </Button>
                <Button 
                  onClick={() => window.open(`${siteUrl}${client.qr_code}`, '_blank')}
                  variant="outline" 
                  size="sm" 
                  className="flex-1 border-purple-200 hover:bg-purple-50"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Loyalty Points Card */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-full mb-4">
                  <Crown className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Loyalty Points</h3>
                <div className="text-4xl font-bold text-orange-600 mb-2">{client.points}</div>
                <p className="text-sm text-gray-600">Total earned points</p>
                <div className="mt-4 p-3 bg-white/60 rounded-lg">
                  <div className="flex items-center justify-center space-x-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium text-gray-700">Valued Customer</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Registered Locations */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100 p-6">
          <CardTitle className="text-xl font-bold text-gray-800 flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-green-500 rounded-lg mr-3">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              Registered Locations
            </div>
            <Badge variant="outline" className="text-sm px-3 py-1">
              {locations.length} {locations.length === 1 ? 'location' : 'locations'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {locations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {locations.map((location, index) => (
                <div key={location.id} className="group">
                  <div className="relative p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
                    {/* Location Icon and Primary Badge */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-3 rounded-lg ${
                          location.is_primary 
                            ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          <Home className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">{location.name}</h3>
                          {location.is_primary && (
                            <div className="flex items-center space-x-1 mt-1">
                              <Crown className="w-4 h-4 text-blue-500" />
                              <Badge className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1">
                                Primary Location
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Address Information */}
                    <div className="space-y-3">
                      <div className="flex items-start space-x-2">
                        <MapPin className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                        <div className="text-sm text-gray-600 leading-relaxed">
                          <p className="font-medium text-gray-800">{location.address_line1}</p>
                          <p>{location.street}, {location.barangay_name}</p>
                          <p className="font-medium">{location.city_name}</p>
                        </div>
                      </div>
                      
                      {location.landmark && (
                        <div className="flex items-start space-x-2">
                          <Star className="w-4 h-4 text-yellow-500 mt-1 flex-shrink-0" />
                          <p className="text-sm text-gray-600">
                            <span className="font-medium text-gray-700">Landmark:</span> {location.landmark}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Decorative element for primary location */}
                    {location.is_primary && (
                      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-blue-500/20 to-transparent rounded-bl-3xl"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <MapPin className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Locations Registered</h3>
              <p className="text-gray-500">This client hasn`t registered any locations yet.</p>
            </div>
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
