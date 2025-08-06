'use client';

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
  Loader2,
  AlertCircle,
  TrendingUp,
  DollarSign,
  AirVent,
  Mail,
  Phone,
  Home,
  ChevronRight,
  ChevronLeft // Added for previous page button
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts'; // Import Recharts components
import { format, startOfDay } from 'date-fns';

// Import UI components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// --- CORRECTED API IMPORTS ---
import { clientApi } from '../../pages/api/clients/clientApi';
import { clientLocationApi } from '../../pages/api/clientLocation/clientLocationApi';
import { appointmentApi } from '../../pages/api/appointments/appointmentApi';
import { deviceApi } from '../../pages/api/device/deviceApi';
import { locationApi } from '../../pages/api/city/locationApi';
import { servicesApi } from '../../pages/api/service/servicesApi';
import { brandsApi } from '../../pages/api/brands/brandsApi';
import { acTypesApi } from '../../pages/api/types/acTypesApi';
import { horsepowerApi } from '../../pages/api/horsepower/horsepowerApi';

// Import types
import { Client, ClientLocation, Appointment, Device, City, Barangay, Service, Brand, ACType, HorsepowerOption, UUID } from '../../types/database';

interface ClientDashboardTabProps {
  clientId: string;
onBookNewCleaningClick: () => void; // Add this prop
onReferClick: () => void;
}

