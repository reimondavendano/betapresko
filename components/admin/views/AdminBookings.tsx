// AdminBookings.tsx
'use client'

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Calendar, momentLocalizer, Views, type View } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft, ChevronRight, Download, Filter, Search, Settings, Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { Calendar as MiniCalendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AirVent } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { blockedDatesApi } from '@/pages/api/dates/blockedDatesApi';
import type { BlockedDate } from '@/types/database';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import { setAppointments } from '@/lib/features/admin/adminSlice';
import { subscribeToBookings } from '@/lib/features/admin/RealtimeBooking';


// Set moment locale to ensure proper formatting
moment.locale('en');
const localizer = momentLocalizer(moment);

const DnDCalendar = withDragAndDrop(Calendar as any);

export default function AdminBookings() {
  type BookingEvent = {
    title: string
    start: Date
    end: Date
    status: 'confirmed' | 'completed' | 'blocked'
    draggable?: boolean
    clientName?: string
    city?: string
    barangay?: string
    appointmentDate?: string
    appointmentId?: string
    blockedName?: string
    blockedReason?: string | null
  }

  const dispatch = useDispatch();
  const appointments = useSelector((state: RootState) => state.admin.appointments);
  const [events, setEvents] = useState<BookingEvent[]>([]);
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'completed'>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'incoming' | 'previous'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 4

  const [date, setDate] = useState<Date>(new Date())
  const [view, setView] = useState<View>(Views.MONTH)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null)
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<any | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);

  useEffect(() => {
    const channel = subscribeToBookings();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const onEventDrop = async ({ event, start, end }: any) => {
    // Update UI immediately
    const updatedEvents = events.map((existingEvent) => (
      existingEvent === event
        ? { ...existingEvent, start: new Date(start), end: new Date(end) }
        : existingEvent
    ))
    setEvents(updatedEvents)

    // Persist to backend: if this is a real appointment, set appointment_date and appointment_time
    if (event.appointmentId && event.service_id) {
      const newDate = moment(start).format('YYYY-MM-DD')
      const newTime = moment(start).format('hh:mm A')
      try {
        await fetch('/api/admin/appointments', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: event.appointmentId, appointment_date: newDate, appointment_time: newTime })
        })
      } catch (e) {
        // ignore for now
      }
    }
  };

    const loadAppointments = useCallback(async (filter: 'all' | 'confirmed' | 'completed') => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/appointments?status=${filter === 'all' ? '' : filter}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to load appointments')
      dispatch(setAppointments(json.data as any[]));
      setLoading(false)
    } catch (e) {
      setLoading(false)
    }
  }, [dispatch]);

  const loadBlockedDates = useCallback(async () => {
    try {
      const list = await blockedDatesApi.getBlockedDates()
      setBlockedDates(list)
    } catch (e) {
      // noop
    }
  }, []);

  useEffect(() => {
    loadAppointments(statusFilter);
    loadBlockedDates();
  }, [statusFilter, loadAppointments, loadBlockedDates]);

  // Reset page when filter changes or when data updates
  useEffect(() => { setCurrentPage(1) }, [statusFilter, dateFilter, searchQuery, appointments.length])

  // Derived filtered, sorted and paginated appointments
  const filteredAppointments = appointments.filter((a: any) => {
    // Date filter
    if (dateFilter !== 'all') {
      const apptDate = moment(a.appointment_date).startOf('day')
      const today = moment().startOf('day')
      if (dateFilter === 'today' && !apptDate.isSame(today)) return false
      if (dateFilter === 'incoming' && !apptDate.isAfter(today)) return false
      if (dateFilter === 'previous' && !apptDate.isBefore(today)) return false
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const clientName = (a.clients?.name || '').toLowerCase()
      const city = (a.client_locations?.cities?.name || '').toLowerCase()
      const barangay = (a.client_locations?.barangays?.name || '').toLowerCase()
      const serviceName = (a.services?.name || '').toLowerCase()
      
      return clientName.includes(query) || 
             city.includes(query) || 
             barangay.includes(query) ||
             serviceName.includes(query)
    }
    
    return true
  })

  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    const aDate = new Date(a.appointment_date).getTime()
    const bDate = new Date(b.appointment_date).getTime()
    return bDate - aDate
  })
  const totalPages = Math.max(1, Math.ceil(sortedAppointments.length / pageSize))
  const startIndex = (currentPage - 1) * pageSize
  const paginatedAppointments = sortedAppointments.slice(startIndex, startIndex + pageSize)


  const mappedEvents = useMemo(() => {
  const mapped: BookingEvent[] = []

  let hourCursor = 9
  filteredAppointments.forEach((a: any) => {
    const baseDate = new Date(a.appointment_date)
    let start = new Date(baseDate)
    let end = new Date(baseDate)

    if (a.appointment_time) {
      const parsed = moment(a.appointment_time, "hh:mm A")
      start.setHours(parsed.hour(), parsed.minute(), 0, 0)
      end.setHours(parsed.hour() + 1, parsed.minute(), 0, 0)
    } else {
      start.setHours(hourCursor, 0, 0, 0)
      end.setHours(hourCursor + 1, 0, 0, 0)
      hourCursor = hourCursor >= 16 ? 9 : hourCursor + 1
    }

    mapped.push({
      title: a.clients?.name || "Client",
      start,
      end,
      status: a.status,
      draggable: a.status === "confirmed",
      clientName: a.clients?.name || "Client",
      city: a.client_locations?.cities?.name || "",
      barangay: a.client_locations?.barangays?.name || "",
      appointmentDate: a.appointment_date,
      appointmentId: a.id,
    })
  })

  blockedDates.forEach((b) => {
    const from = moment(b.from_date).startOf("day")
    const to = moment(b.to_date).startOf("day")
    const day = from.clone()
    while (day.isSameOrBefore(to)) {
      mapped.push({
        title: `Blocked: ${b.name}`,
        start: day.clone().startOf("day").toDate(),
        end: day.clone().endOf("day").toDate(),
        status: "blocked",
        draggable: false,
        blockedName: b.name,
        blockedReason: b.reason,
      })
      day.add(1, "day")
    }
  })

  return mapped
}, [filteredAppointments, blockedDates])

