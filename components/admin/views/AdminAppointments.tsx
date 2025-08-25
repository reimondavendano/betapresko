'use client'

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Search, Filter, Calendar, User, MapPin, Clock, CheckCircle, Copy, ChevronLeft, ChevronRight, ChevronDown, Settings, AirVent, Edit } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/lib/store';
import { setAppointments } from '@/lib/features/admin/adminSlice';
import { AppointmentWithDetails, PaginationInfo } from '@/types/database';
import moment from 'moment';

export default function AdminAppointments() {
  const dispatch = useDispatch();
  const [appointments, setAppointmentsLocal] = useState<AppointmentWithDetails[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 15, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'completed'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'incoming' | 'previous'>('all');
  const [specificDate, setSpecificDate] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<any | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editedDevices, setEditedDevices] = useState<any[]>([]);
  const [customSettings, setCustomSettings] = useState<any>({});
    
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const dateDropdownRef = useRef<HTMLDivElement>(null);

  const [brands, setBrands] = useState<any[]>([]);
  const [acTypes, setAcTypes] = useState<any[]>([]);
  const [horsepowerOptions, setHorsepowerOptions] = useState<any[]>([]);
 const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // Load appointments with all filters
  const loadAppointments = async (page = 1, resetPage = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: resetPage ? '1' : page.toString(),
        limit: '15',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(dateFilter !== 'all' && { dateFilter }),
        ...(specificDate && { date: specificDate })
      });

      const res = await fetch(`/api/admin/appointments?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load appointments');
      
      setAppointmentsLocal(json.data || []);
      setPagination(json.pagination || { page: 1, limit: 15, total: 0, totalPages: 0 });
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments(1, true);
  }, [statusFilter, dateFilter, specificDate]);

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [brandsRes, acTypesRes, hpRes] = await Promise.all([
          fetch("/api/admin/brands"),        // or Supabase query
          fetch("/api/admin/types"),
          fetch("/api/admin/horsepower")
        ]);

      const brandsJson = await brandsRes.json();
       const typesJson = await acTypesRes.json();
       const horsepowerJson = await hpRes.json();

      setBrands(Array.isArray(brandsJson) ? brandsJson : brandsJson.data || []);
      setAcTypes(Array.isArray(typesJson) ? typesJson : typesJson.data || []);
      setHorsepowerOptions(Array.isArray(horsepowerJson) ? horsepowerJson : horsepowerJson.data || []);
      } catch (err) {
        console.error("Error loading dropdown data:", err);
      }
    };

    fetchDropdownData();
  }, []);


  useEffect(() => {
    const fetchCustomSettings = async () => {
      try {
        const res = await fetch("/api/admin/custom-settings"); // adjust route if different
        if (!res.ok) throw new Error("Failed to fetch settings");
        const data = await res.json();
        setCustomSettings(data || {});
      } catch (err) {
        console.error("Error loading custom settings:", err);
      }
    };

    fetchCustomSettings();
  }, []);


  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target as Node)) {
        setShowDateDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getStatusDisplayText = () => {
    switch (statusFilter) {
      case 'confirmed': return 'Confirmed';
      case 'completed': return 'Completed';
      default: return 'Status';
    }
  };

  const getSettingsMap = (settings: any) =>
  (settings?.data || []).reduce((acc: Record<string, string>, setting: any) => {
    acc[setting.setting_key] = setting.setting_value;
    return acc;
  }, {});


  // Compute unit price
  const computeUnitPrice = (
    device: any,
    settingsMap: Record<string, string>,
    serviceName?: string
  ): number => {
    if (!device) return 0;

    // If this is a repair service
    if (serviceName?.toLowerCase().includes("repair")) {
      return Number(settingsMap["repair_price"] || 0);
    }
    
    const acTypeName = device.ac_types?.name?.toLowerCase() || "";
    const horsepowerValue = parseFloat(device?.horsepower_options?.value || "0");

    if (acTypeName.includes("split") || acTypeName.includes("u")) {
      if (horsepowerValue <= 1.5) {
        return Number(settingsMap["split_type_price"] || 0);
      } else {
        return (
          Number(settingsMap["split_type_price"] || 0) +
          Number(settingsMap["surcharge"] || 0)
        );
      }
    } else if (acTypeName.includes("window")) {
      if (horsepowerValue <= 1.5) {
        return Number(settingsMap["window_type_price"] || 0);
      } else {
        return (
          Number(settingsMap["window_type_price"] || 0) +
          Number(settingsMap["surcharge"] || 0)
        );
      }
    }

    console.log(settingsMap["split_type_price"], 'split');
    console.log(settingsMap["window_type_price"], 'window');

    return 0;
  };

  // Discount calculation (use settingsMap, not raw array)
  const calculateDiscount = (client: any, customSettings: any) => {
    const settingsMap = getSettingsMap(customSettings || []);
    const std = Number(settingsMap["discount"] ?? 0);           // Standard discount
    const fam = Number(settingsMap["family_discount"] ?? 0);    // Family/Friends discount

    if (client?.discounted === true) {
      // Client marked discounted → choose the higher of family vs standard
      if (fam >= std) return { value: fam, type: "Family/Friends" };
      return { value: std, type: "Standard" };
    }

    // client.discounted === false (or not true) → always apply standard discount
    if (std > 0) return { value: std, type: "Standard" };

    return { value: 0, type: "None" };
  };




  // Inside your component / dialog
  const settingsMap = getSettingsMap(customSettings);

    const subtotal = editedDevices.reduce(
    (sum, d) => sum + computeUnitPrice(d, settingsMap, editTarget?.services?.name),
    0
  );

  const discount = calculateDiscount(editTarget?.clients, customSettings);
  const finalTotal = subtotal * (1 - discount.value / 100);



  const getDateDisplayText = () => {
    if (specificDate) return moment(specificDate).format('MMM DD, YYYY');
    switch (dateFilter) {
      case 'today': return 'Today';
      case 'incoming': return 'Incoming';
      case 'previous': return 'Previous';
      default: return 'Show by';
    }
  };

  const getDateFilterDisplayText = () => {
    switch (dateFilter) {
      case 'today': return 'Today';
      case 'incoming': return 'Incoming';
      case 'previous': return 'Previous';
      default: return 'Show by';
    }
  };

  // Filter appointments based on search query (client-side for current page)
  const filteredAppointments = appointments.filter((appointment: AppointmentWithDetails) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const clientName = (appointment.clients?.name || '').toLowerCase();
    const serviceName = (appointment.services?.name || '').toLowerCase();
    const city = (appointment.client_locations?.cities?.name || '').toLowerCase();
    const barangay = (appointment.client_locations?.barangays?.name || '').toLowerCase();
    
    return clientName.includes(query) ||
           serviceName.includes(query) ||
           city.includes(query) ||
           barangay.includes(query);
  });

  // Copy functionality
  const copyAppointmentsToClipboard = async () => {
    try {
      const copyText = filteredAppointments.map(appointment => {
        const clientName = appointment.clients?.name || 'Unknown Client';
        const time = appointment.appointment_time || 'No time set';
        const mobile = appointment.clients?.mobile || 'No mobile';
        const address = buildAddressString(appointment);
        const locationName = appointment.client_locations?.name || '';
        const serviceName = appointment.services?.name || 'No service';
        const amount = appointment.amount ? `₱${appointment.amount.toLocaleString()}` : 'No amount';
        
        // Build device list
        let deviceList = 'No devices';
        if (appointment.appointment_devices && appointment.appointment_devices.length > 0) {
          const deviceCounts = appointment.appointment_devices.reduce((acc, ad) => {
            const device = ad.devices;
            if (device?.ac_types?.name) {
              const type = device.ac_types.name;
              acc[type] = (acc[type] || 0) + 1;
            }
            return acc;
          }, {} as Record<string, number>);
          
          deviceList = Object.entries(deviceCounts)
            .map(([type, count]) => `${count} ${type}`)
            .join(', ');
        }

        return `${clientName} - ${time}
        ${mobile}
        ${address}
        ${locationName}
        =============
        ${deviceList}
        Service: ${serviceName}
        Price : ${amount}
        ==============

        `;
      }).join('');

      await navigator.clipboard.writeText(copyText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const buildAddressString = (appointment: AppointmentWithDetails): string => {
    const parts = [];
    if (appointment.client_locations?.address_line1) parts.push(appointment.client_locations.address_line1);
    if (appointment.client_locations?.street) parts.push(appointment.client_locations.street);
    if (appointment.client_locations?.barangays?.name) parts.push(appointment.client_locations.barangays.name);
    if (appointment.client_locations?.cities?.name) parts.push(appointment.client_locations.cities.name);
    return parts.join(', ') || 'No address';
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadAppointments(newPage);
    }
  };

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSpecificDate(e.target.value);
    if (e.target.value) {
      setDateFilter('all'); // Clear preset date filter when using specific date
    }
  };

  // Update a specific field of a device in editedDevices
  const handleDeviceChange = (rowId: string, field: string, value: string) => {
    setEditedDevices((prev) =>
      prev.map((device) => {
        if (device.rowId === rowId) {
          let updated: any = { ...device, [field]: value };

          // also attach full object when AC Type changes
          if (field === "ac_type_id") {
            updated.ac_types = acTypes.find((t: any) => String(t.id) === value);
          }

          // also attach full object when Horsepower changes
          if (field === "horsepower_id") {
            updated.horsepower_options = horsepowerOptions.find(
              (hp: any) => String(hp.id) === value
            );
          }

          // recompute price based on new values
          const newPrice = computeUnitPrice(
            updated,
            settingsMap,
            editTarget?.services?.name
          );

          return { ...updated, price: newPrice };
        }
        return device;
      })
    );
  };



  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-orange-500 text-white">Confirmed</Badge>;
      case 'completed':
        return <Badge className="bg-green-600 text-white">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 pb-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Appointment Details</h1>
            <Button 
              onClick={copyAppointmentsToClipboard}
              variant="outline"
              size="sm"
              className={copySuccess ? "bg-green-50 border-green-200" : ""}
            >
              <Copy size={16} className="mr-2" />
              {copySuccess ? 'Copied!' : 'Copy Filtered'}
            </Button>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search appointments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>

            {/* Status Dropdown */}
            <div className="relative" ref={statusDropdownRef}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="flex items-center gap-2 min-w-[120px] justify-between"
              >
                <div className="flex items-center gap-2">
                  <Settings size={16} />
                  <span>{getStatusDisplayText()}</span>
                </div>
                <ChevronDown size={16} className={`transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
              </Button>
              
              {showStatusDropdown && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-50">
                  <div className="p-1">
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
                      onClick={() => {
                        setStatusFilter('all');
                        setShowStatusDropdown(false);
                      }}
                    >
                      <div className={`w-2 h-2 rounded-full ${statusFilter === 'all' ? 'bg-blue-500' : 'bg-transparent'}`} />
                      All
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
                      onClick={() => {
                        setStatusFilter('confirmed');
                        setShowStatusDropdown(false);
                      }}
                    >
                      <div className={`w-2 h-2 rounded-full ${statusFilter === 'confirmed' ? 'bg-blue-500' : 'bg-transparent'}`} />
                      Confirmed
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
                      onClick={() => {
                        setStatusFilter('completed');
                        setShowStatusDropdown(false);
                      }}
                    >
                      <div className={`w-2 h-2 rounded-full ${statusFilter === 'completed' ? 'bg-blue-500' : 'bg-transparent'}`} />
                      Completed
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Show by (Date) Dropdown */}
            <div className="relative" ref={dateDropdownRef}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDateDropdown(!showDateDropdown)}
                className="flex items-center gap-2 min-w-[120px] justify-between"
              >
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  <span>{getDateFilterDisplayText()}</span>
                </div>
                <ChevronDown size={16} className={`transition-transform ${showDateDropdown ? 'rotate-180' : ''}`} />
              </Button>
              
              {showDateDropdown && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-50">
                  <div className="p-1">
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
                      onClick={() => {
                        setDateFilter('today');
                        setSpecificDate('');
                        setShowDateDropdown(false);
                      }}
                    >
                      <div className={`w-2 h-2 rounded-full ${dateFilter === 'today' ? 'bg-blue-500' : 'bg-transparent'}`} />
                      Today
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
                      onClick={() => {
                        setDateFilter('incoming');
                        setSpecificDate('');
                        setShowDateDropdown(false);
                      }}
                    >
                      <div className={`w-2 h-2 rounded-full ${dateFilter === 'incoming' ? 'bg-blue-500' : 'bg-transparent'}`} />
                      Incoming
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
                      onClick={() => {
                        setDateFilter('previous');
                        setSpecificDate('');
                        setShowDateDropdown(false);
                      }}
                    >
                      <div className={`w-2 h-2 rounded-full ${dateFilter === 'previous' ? 'bg-blue-500' : 'bg-transparent'}`} />
                      Previous
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Separate Date Input */}
            <div className="relative">
              <Input
                type="date"
                value={specificDate}
                onChange={handleDateInputChange}
                className="w-44"
                placeholder="yyyy-mm-dd"
              />
            </div>
          </div>

          {/* Pagination and Stats */}
          <div className="flex justify-between items-center text-sm text-gray-600">
            <div>
              Showing {filteredAppointments.length} of {pagination.total} appointments
            </div>
            {pagination.totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1 || loading}
                >
                  <ChevronLeft size={16} />
                </Button>
                <span className="px-3 py-1 bg-gray-100 rounded text-sm">
                  {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages || loading}
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Appointments Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-lg">Loading appointments...</div>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-64 text-gray-500">
            <Calendar size={64} className="mb-4 opacity-50" />
            <div className="text-xl mb-2">No appointments found</div>
            <div className="text-sm">Try adjusting your search or filter criteria</div>
          </div>
        ) : (
          <TooltipProvider>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAppointments.map((appointment: any) => (
                <Card key={appointment.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="space-y-4">
                    {/* Status and Date */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        {appointment.status === 'confirmed' ? (
                          <Badge className="bg-orange-500 text-white">Confirmed</Badge>
                        ) : appointment.status === 'completed' ? (
                          <Badge className="bg-green-600 text-white">Completed</Badge>
                        ) : appointment.status === 'pending' ? (
                          <Badge className="bg-yellow-500 text-white">Pending</Badge>
                        ) : appointment.status === 'voided' ? (
                          <Badge className="bg-red-500 text-white">Voided</Badge>
                        ) : (
                          <Badge variant="secondary">{appointment.status}</Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {moment(appointment.appointment_date).format('MMM DD, YYYY')}
                      </div>
                    </div>

                    {/* Client Info */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-400" />
                        <span className="font-semibold">{appointment.clients?.name || 'Unknown Client'}</span>
                      </div>
                      
                      {/* Location Name */}
                      {appointment.client_locations?.name && (
                        <div className="text-sm text-gray-600 ml-6">
                          {appointment.client_locations.name}
                        </div>
                      )}
                      
                      {/* Full Address */}
                      <div className="flex items-start gap-2">
                        <MapPin size={16} className="text-gray-400 mt-0.5" />
                        <div className="text-sm text-gray-600 space-y-1">
                          {appointment.client_locations?.address_line1 && (
                            <div>{appointment.client_locations.address_line1}</div>
                          )}
                          {appointment.client_locations?.street && (
                            <div>{appointment.client_locations.street}</div>
                          )}
                          <div>
                            {appointment.client_locations?.barangays?.name && 
                              `${appointment.client_locations.barangays.name}, `}
                            {appointment.client_locations?.cities?.name || ''}
                          </div>
                          {appointment.client_locations?.landmark && (
                            <div className="text-xs text-gray-500 italic">
                              Landmark: {appointment.client_locations.landmark}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {appointment.appointment_time && (
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-gray-400" />
                          <span className="text-sm text-gray-600">{appointment.appointment_time}</span>
                        </div>
                      )}
                    </div>

                    {/* Service Info */}
                    <div className="pt-2 border-t">
                      <div className="text-sm font-medium text-gray-700 mb-1">Service</div>
                      <div className="text-blue-600 font-medium">
                        {appointment.services?.name || 'N/A'}
                      </div>
                    </div>

                    {/* Devices Display */}
                    {appointment.appointment_devices && appointment.appointment_devices.length > 0 && (
                      <div className="pt-2 border-t">
                        <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <AirVent size={14} />
                          <span>{appointment.appointment_devices.length} device(s) scheduled</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="text-gray-400 hover:text-gray-600">
                                ⋯
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              <div className="space-y-2">
                                {appointment.appointment_devices.map((row: any) => {
                                  const d = row.devices;
                                  const brand = d?.brands?.name || 'N/A';
                                  const acType = d?.ac_types?.name || 'N/A';
                                  const hp = d?.horsepower_options?.display_name || 'N/A';
                                  const name = d?.name || 'Device';
                                  return (
                                    <div key={row.id} className="text-xs border-b border-gray-200 pb-1 last:border-b-0">
                                      <div className="font-medium">{name}</div>
                                      <div className="text-gray-600">{acType} - {brand} ({hp})</div>
                                      {d?.last_cleaning_date && (
                                        <div className="text-gray-500">Last cleaned: {moment(d.last_cleaning_date).format('MMM D, YYYY')}</div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    )}

                    {/* Amount */}
                    {appointment.amount && (
                      <div className="pt-2 border-t">
                        <div className="text-lg font-bold text-green-600">
                          ₱{appointment.amount.toLocaleString()}
                        </div>
                      </div>
                    )}

                    {/* Mark as Completed Button */}
                    {appointment.status === 'confirmed' && (
                      <div className="pt-2">
                        <Button
                          size="sm"
                          className="w-full bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => {
                            setConfirmTarget(appointment);
                            setConfirmOpen(true);
                          }}
                        >
                          <CheckCircle size={16} className="mr-2" />
                          Mark as Completed
                        </Button>
                      </div>
                    )}

                    {/* Edit Devices Button for Completed */}
                   {appointment.status === 'completed' && (
                      <div className="pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                          setEditTarget(appointment);
                          setEditedDevices(
                          appointment.appointment_devices.map((ad: any) => {
                            const deviceObj = {
                              rowId: ad.id,
                              brand_id: ad.devices.brand_id ? String(ad.devices.brand_id) : "",
                              ac_type_id: ad.devices.ac_type_id ? String(ad.devices.ac_type_id) : "",
                              horsepower_id: ad.devices.horsepower_id ? String(ad.devices.horsepower_id) : "",
                              name: ad.devices.name || "",
                              device_id: ad.devices.id,

                              // keep full objects for computeUnitPrice
                              ac_types: ad.devices.ac_types,
                              horsepower_options: ad.devices.horsepower_options,
                            };

                            // compute default price immediately
                            return {
                              ...deviceObj,
                              price: computeUnitPrice(deviceObj, settingsMap, appointment.services?.name),
                            };
                          })
                        );
                        setEditDialogOpen(true);
                          }}
                        >
                          <Edit size={14} className="mr-1" /> Edit Devices
                        </Button>
                      </div>
                      )}
                  </div>
                </Card>
              ))}
            </div>
          </TooltipProvider>
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          {selectedAppt && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>Appointment Details</DialogTitle>
              </DialogHeader>
              <div>
                <p className="font-semibold">{selectedAppt.clients?.name || 'Client'}</p>
                <p className="text-sm text-gray-600">{selectedAppt.client_locations?.address_line1 || ''}</p>
                <p className="text-sm text-gray-600">
                  {(selectedAppt.client_locations?.barangays?.name || '')}
                  {selectedAppt.client_locations?.barangays?.name && (selectedAppt.client_locations?.cities?.name ? ', ' : '')}
                  {(selectedAppt.client_locations?.cities?.name || '')}
                  {selectedAppt.client_locations?.cities?.province ? `, ${selectedAppt.client_locations?.cities?.province}` : ''}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Service:</span> {selectedAppt.services?.name || 'N/A'}
                </p>
                <p className="text-sm text-gray-600">
                  {selectedAppt.status === 'confirmed' ? 'Appointment date' + ': ' + moment(selectedAppt.appointment_date).format('MMM DD, YYYY') : 'Last appointment date' + ': ' + moment(selectedAppt.appointment_date).format('MMM DD, YYYY') } {selectedAppt.appointment_time && `(${selectedAppt.appointment_time})`}
                </p>
                <div className="mt-2">
                  <Badge className={selectedAppt.status === 'confirmed' ? 'bg-orange-500 text-white' : 'bg-green-600 text-white'}>
                    {selectedAppt.status === 'confirmed' ? 'Confirmed' : 'Completed'}
                  </Badge>
                </div>
              </div>

              <div className="pt-2">
                <p className="font-semibold mb-2">Devices</p>
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                  {(selectedAppt.appointment_devices || []).map((row: any) => {
                    const d = row.devices
                    const brand = d?.brands?.name || 'N/A'
                    const acType = d?.ac_types?.name || 'N/A'
                    const hp = d?.horsepower_options?.display_name || 'N/A'
                    const name = d?.name || 'Device'
                    return (
                      <div key={row.id} className="border rounded-md p-3">
                        <div className="flex items-center gap-2">
                          <AirVent size={16} />
                          <p className="font-medium">{name}</p>
                        </div>
                        <p className="text-xs text-gray-600 ml-6">{acType} - HP [{hp}]</p>
                        {selectedAppt.status === 'completed' && (
                          <div className="mt-2 ml-6 space-y-2">
                            <p className="text-xs text-gray-600">Last cleaning date : {d?.last_cleaning_date ? moment(d.last_cleaning_date).format('MMM D, YYYY') : 'N/A'}</p>
                            <div>
                              <p className="text-xs font-semibold text-gray-700 mb-1">3 Months</p>
                              <Progress value={d?.due_3_months ? Math.min(100, Math.max(0, (moment().diff(moment(d.last_cleaning_date), 'days') / (3*30)) * 100)) : 0} className="h-2" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-700 mb-1">4 Months</p>
                              <Progress value={d?.due_4_months ? Math.min(100, Math.max(0, (moment().diff(moment(d.last_cleaning_date), 'days') / (4*30)) * 100)) : 0} className="h-2" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-700 mb-1">6 Months</p>
                              <Progress value={d?.due_6_months ? Math.min(100, Math.max(0, (moment().diff(moment(d.last_cleaning_date), 'days') / (6*30)) * 100)) : 0} className="h-2" />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Actions */}
              {selectedAppt.status === 'confirmed' && (
                <div className="flex justify-end pt-2">
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => {
                      setConfirmTarget(selectedAppt)
                      setConfirmOpen(true)
                    }}
                  >
                    Mark as completed
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Devices for {editTarget?.clients?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {editedDevices.map((device, idx) => (
              <div key={device.rowId} className="mb-4 p-3 border rounded-lg bg-gray-50">
                 <p className="text-sm font-medium mb-2">{device.name}</p>
                <div className="flex flex-col sm:flex-row gap-3">
                 
                  {/* Brand */}
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Brand</label>
                    <select
                      className="w-full border rounded p-2"
                      value={device.brand_id || ""}
                      onChange={(e) => handleDeviceChange(device.rowId, "brand_id", e.target.value)}
                    >
                      <option value="">Select Brand</option>
                      {brands.map((b: any) => (
                        <option key={b.id} value={String(b.id)}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* AC Type */}
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">AC Type</label>
                    <select
                      className="w-full border rounded p-2"
                      value={device.ac_type_id || ""}
                      onChange={(e) => handleDeviceChange(device.rowId, "ac_type_id", e.target.value)}
                    >
                      <option value="">Select Type</option>
                      {acTypes.map((t: any) => (
                        <option key={t.id} value={String(t.id)}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Horsepower */}
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Horsepower</label>
                    <select
                      className="w-full border rounded p-2"
                      value={device.horsepower_id || ""}
                      onChange={(e) => handleDeviceChange(device.rowId, "horsepower_id", e.target.value)}
                    >
                      <option value="">Select HP</option>
                      {horsepowerOptions.map((hp: any) => (
                        <option key={hp.id} value={String(hp.id)}>
                          {hp.display_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          
        <div className="mt-2 text-sm text-gray-700">
          <span className="font-semibold">Subtotal: </span>
          ₱{Number(subtotal).toLocaleString()}
        </div>

        <div className="mt-1 text-sm text-blue-600">
          <span className="font-semibold">Discount ({discount.type}): </span>
          {discount.value}%
        </div>

        <div className="pt-4 font-bold text-lg text-green-600">
          Total: ₱{Number(finalTotal).toLocaleString()}
        </div>

        <div className="flex justify-end mt-4 gap-2">
          <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            className="bg-teal-600 text-white"
            onClick={() => setShowConfirmDialog(true)}
          >
            Save Changes
          </Button>

        </div>

        </DialogContent>
      </Dialog>
      


      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Update</DialogTitle>
          </DialogHeader>
          <p className="text-gray-700">
            Are you sure you want to update the devices and recalculate the total?
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-teal-600 text-white"
              onClick={async () => {
                setShowConfirmDialog(false);

                // Loop through each device and update
                for (const d of editedDevices) {
                  await fetch("/api/admin/devices", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      id: d.device_id,
                      client_id: editTarget.client_id,
                      brand_id: d.brand_id,
                      ac_type_id: d.ac_type_id,
                      horsepower_id: d.horsepower_id,
                    }),
                  });
                }

                // Compute new total
                const subtotal = editedDevices.reduce(
                  (sum, d) =>
                    sum +
                    computeUnitPrice(d, settingsMap, editTarget?.services?.name),
                  0
                );
                const discount = calculateDiscount(
                  editTarget?.clients,
                  customSettings
                );
                const finalAmount =
                  subtotal - (subtotal * discount.value) / 100;

                // Update appointment amount
                await fetch(`/api/admin/appointments`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    id: editTarget.id,
                    amount: finalAmount,
                  }),
                });

                setEditDialogOpen(false);
                setShowSuccessDialog(true); // show success dialog
                await loadAppointments(pagination.page);
              }}
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Successful</DialogTitle>
          </DialogHeader>
          <p className="text-gray-700">Devices and total have been successfully updated.</p>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setShowSuccessDialog(false)}>OK</Button>
          </div>
        </DialogContent>
      </Dialog>


      


      {/* Confirm Complete Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Completion</DialogTitle>
          </DialogHeader>
          <div className="text-sm">
            {`Set ${confirmTarget?.clients?.name || 'Client'} appointment to completed?`}
          </div>
          <div className="flex justify-end gap-2 pt-4">
          <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={confirmLoading}
              onClick={async () => {
                if (!confirmTarget) return
                try {
                  setConfirmLoading(true)

                  // 1. Update appointment status
                  await fetch('/api/admin/appointments', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: confirmTarget.id, status: 'completed' }),
                  })

                  // 2. Handle points increment based on referral status
                  let isReferral = false
                  let clientData: any
                  
                  try {
                    // Fetch the client data to check for ref_id
                    const clientRes = await fetch(`/api/clients/${confirmTarget.clients?.id}`)
                    if (!clientRes.ok) {
                      throw new Error('Failed to fetch client data')
                    }
                    
                    clientData = await clientRes.json()
                    const clientId = clientData.id
                    const pointsToAdd = 1
                    
                    // Check if client has a referrer (ref_id is not null/empty)
                    if (clientData.ref_id) {
                      isReferral = true
                      const refId = clientData.ref_id
                      
                      console.log(`Processing referral: Client ${clientId} was referred by ${refId}`)
                      
                      // Add points to the completed client
                      await fetch(`/api/clients/${clientId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          points: (clientData.points || 0) + pointsToAdd,
                        }),
                      })
                      
                      console.log(`Added ${pointsToAdd} point to client ${clientId}`)
                      
                      // Fetch referrer data and add points
                      const refRes = await fetch(`/api/clients/${refId}`)
                      if (refRes.ok) {
                        const refData = await refRes.json()
                        await fetch(`/api/clients/${refId}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            points: (refData.points || 0) + pointsToAdd,
                          }),
                        })
                        
                        console.log(`Added ${pointsToAdd} point to referrer ${refId}`)
                      }
                      
                      // Remove ref_id after processing (client is no longer a "new" referral)
                      await fetch(`/api/clients/${clientId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ref_id: null }),
                      })
                      
                      console.log(`Removed ref_id from client ${clientId}`)
                      
                    } else {
                      // No referral - just add points to the completed client
                      isReferral = false
                      
                      await fetch(`/api/clients/${clientId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          points: (clientData.points || 0) + pointsToAdd,
                        }),
                      })
                      
                      console.log(`Added ${pointsToAdd} point to client ${clientId} (no referral)`)
                    }
                    
                  } catch (err) {
                    console.error('Error handling client points:', err)
                  }

                  // 3. Insert into notifications table
                  await fetch(`/api/clients/notification-by-id`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      client_id: confirmTarget.clients?.id,
                      send_to_admin: false,
                      send_to_client: true,
                      is_referral: isReferral,
                      date: confirmTarget.appointment_date,
                    }),
                  });

                  // 4. Close dialogs
                  setConfirmOpen(false)
                  setConfirmTarget(null)
                  if (selectedAppt && selectedAppt.id === confirmTarget.id) {
                    setDetailsOpen(false)
                  }

                  // 5. Reload appointments
                  await loadAppointments(pagination.page)
                } catch (e) {
                  console.error('Error completing appointment and adding notification', e)
                } finally {
                  setConfirmLoading(false)
                }
              }}
            >
            {confirmLoading ? 'Please wait...' : 'OK'}
          </Button>
          </div>
        </DialogContent>
      </Dialog>


    </div>
  );
}