export function ClientDashboardTab({ clientId, onBookNewCleaningClick, onReferClick }: ClientDashboardTabProps) {
  const [client, setClient] = useState<Client | null>(null);
  const [locations, setLocations] = useState<ClientLocation[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // You can adjust this value

  // Lookup data for displaying names instead of IDs
  const [allCities, setAllCities] = useState<City[]>([]);
  const [allBarangays, setAllBarangays] = useState<Barangay[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [allACTypes, setAllACTypes] = useState<ACType[]>([]);
  const [allHorsepowerOptions, setAllHorsepowerOptions] = useState<HorsepowerOption[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard'); // Assuming this state exists in your parent component

   const handleBookNewCleaning = () => {
    setActiveTab('bookService'); // Set the active tab to show the booking component
  };


  // Fetch all lookup data (cities, barangays, services, brands, AC types, HP options)
  useEffect(() => {
    const fetchLookupData = async () => {
      try {
        const [citiesData, barangaysData, servicesData, brandsData, acTypesData, hpOptionsData] = await Promise.all([
          locationApi.getCities(),
          locationApi.getAllBarangays(),
          servicesApi.getServices(),
          brandsApi.getBrands(),
          acTypesApi.getACTypes(),
          horsepowerApi.getHorsepowerOptions(),
        ]);
        setAllCities(citiesData);
        setAllBarangays(barangaysData);
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

        // Fetch all client-specific data
        const [fetchedLocations, fetchedDevices, fetchedAppointments] = await Promise.all([
          clientLocationApi.getByClientId(clientId),
          deviceApi.getByClientId(clientId),
          appointmentApi.getByClientId(clientId),
        ]);
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

  // --- Helper functions to get names from IDs ---
  const getCityName = (id: UUID | null) => allCities.find(c => c.id === id)?.name || 'N/A';
  const getBarangayName = (id: UUID | null) => allBarangays.find(b => b.id === id)?.name || 'N/A';
  const getServiceName = (id: UUID | null) => allServices.find(s => s.id === id)?.name || 'N/A';
  const getBrandName = (id: UUID | null) => allBrands.find(b => b.id === id)?.name || 'N/A';
  const getACTypeName = (id: UUID | null) => allACTypes.find(t => t.id === id)?.name || 'N/A';
  const getHorsepowerDisplayName = (id: UUID | null) => allHorsepowerOptions.find(hp => hp.id === id)?.display_name || 'N/A';

  const getRelevantDueDates = () => {
    const relevantDevice = devices
      .filter(device => device.due_3_months && new Date(device.due_3_months) >= startOfDay(new Date()))
      .sort((a, b) => {
        const dateA = new Date(a.due_3_months!);
        const dateB = new Date(b.due_3_months!);
        return dateA.getTime() - dateB.getTime();
      })[0];

    let due3Months = 'N/A';
    let due4Months = 'N/A';
    let due6Months = 'N/A';

    if (relevantDevice) {
      if (relevantDevice.due_3_months) {
        due3Months = format(new Date(relevantDevice.due_3_months), 'MMM d, yyyy');
      }
      if (relevantDevice.due_4_months) {
        due4Months = format(new Date(relevantDevice.due_4_months), 'MMM d, yyyy');
      }
      if (relevantDevice.due_6_months) {
        due6Months = format(new Date(relevantDevice.due_6_months), 'MMM d, yyyy');
      }
    }
    return { due3Months, due4Months, due6Months };
  };

  const getLastCleaningDate = () => {
    const cleanedDevices = devices.filter(device => device.last_cleaning_date)
      .sort((a, b) => {
        if (!a.last_cleaning_date || !b.last_cleaning_date) return 0;
        return new Date(b.last_cleaning_date).getTime() - new Date(a.last_cleaning_date).getTime();
      });
    if (cleanedDevices.length > 0) {
      return format(new Date(cleanedDevices[0].last_cleaning_date!), 'MMM d, yyyy');
    }
    return 'N/A';
  };

  const calculateDisplayPoints = (): number => {
    let calculatedPoints = 0;
    appointments.forEach(appt => {
      if (appt.status === 'completed') {
        calculatedPoints += 1;
        if (appt.total_units && appt.total_units >= 3) {
          calculatedPoints += 1;
        }
      }
    });
    return calculatedPoints;
  };

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

  const { due3Months, due4Months, due6Months } = getRelevantDueDates();
  const displayPoints = calculateDisplayPoints();

  return (
    <div className="space-y-8">
       {/* Welcome Card */}
       <Card className="rounded-xl shadow-lg overflow-hidden text-white relative p-6 md:p-8" style={{ backgroundColor: '#99BCC0' }}>
         <div className="absolute inset-0 opacity-10" style={{ backgroundColor: '#99BCC0' }}></div>
         <div className="relative z-10 flex flex-col md:flex-row items-center justify-between">
           <div className="text-center md:text-left mb-4 md:mb-0">
             <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Welcome, {client.name}!</h1>
             <p className="text-lg opacity-90">{getCityName(locations[0]?.city_id) || 'Your City'}, Philippines</p>
           </div>
           <div className="flex-shrink-0">
             <img
               src={`../assets/images/icon.jpg`}
               alt="Welcome Illustration"
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
            <p className="text-3xl font-bold text-blue-600">{displayPoints}</p>
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

      {/* Transactions & Points Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-xl shadow-lg p-6 bg-white">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-xl font-bold flex items-center">
              <Clock className="w-5 h-5 mr-2 text-gray-700" />
              Next Cleaning & Last Service
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-4">
            <div className="flex justify-between items-center text-gray-700">
              <p className="font-medium">Last Service Date:</p>
              <span className="text-gray-800">{getLastCleaningDate()}</span>
            </div>
            <div className="flex justify-between items-center text-gray-700">
              <p className="font-medium">Next Cleaning Due (3 Months):</p>
              <span className="text-blue-600 font-semibold">{due3Months}</span>
            </div>
            <div className="flex justify-between items-center text-gray-700">
              <p className="font-medium">4 Months:</p>
              <span className="text-green-600 font-semibold">{due4Months}</span>
            </div>
            <div className="flex justify-between items-center text-gray-700">
              <p className="font-medium">6 Months:</p>
              <span className="text-red-600 font-semibold">{due6Months}</span>
            </div>

           <Button className="w-full bg-blue-600 hover:bg-blue-700 mt-4" onClick={onBookNewCleaningClick}>
              <Plus className="w-4 h-4 mr-2" /> Book New Service
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-lg p-6 bg-white">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-xl font-bold flex items-center">
              <Star className="w-5 h-5 mr-2 text-yellow-500" />
              Your Points
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-4">
            <div className="flex justify-between items-center text-gray-700">
              <p className="text-2xl font-bold text-blue-600">{displayPoints}</p>
              <Badge variant="outline" className="text-sm border-yellow-500 text-yellow-700">
                Expires on: {format(new Date(new Date().setFullYear(new Date().getFullYear() + 1)), 'MMM d, yyyy')}
              </Badge>
            </div>
            <Button variant="outline" className="w-full border-blue-600 text-blue-600 hover:bg-blue-50" onClick={onBookNewCleaningClick}>
              Refer A Friend
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              Note: Points will be credited after the completion of your booking or referral's booking.
            </p>
          </CardContent>
        </Card>
      </div>

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
                        {locations.find(loc => loc.id === appointment.location_id)?.name || 'N/A'}
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