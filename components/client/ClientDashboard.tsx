'use client'; // This component needs client-side interactivity

import { useState, useEffect } from 'react';
import {
  User,
  MapPin,
  Calendar,
  Settings,
  Plus,
  Edit,
  Trash2,
  QrCode,
  Star,
  Clock,
  Loader2, // For loading spinner
  AlertCircle // For error messages
} from 'lucide-react';

// Import UI components from your shared UI library
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Import API functions
import { clientApi } from '../../pages/api/clients/clientApi';
import { clientLocationApi } from '../../pages/api/clientLocation/clientLocationApi'; // Assuming you have a getByClientId for locations
import { appointmentApi } from '../../pages/api/appointments/appointmentApi'; // Assuming you have a getByClientId for appointments
import { deviceApi } from '../../pages/api/device/deviceApi'; // Assuming you have a getByClientId for devices
import { locationApi } from '../../pages/api/city/locationApi'; // For fetching city/barangay names
import { servicesApi } from '../../pages/api/service/servicesApi'; // For fetching service names
import { brandsApi } from '../../pages/api/brands/brandsApi'; // For fetching brand names
import { acTypesApi } from '../../pages/api/types/acTypesApi'; // For fetching AC type names
import { horsepowerApi } from '../../pages/api/horsepower/horsepowerApi'; // For fetching horsepower names

// Import types
import { Client, ClientLocation, Appointment, Device, City, Barangay, Service, Brand, ACType, HorsepowerOption, UUID } from '../../types/database';

// Logo component (can remain inline or be moved)
const Logo = () => <span className="text-2xl font-bold text-blue-600 font-inter">Presko</span>;

// Interface for component props
interface ClientDashboardProps {
  params: {
    id?: string; // Client ID passed from the URL
  };
}