// ✅ Only update if different
useEffect(() => {
  const isSame =
    events.length === mappedEvents.length &&
    events.every((e, i) => e.title === mappedEvents[i].title && e.start.getTime() === mappedEvents[i].start.getTime())

  if (!isSame) {
    setEvents(mappedEvents)
  }
}, [mappedEvents, events])


  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 pb-6">
      {/* COMMENTED OUT: Left Sidebar - Appointment list functionality moved to AdminAppointments */}
      {/*
      <Card className="w-100 p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold">Appointment Calendar</h3>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="flex items-center gap-2 h-8">
                <Settings size={14} />
                Status
                <ChevronDown size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setStatusFilter('all')} className={statusFilter === 'all' ? 'bg-accent' : ''}>
                All
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('confirmed')} className={statusFilter === 'confirmed' ? 'bg-accent' : ''}>
                Confirmed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('completed')} className={statusFilter === 'completed' ? 'bg-accent' : ''}>
                Completed
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="flex items-center gap-2 h-8">
                <CalendarIcon size={14} />
                Show by
                <ChevronDown size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setDateFilter('all')} className={dateFilter === 'all' ? 'bg-accent' : ''}>
                All
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateFilter('today')} className={dateFilter === 'today' ? 'bg-accent' : ''}>
                Today
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateFilter('incoming')} className={dateFilter === 'incoming' ? 'bg-accent' : ''}>
                Incoming
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateFilter('previous')} className={dateFilter === 'previous' ? 'bg-accent' : ''}>
                Previous
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input 
              placeholder="Search..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full h-8"
            />
          </div>
        </div>

        <div>
          <div className="space-y-3">
            {sortedAppointments.length === 0 && <div className="text-sm text-gray-500">No appointments</div>}
            {paginatedAppointments.map((a, idx) => {
              const city = a.client_locations?.cities?.name || ''
              const brgy = a.client_locations?.barangays?.name || ''
              const fullTitle = `${a.clients?.name || 'Client'}`
              const globalIdx = startIndex + idx
              const start = moment(a.appointment_date).hour(9 + (globalIdx % 8)).minute(0)
              const end = moment(start).add(1, 'hour')
              const serviceName = a.services?.name || 'N/A'
              return (
                <div key={a.id} className="space-y-2">
                  <div className="flex items-start">
                    <div className="flex-1">
                      <p className="font-medium">{fullTitle}</p>
                      <p className="text-sm text-gray-400">{city}, {brgy}</p>
                      <p className="text-sm text-blue-600 font-medium">{serviceName}</p>
                      <p className="text-sm text-gray-400">{a.appointment_date} [{start.format('hh:mm A')} - {end.format('hh:mm A')}]</p>
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-800 text-white"
                          onClick={() => {
                            setSelectedAppt(a)
                            setSelectedTimeRange(`${start.format('hh:mm A')} - ${end.format('hh:mm A')}`)
                            setDetailsOpen(true)
                          }}
                        >
                          View Details
                        </Button>
                        {a.status === 'confirmed' && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => {
                              setConfirmTarget(a)
                              setConfirmOpen(true)
                            }}
                          >
                            Mark as completed
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {sortedAppointments.length > 0 && (
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                Showing {sortedAppointments.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + pageSize, sortedAppointments.length)} of {sortedAppointments.length}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>Previous</Button>
                <span className="text-xs">Page {currentPage} of {totalPages}</span>
                <Button size="sm" variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
              </div>
            </div>
          )}
        </div>
      </Card>
      */}

      {/* Main Calendar View - Now Full Width */}
      <div className="w-full space-y-4">
        {/* Top Controls */}
        <div className="flex flex-wrap justify-between items-start gap-2">
          {/* Left section: navigation + view buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setDate(moment(date).subtract(1, view === Views.MONTH ? 'month' : view === Views.WEEK ? 'week' : 'day').toDate())}>
              <ChevronLeft />
            </Button>
            <span className="font-bold">{moment(date).format(view === Views.MONTH ? 'MMMM YYYY' : 'MMMM YYYY')}</span>
            <Button variant="ghost" size="icon" onClick={() => setDate(moment(date).add(1, view === Views.MONTH ? 'month' : view === Views.WEEK ? 'week' : 'day').toDate())}>
              <ChevronRight />
            </Button>
            <Button onClick={() => setDate(new Date())}>Today</Button>

            {/* View buttons */}
            <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
              <Button variant={view === Views.MONTH ? 'default' : 'outline'} onClick={() => setView(Views.MONTH)}>Month</Button>
              <Button variant={view === Views.WEEK ? 'default' : 'outline'} onClick={() => setView(Views.WEEK)}>Week</Button>
              <Button variant={view === Views.DAY ? 'default' : 'outline'} onClick={() => setView(Views.DAY)}>Day</Button>
            </div>
          </div>

          {/* Right section: legends */}
          <div className="flex flex-wrap gap-3 text-xs mt-2 sm:mt-0">
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-3 rounded-full bg-orange-500 inline-block"></span> Confirmed
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-3 rounded-full bg-green-600 inline-block"></span> Completed
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-3 rounded-full bg-red-600 inline-block"></span> Blocked
            </span>
          </div>
        </div>


        {/* The Calendar component itself - Expanded */}
        <div className="bg-white rounded-lg p-4 shadow-md h-[calc(100vh-160px)]">
          <DnDCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            date={date}
            view={view}
            onNavigate={(d) => setDate(d)}
            onView={(v) => setView(v)}
            defaultView={Views.WEEK}
            views={[Views.MONTH, Views.WEEK, Views.DAY]}
            draggableAccessor={(e: any) => !!e.draggable}
            onSelectEvent={(event: any) => {
              const appt = appointments.find((a: any) => a.id === event.appointmentId)
              if (appt) {
                const timeLabel = `${moment(event.start).format('hh:mm A')} - ${moment(event.end).format('hh:mm A')}`
                setSelectedAppt(appt)
                setSelectedTimeRange(timeLabel)
                setDetailsOpen(true)
              }
            }}
            eventPropGetter={(event: any) => {
              const base = { className: '', style: {} as React.CSSProperties }
              if (event.status === 'confirmed') {
                base.style = { backgroundColor: '#f59e0b', borderColor: '#d97706', color: 'white' }
              } else if (event.status === 'completed') {
                base.style = { backgroundColor: '#16a34a', borderColor: '#15803d', color: 'white' }
              } else if (event.status === 'blocked') {
                base.style = { backgroundColor: '#dc2626', borderColor: '#b91c1c', color: 'white' }
              }
              return base
            }}
            components={{
              event: ({ event }: { event: any }) => {
                const dateLabel = moment(event.appointmentDate || event.start).format('MMMM DD, YYYY')
                const timeLabel = `${moment(event.start).format('hh:mm A')} - ${moment(event.end).format('hh:mm A')}`
                const location = [event.city, event.barangay].filter(Boolean).join(', ')
                if (event.status === 'blocked') {
                  return (
                    <div className="leading-tight text-left w-full h-full">
                      <div className="font-semibold text-[11px]">Blocked: {event.blockedName}</div>
                      {event.blockedReason && (
                        <div className="text-[10px] opacity-90">{event.blockedReason}</div>
                      )}
                      <div className="text-[10px] opacity-90">{dateLabel} [{timeLabel}]</div>
                    </div>
                  )
                }
                return (
                  <button
                    type="button"
                    className="leading-tight text-left cursor-pointer w-full h-full"
                    onClick={() => {
                      const appt = appointments.find((a: any) => a.id === event.appointmentId)
                      if (appt) {
                        setSelectedAppt(appt)
                        setSelectedTimeRange(timeLabel)
                        setDetailsOpen(true)
                      }
                    }}
                  >
                    <div className="font-semibold text-[11px]">{event.clientName || event.title}</div>
                    {location && <div className="text-[10px] opacity-90">{location}</div>}
                    <div className="text-[10px] opacity-90">{dateLabel} [{timeLabel}]</div>
                  </button>
                )
              },
            }}
            onDoubleClickEvent={(event: any) => {
              const appt = appointments.find((a: any) => a.id === event.appointmentId)
              if (appt) {
                const timeLabel = `${moment(event.start).format('hh:mm A')} - ${moment(event.end).format('hh:mm A')}`
                setSelectedAppt(appt)
                setSelectedTimeRange(timeLabel)
                setDetailsOpen(true)
              }
            }}
            onEventDrop={onEventDrop}
            // More props for customization
          />
        </div>
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
                  {selectedAppt.status === 'confirmed' ? 'Appointment date' + ': ' + moment(selectedAppt.appointment_date).format('MMM DD, YYYY') : 'Last appointment date' + ': ' + moment(selectedAppt.appointment_date).format('MMM DD, YYYY') } ({selectedTimeRange})
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

                  // 2. Check if client is referral
                  let isReferral = false
                  let clientData: any
                  try {
                    const clientRes = await fetch(`/api/clients/${confirmTarget.clients?.id}`)
                    if (clientRes.ok) {
                      clientData = await clientRes.json()
                      if (clientData?.ref_id) {
                        isReferral = true

                        // --- Add points to client and referrer ---
                        const clientId = clientData.id
                        const refId = clientData.ref_id

                        const pointsToAdd = 1;

                        // Add points to completed client
                        await fetch(`/api/clients/${clientId}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            field: "points",
                            value: (clientData.points || 0) + pointsToAdd,
                          }),
                        })

                        // Fetch referrer
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
                        }

                        // Remove ref_id from completed client
                        await fetch(`/api/clients/${clientId}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ ref_id: null }),
                        })
                      } 
                    }
                  } catch (err) {
                    console.error('Error handling client points/ref_id', err)
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
                  await loadAppointments(statusFilter)
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
    </div>
  );
}