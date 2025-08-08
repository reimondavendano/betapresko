'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
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
  Loader2,
  AlertCircle,
  TrendingUp,
  DollarSign,
  AirVent,
  Mail,
  Phone,
  Home,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { format, addMonths, isBefore, addYears } from 'date-fns';

// Import UI components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// --- CORRECTED API IMPORTS ---
import { clientApi } from '../../pages/api/clients/clientApi';
import { clientLocationApi } from '../../pages/api/clientLocation/clientLocationApi';
import { appointmentApi } from '../../pages/api/appointments/appointmentApi';
import { deviceApi } from '../../pages/api/device/deviceApi';
import { servicesApi } from '../../pages/api/service/servicesApi';
import { brandsApi } from '../../pages/api/brands/brandsApi';
import { acTypesApi } from '../../pages/api/types/acTypesApi';
import { horsepowerApi } from '../../pages/api/horsepower/horsepowerApi';

// Import types
import { Client, ClientLocation, Appointment, Device, Service, Brand, ACType, HorsepowerOption, UUID } from '../../types/database';

interface ClientDashboardTabProps {
  clientId: string;
  onBookNewCleaningClick: () => void;
  onReferClick: () => void;
}

// Helper function to format the full address
const formatAddress = (location: ClientLocation) => {
  const parts = [
    location.address_line1,
    location.street,
    location.barangay,
    location.city
  ].filter(Boolean);
  return parts.join(', ');
};

