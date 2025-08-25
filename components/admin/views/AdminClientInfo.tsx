'use client'

import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Eye, ChevronDown, MapPin, Monitor, Copy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

// Define the data types for better code clarity
interface Client {
  id: string;
  name: string;
  mobile: string;
  email: string;
  points: number;
  discounted: boolean;
  referral_link: string;
}

interface ClientLocation {
  id: string;
  address_line1: string;
  street: string;
  landmark: string;
  barangays: {
    name: string;
  };
  cities: {
    name: string;
  };
}

interface Device {
  id: string;
  name: string;
  brands: {
    name: string;
  } | null;
  ac_types: {
    name: string;
  } | null;
  horsepower_options: {
    display_name: string;
  } | null;
}

export default function AdminClientInfo() {
  const [clients, setClients] = useState<Client[]>([]);
  const [locations, setLocations] = useState<Record<string, ClientLocation[]>>({});
  const [devices, setDevices] = useState<Record<string, Device[]>>({});
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalClients, setTotalClients] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [dialogAction, setDialogAction] = useState<'edit' | 'view' | null>(null);
  const pageSize = 5;
  const [notificationMessage, setNotificationMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [siteUrl, setSiteUrl] = useState<string | null>(null);

  // Function to display a temporary notification
  const showTempNotification = (message: string, error = false) => {
    setNotificationMessage(message);
    setIsError(error);
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
      setNotificationMessage('');
    }, 3000); // Hide after 3 seconds
  };

  // Fetch the site URL from the API on component mount
  useEffect(() => {
    const fetchSiteUrl = async () => {
      try {
        // Use the updated API endpoint with the new 'getAll=true' query parameter
        const res = await fetch(`/api/admin/custom-settings?getAll=true`);
        if (!res.ok) {
          throw new Error('Failed to fetch site URL');
        }
        
        // The API now returns an object with a 'data' array
        const { data } = await res.json();

        // Assuming the data is an array of settings
        const urlSetting = data.find((setting: { setting_key: string }) => setting.setting_key === 'site_url');
        if (urlSetting) {
          setSiteUrl(urlSetting.setting_value);
        } else {
          console.error("Site URL setting not found.");
          showTempNotification('Site URL setting not found.', true);
        }
      } catch (error) {
        console.error("Error fetching site URL:", error);
        showTempNotification('Failed to get site URL.', true);
      }
    };
    fetchSiteUrl();
  }, []);

  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/client?search=${searchQuery}&page=${currentPage}&pageSize=${pageSize}`);
        if (!res.ok) {
          throw new Error('Failed to fetch clients');
        }
        const data = await res.json();
        setClients(data.data);
        setTotalClients(data.total);
      } catch (error) {
        console.error("Error fetching clients:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, [searchQuery, currentPage]);

  // Handle row expansion and fetch location and device data
  const toggleRowExpansion = async (clientId: string) => {
    // If the same row is clicked, collapse it
    if (expandedRow === clientId) {
      setExpandedRow(null);
      return;
    }

    setExpandedRow(clientId);

    // If locations for this client are not already fetched, fetch them
    if (!locations[clientId]) {
      try {
        const res = await fetch(`/api/admin/client_location?client_id=${clientId}`);
        if (!res.ok) {
          throw new Error('Failed to fetch client locations');
        }
        const data = await res.json();
        setLocations({ ...locations, [clientId]: data.data });
      } catch (error) {
        console.error("Error fetching client locations:", error);
      }
    }

    // If devices for this client are not already fetched, fetch them
    if (!devices[clientId]) {
      try {
        const res = await fetch(`/api/admin/devices?client_id=${clientId}`);
        if (!res.ok) {
          throw new Error('Failed to fetch client devices');
        }
        const data = await res.json();
        setDevices({ ...devices, [clientId]: data.data });
      } catch (error) {
        console.error("Error fetching client devices:", error);
      }
    }
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    setExpandedRow(null); // Close any expanded rows when changing pages
  };

  // Calculate pagination info
  const totalPages = Math.ceil(totalClients / pageSize);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalClients);

  // Handle button clicks
  const handleButtonClick = (client: Client, action: 'edit' | 'view', e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row expansion
    setSelectedClient(client);
    setDialogAction(action);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedClient(null);
    setDialogAction(null);
  };

  const handleDialogConfirm = () => {
    if (selectedClient && dialogAction) {
      // Here you can implement the actual action
      
      
      // Use your existing notification function instead of alert()
      if (dialogAction === 'edit') {
        showTempNotification(`Edit functionality for ${selectedClient.name} - This would open an edit form`);
      } else if (dialogAction === 'view') {
        showTempNotification(`View functionality for ${selectedClient.name} - This would show detailed view`);
      }
    }
    handleDialogClose();
  };

  // Handle checkbox change for discounted status
  const handleDiscountedChange = async (clientId: string, checked: boolean) => {
    try {
      const response = await fetch(`/api/admin/update-client-discounted`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: clientId,
          discounted: checked,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update client');
      }

      // Update local state
      setClients(prevClients =>
        prevClients.map(client =>
          client.id === clientId
            ? { ...client, discounted: checked }
            : client
        )
      );
      // Use notification for success as well
      showTempNotification(`Updated client ${clientId} discounted status to: ${checked ? 'Yes' : 'No'}`);
      
    } catch (error) {
      console.error('Error updating client discounted status:', error);
      // Use your existing notification function instead of alert()
      showTempNotification('Failed to update discounted status. Please try again.', true);
    }
  };

  // --- RECONSTRUCTED `handleCopyLink` ---
  const handleCopyLink = (client: Client) => {
    // Check if the site URL is available first.
    if (!siteUrl) {
      showTempNotification('Site URL not available. Cannot copy link.', true);
      return;
    }
    
    // Construct the referral link.
    const referralLink = `${siteUrl}client/${client.id}`;

    // Use the modern navigator.clipboard API to copy the text.
    navigator.clipboard.writeText(referralLink)
      .then(() => {
        // Show a success notification if the copy was successful.
        showTempNotification('Client link copied to clipboard!');
      })
      .catch(err => {
        // Show an error notification if the copy failed.
        console.error('Failed to copy link:', err);
        showTempNotification('Failed to copy link. Please try again.', true);
      });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen font-sans antialiased text-gray-800">
      {/* Header section */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-br from-[#99BCC0] via-[#8FB6BA] to-[#6fa3a9] text-white rounded-t-lg">
        <h1 className="text-2xl font-bold">Client Details</h1>
      </div>

      {/* Table wrapper */}
      <div className="bg-white shadow overflow-hidden sm:rounded-b-lg">
        {/* Search row */}
        <div className="px-6 py-3 border-b flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className=" w-full max-w-xs sm:w-auto pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>
          </div>
          <div className="text-xs sm:w-auto text-gray-500">Total: {totalClients}</div>
        </div>

        {/* Main Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Customer Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Mobile
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  Points
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Discounted
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-gray-500">Loading clients...</td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-gray-500">No clients found.</td>
                </tr>
              ) : (
                clients.map((client) => (
                  <React.Fragment key={client.id}>
                    <tr
                      className={`hover:bg-gray-50 transition-colors duration-200 cursor-pointer ${
                        expandedRow === client.id ? 'bg-gray-100' : ''
                      }`}
                      onClick={() => toggleRowExpansion(client.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {/* A placeholder avatar. Replace with a real one if available. */}
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold">
                            {client.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="text-sm font-medium text-gray-900">{client.name}</div>
                          <ChevronDown
                            size={16}
                            className={`text-gray-400 transform transition-transform duration-200 ${
                              expandedRow === client.id ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                        {client.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                        {client.mobile}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                        {client.points}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                        <div 
                          className="flex items-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={client.discounted}
                            onCheckedChange={(checked) => handleDiscountedChange(client.id, checked as boolean)}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-600">
                            {client.discounted ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyLink(client);
                            }}
                            size="sm"
                            className="flex-shrink-0 w-full sm:w-auto bg-green-500 text-white"
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Client Link
                          </Button>
                          
                        </div>
                      </td>
                    </tr>
                    {expandedRow === client.id && (
                      <tr className="bg-gray-50">
                        <td colSpan={6} className="p-4 text-sm text-gray-700">
                          {/* Mobile and smaller screen details */}
                          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 lg:hidden mb-2">
                            <p className="font-semibold">Email: <span className="font-normal">{client.email}</span></p>
                            <p className="font-semibold">Phone: <span className="font-normal">{client.mobile}</span></p>
                            <p className="font-semibold">Points: <span className="font-normal">{client.points}</span></p>
                            <p className="font-semibold">Discounted: <span className="font-normal">{client.discounted ? 'Yes' : 'No'}</span></p>
                          </div>
                          
                          {/* Locations Section */}
                          <div className="mb-4">
                            <p className="text-sm font-semibold text-gray-900 mb-2">Locations:</p>
                            {locations[client.id]?.length > 0 ? (
                              <div className="space-y-2">
                                {locations[client.id].map(loc => (
                                  <div key={loc.id} className="flex items-start gap-2 text-sm text-gray-600">
                                    <MapPin size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                    <span>
                                      {loc.address_line1}, {loc.street}, {loc.barangays.name}, {loc.cities.name}
                                      {loc.landmark && ` (${loc.landmark})`}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-600">No location details available for this client.</p>
                            )}
                          </div>

                          {/* Devices Section */}
                          <div>
                            <p className="text-sm font-semibold text-gray-900 mb-2">Devices:</p>
                            {devices[client.id]?.length > 0 ? (
                              <div className="space-y-2">
                                {devices[client.id].map(device => (
                                  <div key={device.id} className="flex items-start gap-2 text-sm text-gray-600">
                                    <Monitor size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                                    <span>
                                      {device.name} - {device.ac_types?.name || 'N/A'} ({device.horsepower_options?.display_name || 'N/A'})
                                      {device.brands?.name && ` - ${device.brands.name}`}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-600">No devices available for this client.</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalClients > 0 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <p>
            {startItem}-{endItem} of {totalClients} clients
          </p>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronDown size={16} className="rotate-90" />
            </button>
            <span className="px-3 py-1 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronDown size={16} className="-rotate-90" />
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogAction === 'edit' ? 'Edit Client' : 'View Client Details'}
            </DialogTitle>
            <DialogDescription>
              {dialogAction === 'edit' 
                ? `Are you sure you want to edit ${selectedClient?.name}? This will open the edit form.`
                : `View detailed information for ${selectedClient?.name}?`
              }
            </DialogDescription>
          </DialogHeader>
          
          {selectedClient && (
            <div className="py-4">
              <div className="space-y-2 text-sm">
                <p><strong>Name:</strong> {selectedClient.name}</p>
                <p><strong>Email:</strong> {selectedClient.email}</p>
                <p><strong>Mobile:</strong> {selectedClient.mobile}</p>
                <p><strong>Points:</strong> {selectedClient.points}</p>
                <p><strong>Discount Status:</strong> {selectedClient.discounted ? 'Yes' : 'No'}</p>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={handleDialogClose}>
              Cancel
            </Button>
            <Button onClick={handleDialogConfirm}>
              {dialogAction === 'edit' ? 'Edit Client' : 'View Details'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notification Toast */}
      {showNotification && (
        <div 
          className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg text-white transition-opacity duration-300 ${
            isError ? 'bg-red-500' : 'bg-green-500'
          }`}
        >
          {notificationMessage}
        </div>
      )}
    </div>
  );
}
