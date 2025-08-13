// AdminBookings.tsx
'use client'

import { useEffect, useState } from 'react';
import { Calendar, momentLocalizer, Views, type View } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft, ChevronRight, Download, Filter, Search } from 'lucide-react';
import { Calendar as MiniCalendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AirVent } from 'lucide-react';
import { blockedDatesApi } from '@/pages/api/dates/blockedDatesApi'
import type { BlockedDate } from '@/types/database'

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

  const [events, setEvents] = useState<BookingEvent[]>([]);
  const [rawAppointments, setRawAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'completed'>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'incoming' | 'previous'>('today')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 5

  const [date, setDate] = useState<Date>(new Date())
  const [view, setView] = useState<View>(Views.WEEK)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null)
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<any | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([])

  const onEventDrop = ({ event, start, end }: any) => {
    const updatedEvents = events.map((existingEvent) => {
      return existingEvent.title === event.title
        ? { ...existingEvent, start: new Date(start), end: new Date(end) }
        : existingEvent;
    });
    setEvents(updatedEvents);
    // You would also need to call an API to update the booking on the backend
  };

  const loadAppointments = async (filter: 'all' | 'confirmed' | 'completed') => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/appointments?status=${filter === 'all' ? '' : filter}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to load appointments')
      const apptsAll = json.data as any[]
      setRawAppointments(apptsAll)
      setLoading(false)
    } catch (e) {
      setLoading(false)
    }
  }

  const loadBlockedDates = async () => {
    try {
      const list = await blockedDatesApi.getBlockedDates()
      setBlockedDates(list)
    } catch (e) {
      // noop
    }
  }

  // initial load and on filter/view change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAppointments(statusFilter); loadBlockedDates() }, [statusFilter])

  // Reset page when filter changes or when data updates
  useEffect(() => { setCurrentPage(1) }, [statusFilter, dateFilter, rawAppointments.length])

  // Derived filtered, sorted and paginated appointments
  const filteredAppointments = rawAppointments.filter((a: any) => {
    if (dateFilter === 'all') return true
    const apptDate = moment(a.appointment_date).startOf('day')
    const today = moment().startOf('day')
    if (dateFilter === 'today') return apptDate.isSame(today)
    if (dateFilter === 'incoming') return apptDate.isAfter(today)
    if (dateFilter === 'previous') return apptDate.isBefore(today)
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

  // Build calendar events from filtered appointments
  useEffect(() => {
    const mapped: BookingEvent[] = []
    let hourCursor = 9
    filteredAppointments.forEach((a: any) => {
      const baseDate = new Date(a.appointment_date)
      const start = new Date(baseDate)
      start.setHours(hourCursor, 0, 0, 0)
      const end = new Date(baseDate)
      end.setHours(hourCursor + 1, 0, 0, 0)
      hourCursor += 1
      if (hourCursor >= 17) hourCursor = 9

      const city = a.client_locations?.cities?.name || ''
      const brgy = a.client_locations?.barangays?.name || ''
      const date = a.appointment_date || ''
      const title = `${a.clients?.name || 'Client'}`
      mapped.push({
        title,
        start,
        end,
        status: a.status,
        draggable: a.status === 'confirmed',
        clientName: a.clients?.name || 'Client',
        city,
        barangay: brgy,
        appointmentDate: date,
        appointmentId: a.id,
      })
    })

    // Add blocked dates as full-day red events covering 12:00 AM to 11:59 PM
    blockedDates.forEach((b) => {
      const from = moment(b.from_date).startOf('day')
      const to = moment(b.to_date).startOf('day')
      const day = from.clone()
      while (day.isSameOrBefore(to)) {
        const start = day.clone().startOf('day').toDate()
        const end = day.clone().endOf('day').toDate()
        mapped.push({
          title: `Blocked: ${b.name}`,
          start,
          end,
          status: 'blocked',
          draggable: false,
          blockedName: b.name,
          blockedReason: b.reason,
        })
        day.add(1, 'day')
      }
    })
    setEvents(mapped)
  }, [filteredAppointments, blockedDates])

  return (
    <div className="flex space-x-6 p-4">
      {/* Left Sidebar */}
      <Card className="w-80 p-4 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold">Appointment Calendar</h3>
          {/* Calendar navigation controls */}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm">Status:</span>
          <Button size="sm" variant={statusFilter==='all'?'default':'outline'} onClick={()=>setStatusFilter('all')}>All</Button>
          <Button size="sm" variant={statusFilter==='confirmed'?'default':'outline'} onClick={()=>setStatusFilter('confirmed')}>Confirmed</Button>
          <Button size="sm" variant={statusFilter==='completed'?'default':'outline'} onClick={()=>setStatusFilter('completed')}>Completed</Button>
        </div>
        {/* Date Filter */}
        <div className="flex items-center gap-2">
          
          <Button size="sm" variant={dateFilter==='all'?'default':'outline'} onClick={()=>setDateFilter('all')}>All</Button>
          <Button size="sm" variant={dateFilter==='today'?'default':'outline'} onClick={()=>setDateFilter('today')}>Today</Button>
          <Button size="sm" variant={dateFilter==='incoming'?'default':'outline'} onClick={()=>setDateFilter('incoming')}>Incoming</Button>
          <Button size="sm" variant={dateFilter==='previous'?'default':'outline'} onClick={()=>setDateFilter('previous')}>Prev</Button>
        </div>

        {/* Appointment List */}
        <div>
          {/* <h4 className="text-lg font-semibold mb-3">Client Appointment List</h4> */}
          <div className="space-y-3">
            {sortedAppointments.length === 0 && <div className="text-sm text-gray-500">No appointments</div>}
            {paginatedAppointments.map((a, idx) => {
              const city = a.client_locations?.cities?.name || ''
              const brgy = a.client_locations?.barangays?.name || ''
              const fullTitle = `${a.clients?.name || 'Client'}`
              const globalIdx = startIndex + idx
              const start = moment(a.appointment_date).hour(9 + (globalIdx % 8)).minute(0)
              const end = moment(start).add(1, 'hour')
              return (
                <div key={a.id} className="space-y-2">
                  <div className="flex items-start">
                    <div className="flex-1">
                      <p className="font-medium">{fullTitle}</p>
                      <p className="text-sm text-gray-400">{city}, {brgy}</p>
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
                  {startIndex + idx < sortedAppointments.length - 1 && <Separator className="my-2" />}
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

      {/* Main Calendar View */}
      <div className="flex-1 space-y-4">
        {/* Top Controls */}
        <div className="flex justify-between items-center">
          {/* <div className="flex space-x-2">
            <Button variant="outline"><Filter size={16} className="mr-2" /> Filter</Button>
            <Button variant="outline"><Download size={16} className="mr-2" /> Download Data</Button>
          </div> */}
          <div className="flex space-x-2 items-center">
            <Button variant="ghost" size="icon" onClick={() => setDate(moment(date).subtract(1, view === Views.MONTH ? 'month' : view === Views.WEEK ? 'week' : 'day').toDate())}><ChevronLeft /></Button>
            <span className="font-bold">{moment(date).format(view === Views.MONTH ? 'MMMM YYYY' : 'MMMM YYYY')}</span>
            <Button variant="ghost" size="icon" onClick={() => setDate(moment(date).add(1, view === Views.MONTH ? 'month' : view === Views.WEEK ? 'week' : 'day').toDate())}><ChevronRight /></Button>
            <Button onClick={() => setDate(new Date())}>Today</Button>
            <div className="ml-4 flex gap-2">
              <Button variant={view === Views.MONTH ? 'default' : 'outline'} onClick={() => setView(Views.MONTH)}>Month</Button>
              <Button variant={view === Views.WEEK ? 'default' : 'outline'} onClick={() => setView(Views.WEEK)}>Week</Button>
              <Button variant={view === Views.DAY ? 'default' : 'outline'} onClick={() => setView(Views.DAY)}>Day</Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
           
            <div className="ml-4 flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-orange-500 inline-block"></span> Confirmed</span>
              <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-green-600 inline-block"></span> Completed</span>
              <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-red-600 inline-block"></span> Blocked</span>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline"><Search size={16} className="mr-2" /> Search</Button>
          </div>
        </div>

        {/* The Calendar component itself */}
        <div className="bg-white rounded-lg p-4 shadow-md h-[calc(95vh-160px)]">
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
              const appt = rawAppointments.find((a: any) => a.id === event.appointmentId)
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
                      const appt = rawAppointments.find((a: any) => a.id === event.appointmentId)
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
              const appt = rawAppointments.find((a: any) => a.id === event.appointmentId)
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
              variant="outline"
              onClick={() => {
                if (confirmLoading) return
                setConfirmOpen(false)
                setConfirmTarget(null)
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={confirmLoading}
              onClick={async () => {
                if (!confirmTarget) return
                try {
                  setConfirmLoading(true)
                  await fetch('/api/admin/appointments', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: confirmTarget.id, status: 'completed' }),
                  })
                  // Close dialogs
                  setConfirmOpen(false)
                  setConfirmTarget(null)
                  if (selectedAppt && selectedAppt.id === confirmTarget.id) {
                    setDetailsOpen(false)
                  }
                  // Reload with current status filter
                  await loadAppointments(statusFilter)
                } catch (e) {
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