const ClientDashboard = ({ params }: ClientDashboardProps) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const clientId = params?.id;

  const [client, setClient] = useState<Client | null>(null);
  const [locations, setLocations] = useState<ClientLocation[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lookup data for displaying names instead of IDs
  const [allCities, setAllCities] = useState<City[]>([]);
  const [allBarangays, setAllBarangays] = useState<Barangay[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [allACTypes, setAllACTypes] = useState<ACType[]>([]);
  const [allHorsepowerOptions, setAllHorsepowerOptions] = useState<HorsepowerOption[]>([]);


  // --- Data Fetching Effects ---

  // Fetch all lookup data (cities, barangays, services, brands, AC types, HP options)
  useEffect(() => {
    const fetchLookupData = async () => {
      try {
        const [citiesData, barangaysData, servicesData, brandsData, acTypesData, hpOptionsData] = await Promise.all([
          locationApi.getCities(),
          locationApi.getAllBarangays(), // Now this method exists
          servicesApi.getServices(), // Assuming a getServices method
          brandsApi.getBrands(), // Assuming a getBrands method
          acTypesApi.getACTypes(), // Assuming a getACTypes method
          horsepowerApi.getHorsepowerOptions(), // Assuming a getHorsepowerOptions method
        ]);
        setAllCities(citiesData);
        setAllBarangays(barangaysData);
        setAllServices(servicesData);
        setAllBrands(brandsData);
        setAllACTypes(acTypesData);
        setAllHorsepowerOptions(hpOptionsData);
      } catch (err: any) {
        console.error('Error fetching lookup data:', err);
        setError('Failed to load essential data.');
      }
    };
    fetchLookupData();
  }, []); // Run once on mount

  // Fetch client-specific data
  useEffect(() => {
    const fetchClientData = async () => {
      if (!clientId) {
        setError('Client ID is missing.');
        setIsLoading(false);
        return;
      }

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

        // const [fetchedLocations, fetchedDevices, fetchedAppointments] = await Promise.all([
        //   clientLocationApi.getByClientId(clientId), // Now this method exists
        //   deviceApi.getByClientId(clientId), // Now this method exists
        //   appointmentApi.getByClientId(clientId), // Now this method exists
        // ]);
        // setLocations(fetchedLocations);
        // setDevices(fetchedDevices);
        // setAppointments(fetchedAppointments);

      } catch (err: any) {
        console.error('Error fetching client dashboard data:', err);
        setError(err.message || 'Failed to load client data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientData();
  }, [clientId]); // Re-fetch if client ID changes

  // --- Helper functions to get names from IDs ---
  const getCityName = (id: UUID | null) => allCities.find(c => c.id === id)?.name || 'N/A';
  const getBarangayName = (id: UUID | null) => allBarangays.find(b => b.id === id)?.name || 'N/A';
  const getServiceName = (id: UUID | null) => allServices.find(s => s.id === id)?.name || 'N/A';
  const getBrandName = (id: UUID | null) => allBrands.find(b => b.id === id)?.name || 'N/A';
  const getACTypeName = (id: UUID | null) => allACTypes.find(t => t.id === id)?.name || 'N/A';
  const getHorsepowerDisplayName = (id: UUID | null) => allHorsepowerOptions.find(hp => hp.id === id)?.display_name || 'N/A';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-inter">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
        <p className="ml-4 text-gray-600">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 font-inter text-red-700">
        <AlertCircle className="w-12 h-12 mb-4" />
        <h2 className="text-xl font-bold mb-2">Error Loading Dashboard</h2>
        <p className="text-center">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4 bg-blue-600 hover:bg-blue-700">
          Retry
        </Button>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 font-inter text-gray-700">
        <AlertCircle className="w-12 h-12 mb-4" />
        <h2 className="text-xl font-bold mb-2">Client Not Found</h2>
        <p className="text-center">The client ID provided does not exist.</p>
        {/* Potentially redirect to home or a "create new client" page */}
        <Button onClick={() => window.location.href = '/'} className="mt-4 bg-blue-600 hover:bg-blue-700">
          Go to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Logo />
            <div className="text-sm text-gray-500">
              Welcome, {client.name}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="rounded-xl">
              <CardHeader className="text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-10 h-10 text-blue-600" />
                </div>
                <CardTitle>{client.name}</CardTitle>
                <p className="text-sm text-gray-500">{client.mobile}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`w-full text-left p-2 rounded-lg transition-colors duration-200 ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`w-full text-left p-2 rounded-lg transition-colors duration-200 ${activeTab === 'profile' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                  >
                    Edit Profile
                  </button>
                  <button
                    onClick={() => setActiveTab('locations')}
                    className={`w-full text-left p-2 rounded-lg transition-colors duration-200 ${activeTab === 'locations' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                  >
                    Locations
                  </button>
                  <button
                    onClick={() => setActiveTab('devices')}
                    className={`w-full text-left p-2 rounded-lg transition-colors duration-200 ${activeTab === 'devices' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                  >
                    AC Units
                  </button>
                  <button
                    onClick={() => setActiveTab('appointments')}
                    className={`w-full text-left p-2 rounded-lg transition-colors duration-200 ${activeTab === 'appointments' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                  >
                    Appointments
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Stats */}
                <div className="grid md:grid-cols-3 gap-6">
                  <Card className="rounded-xl">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Points</p>
                          <p className="text-3xl font-bold text-blue-600">{client.points}</p>
                        </div>
                        <Star className="w-8 h-8 text-yellow-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-xl">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                          <p className="text-3xl font-bold text-green-600">{appointments.length}</p>
                        </div>
                        <Calendar className="w-8 h-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-xl">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">AC Units</p>
                          <p className="text-3xl font-bold text-purple-600">{devices.length}</p>
                        </div>
                        <Settings className="w-8 h-8 text-purple-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* QR Code */}
                <Card className="rounded-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <QrCode className="w-5 h-5 mr-2" />
                      Your QR Code
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="w-48 h-48 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
                      {client.qr_code ? (
                        <img src={client.qr_code} alt="QR Code" className="w-48 h-48 rounded-lg" />
                      ) : (
                        <p className="text-gray-500 text-sm">QR Code not available</p>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      Scan this QR code to quickly access your dashboard
                    </p>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="rounded-xl">
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      <Button className="w-full bg-blue-600 text-white hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Book New Service
                      </Button>
                      <Button variant="outline" className="w-full border-blue-600 text-blue-600 hover:bg-blue-50">
                        <MapPin className="w-4 h-4 mr-2" />
                        Add Location
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'locations' && (
              <Card className="rounded-xl">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>My Locations</CardTitle>
                  <Button className="bg-blue-600 text-white hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Location
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {locations.length > 0 ? (
                      locations.map((location) => (
                        <div key={location.id} className="border rounded-lg p-4 bg-white shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <h3 className="font-medium">{location.name}</h3>
                              {location.is_primary && (
                                <Badge className="ml-2 bg-blue-100 text-blue-800">Primary</Badge>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline">
                                <Edit className="w-4 h-4 text-gray-600" />
                              </Button>
                              {!location.is_primary && (
                                <Button size="sm" variant="outline" className="text-red-600">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <p className="text-gray-600 text-sm">
                            {location.address_line1}, {location.street}, {getBarangayName(location.barangay_id)}, {getCityName(location.city_id)}
                          </p>
                          {location.landmark && (
                            <p className="text-gray-500 text-sm">Landmark: {location.landmark}</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-600 text-center">No locations found.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'devices' && (
              <Card className="rounded-xl">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>My AC Units</CardTitle>
                  <Button className="bg-blue-600 text-white hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Device
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {devices.length > 0 ? (
                      devices.map((device) => (
                        <div key={device.id} className="border rounded-lg p-4 bg-white shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium">
                              {getBrandName(device.brand_id)} {getACTypeName(device.ac_type_id)} - {getHorsepowerDisplayName(device.horsepower_id)}
                            </h3>
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline">
                                <Edit className="w-4 h-4 text-gray-600" />
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-600">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-gray-600 text-sm mb-2">Location: {locations.find(loc => loc.id === device.location_id)?.name || 'N/A'}</p>
                          <div className="flex items-center text-sm text-gray-500">
                            <Clock className="w-4 h-4 mr-1" />
                            Last cleaned: {device.last_cleaning_date || 'N/A'}
                          </div>
                          <div className="mt-2">
                            {device.due_3_months && (
                              <Badge variant="outline" className="text-orange-600 border-orange-600">
                                Due for cleaning (3M): {device.due_3_months}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-600 text-center">No AC units found.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'appointments' && (
              <Card className="rounded-xl">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>My Appointments</CardTitle>
                  <Button className="bg-blue-600 text-white hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Book Service
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {appointments.length > 0 ? (
                      appointments.map((appointment) => (
                        <div key={appointment.id} className="border rounded-lg p-4 bg-white shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium">{getServiceName(appointment.service_id)}</h3>
                            <Badge 
                              className={
                                appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                appointment.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'
                              }
                            >
                              {appointment.status}
                            </Badge>
                          </div>
                          <p className="text-gray-600 text-sm">Date: {appointment.appointment_date}</p>
                          <p className="text-gray-600 text-sm">Location: {locations.find(loc => loc.id === appointment.location_id)?.name || 'N/A'}</p>
                          <p className="text-gray-600 text-sm">Amount: ₱{appointment.amount.toLocaleString()}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-600 text-center">No appointments found.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'profile' && (
              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="font-semibold text-gray-900">Name</p>
                      <p className="text-gray-700">{client.name}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Mobile</p>
                      <p className="text-gray-700">{client.mobile}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Email</p>
                      <p className="text-gray-700">{client.email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">SMS Opt-in</p>
                      <p className="text-gray-700">{client.sms_opt_in ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;