export function ClientDashboardTab({ clientId, onBookNewCleaningClick, onReferClick }: ClientDashboardTabProps) {
  const [client, setClient] = useState<Client | null>(null);
  const [locations, setLocations] = useState<ClientLocation[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  const [allServices, setAllServices] = useState<Service[]>([]);
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [allACTypes, setAllACTypes] = useState<ACType[]>([]);
  const [allHorsepowerOptions, setAllHorsepowerOptions] = useState<HorsepowerOption[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const handleBookNewCleaning = () => {
    setActiveTab('bookService');
  };

  useEffect(() => {
    const fetchLookupData = async () => {
      try {
        const [servicesData, brandsData, acTypesData, hpOptionsData] = await Promise.all([
          servicesApi.getServices(),
          brandsApi.getBrands(),
          acTypesApi.getACTypes(),
          horsepowerApi.getHorsepowerOptions(),
        ]);
        setAllServices(servicesData);
        setAllBrands(brandsData);
        setAllACTypes(acTypesData);
        setAllHorsepowerOptions(hpOptionsData);
      } catch (err: any) {
        console.error('Error fetching lookup data:', err);
      }
    };
    fetchLookupData();
  }, []);

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

        const [fetchedLocations, fetchedDevices, fetchedAppointments] = await Promise.all([
          clientLocationApi.getByClientId(clientId),
          deviceApi.getByClientId(clientId),
          appointmentApi.getByClientId(clientId),
        ]);
        
        // Calculate points
        let calculatedPoints = 0;
        fetchedAppointments.forEach(appt => {
          if (appt.status === 'completed') {
            calculatedPoints += 1;
            if (appt.total_units && appt.total_units >= 3) {
              calculatedPoints += 1;
            }
          }
        });
        
        // Calculate points expiry date (1 year from the last completed appointment)
        let pointsExpiry = null;
        if (calculatedPoints > 0) {
          const lastCompletedAppointment = fetchedAppointments.reduce((latest, current) => {
            if (current.status === 'completed') {
              const currentTimestamp = new Date(current.appointment_date).getTime();
              const latestTimestamp = latest ? new Date(latest.appointment_date).getTime() : 0;
              return currentTimestamp > latestTimestamp ? current : latest;
            }
            return latest;
          }, null as Appointment | null);

          if (lastCompletedAppointment) {
            pointsExpiry = addYears(new Date(lastCompletedAppointment.appointment_date), 1).toISOString();
          }
        }
        
        // Check if points or expiry need to be updated in the database
        if (fetchedClient.points !== calculatedPoints || fetchedClient.points_expiry !== pointsExpiry) {
          const updatedClient = await clientApi.updateClient(clientId, {
            points: calculatedPoints,
            points_expiry: pointsExpiry,
          });
          setClient(updatedClient);
        } else {
          setClient(fetchedClient);
        }

        setLocations(fetchedLocations);
        setDevices(fetchedDevices);
        setAppointments(fetchedAppointments);

      } catch (err: any) {
        console.error('Error fetching client dashboard data:', err);
        setError(err.message || 'Failed to load client data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientData();
  }, [clientId]);


  const getServiceName = (id: UUID | null) => allServices.find(s => s.id === id)?.name || 'N/A';
  // Helper to get the location city name
  const getLocationCity = (locationId: UUID | null) => locations.find(loc => loc.id === locationId)?.city || 'N/A';
  const getLocation = (locationId: UUID | null) => locations.find(loc => loc.id === locationId) || null;

  const getDeviceCleaningStatus = () => {
    const statusByLocation = new Map<UUID, { location: ClientLocation, dueDevices: number, lastServiceDate: string | null, totalDevices: number, acNames: string[] }>();
    const today = new Date();

    // Iterate through devices to calculate status
    devices.forEach(device => {
      const locationId = device.location_id;
      if (!locationId) return;

      if (!statusByLocation.has(locationId)) {
        const location = locations.find(loc => loc.id === locationId);
        if (location) {
          statusByLocation.set(locationId, { location, dueDevices: 0, lastServiceDate: null, totalDevices: 0, acNames: [] });
        } else {
          return; // Skip if location data is not available
        }
      }
      
      const status = statusByLocation.get(locationId);
      if (!status) return; // Should not happen with the check above, but for safety

      status.totalDevices++;
      status.acNames.push(device.name); // Add the AC name to the list for this location

      if (device.last_cleaning_date) {
        const lastCleanDate = new Date(device.last_cleaning_date);
        
        // Update last service date if this device's date is newer
        if (!status.lastServiceDate || lastCleanDate > new Date(status.lastServiceDate)) {
          status.lastServiceDate = device.last_cleaning_date;
        }

        // Check if the device is due for cleaning (more than 3 months since last cleaning)
        const due3Months = addMonths(lastCleanDate, 3);
        if (isBefore(due3Months, today)) {
          status.dueDevices++;
        }
      } else {
        // If last_cleaning_date is null, consider it due for cleaning
        status.dueDevices++;
      }
    });

    return Array.from(statusByLocation.values());
  };
  
  const cleaningStatuses = getDeviceCleaningStatus();
  
  // --- Pagination Logic ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAppointments = appointments.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(appointments.length / itemsPerPage);

  const handleNextPage = () => {
    setCurrentPage(prevPage => Math.min(prevPage + 1, totalPages));
  };

  const handlePreviousPage = () => {
    setCurrentPage(prevPage => Math.max(prevPage - 1, 1));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-gray-50 rounded-xl shadow-lg">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
        <p className="ml-4 text-gray-600">Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-red-50 rounded-xl shadow-lg text-red-700 p-6">
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

  const primaryLocation = locations.find(loc => loc.is_primary) || locations[0];


  return (
    <div className="space-y-8">
      {/* Welcome Card */}
      <Card className="rounded-xl shadow-lg overflow-hidden text-white relative p-6 md:p-8" style={{ backgroundColor: '#99BCC0' }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundColor: '#99BCC0' }}></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between">
          <div className="text-center md:text-left mb-4 md:mb-0">
            <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Welcome, {client.name}!</h1>
            <p className="text-lg opacity-90">{primaryLocation ? `${primaryLocation.city}, Philippines` : 'Philippines'}</p>
          </div>
          <div className="flex-shrink-0">
            <Image
              src={`/assets/images/icon.jpg`}
              alt="Welcome Illustration"
              width={150}
              height={150}
              className="w-24 h-24 md:w-36 md:h-36 rounded-full object-cover shadow-xl"
            />
          </div>
        </div>
      </Card>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-xl shadow-lg p-6 flex items-center justify-between bg-white">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Points</p>
            <p className="text-3xl font-bold text-blue-600">{client.points}</p>
          </div>
          <Star className="w-10 h-10 text-yellow-500" />
        </Card>

        <Card className="rounded-xl shadow-lg p-6 flex items-center justify-between bg-white">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Bookings</p>
            <p className="text-3xl font-bold text-green-600">{appointments.length}</p>
          </div>
          <Calendar className="w-10 h-10 text-green-600" />
        </Card>

        <Card className="rounded-xl shadow-lg p-6 flex items-center justify-between bg-white">
          <div>
            <p className="text-sm font-medium text-gray-600">Registered AC Units</p>
            <p className="text-3xl font-bold text-purple-600">{devices.length}</p>
          </div>
          <AirVent className="w-10 h-10 text-purple-600" />
        </Card>
      </div>

      {/* NEW: Cleaning Status by Location */}
      <Card className="rounded-xl shadow-lg p-6 bg-white">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-xl font-bold flex items-center">
            <Clock className="w-5 h-5 mr-2 text-gray-700" />
            Cleaning Status by Location
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 space-y-4">
          {cleaningStatuses.length > 0 ? (
            cleaningStatuses.map(status => (
              <div key={status.location.id} className="border-b last:border-b-0 py-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{status.location.name}</p>
                    <p className="text-sm text-gray-600">{formatAddress(status.location)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">
                      AC Units: <span className="text-gray-600 font-normal">{status.acNames.join(', ')}</span>
                    </p>
                  </div>
                </div>
                <div className="mt-2 text-sm">
                  <p>Last Service Date: <span className="font-medium text-gray-800">{status.lastServiceDate ? format(new Date(status.lastServiceDate), 'MMM d, yyyy') : 'No status yet, we will update once it\'s completed'}</span></p>
                  <div className="flex items-center mt-1">
                    <span className="font-medium">Status:</span>
                    {status.dueDevices > 0 ? (
                      <span className="ml-2 text-red-600 font-semibold">
                        {status.dueDevices} of {status.totalDevices} AC unit{status.dueDevices > 1 || status.totalDevices > 1 ? 's' : ''} due for cleaning
                      </span>
                    ) : (
                      <span className="ml-2 text-green-600 font-semibold">
                        All devices are well maintained
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No devices registered for this client yet.</p>
          )}
          <Button className="w-full bg-blue-600 hover:bg-blue-700 mt-4" onClick={onBookNewCleaningClick}>
            <Plus className="w-4 h-4 mr-2" /> Book New Service
          </Button>
        </CardContent>
      </Card>

      {/* Your Points Section */}
      <Card className="rounded-xl shadow-lg p-6 bg-white">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-xl font-bold flex items-center">
            <Star className="w-5 h-5 mr-2 text-yellow-500" />
            Your Points
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 space-y-4">
          <div className="flex justify-between items-center text-gray-700">
            <p className="text-2xl font-bold text-blue-600">{client.points}</p>
            {/* Conditional rendering for the badge */}
            {client.points > 0 && client.points_expiry && (
              <Badge variant="outline" className="text-sm border-yellow-500 text-yellow-700">
                Expires on: {format(new Date(client.points_expiry), 'MMM d, yyyy')}
              </Badge>
            )}
          </div>
          <Button variant="outline" className="w-full border-blue-600 text-blue-600 hover:bg-blue-50" onClick={onReferClick}>
            Refer A Friend
          </Button>
          <p className="text-xs text-gray-500 mt-2">
            Note: Points will be credited after the completion of your booking or referrals booking.
          </p>
        </CardContent>
      </Card>

      {/* Recent Appointments Table with Pagination */}
      <Card className="rounded-xl shadow-lg p-6 bg-white">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-xl font-bold flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-blue-600" />
            Recent Appointments
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentAppointments.length > 0 ? (
                  currentAppointments.map((appointment) => (
                    <tr key={appointment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(appointment.appointment_date), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getServiceName(appointment.service_id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getLocation(appointment.location_id)?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₱{appointment.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Badge
                          className={
                            appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                            appointment.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }
                        >
                          {appointment.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {appointment.notes || '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                      No recent appointments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination Controls */}
          {appointments.length > itemsPerPage && (
            <div className="flex justify-between items-center mt-4 px-6">
              <Button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </Button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}