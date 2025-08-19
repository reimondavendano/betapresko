'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, MapPin, Phone } from 'lucide-react'
import { UpcomingAppointment } from '@/types/database'
import { format } from 'date-fns'

interface UpcomingAppointmentsTableProps {
  appointments: UpcomingAppointment[]
}

export default function UpcomingAppointmentsTable({ appointments }: UpcomingAppointmentsTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy')
    } catch (error) {
      return dateString
    }
  }

  const formatTime = (timeString: string | null) => {
    if (!timeString) return 'TBD'
    return timeString
  }

  const isToday = (dateString: string) => {
    const today = new Date()
    const appointmentDate = new Date(dateString)
    return (
      today.getDate() === appointmentDate.getDate() &&
      today.getMonth() === appointmentDate.getMonth() &&
      today.getFullYear() === appointmentDate.getFullYear()
    )
  }

  const isTomorrow = (dateString: string) => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const appointmentDate = new Date(dateString)
    return (
      tomorrow.getDate() === appointmentDate.getDate() &&
      tomorrow.getMonth() === appointmentDate.getMonth() &&
      tomorrow.getFullYear() === appointmentDate.getFullYear()
    )
  }

  return (
    <Card className="bg-white rounded-2xl shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Calendar size={20} />
          Upcoming Appointments
        </CardTitle>
        <p className="text-sm text-gray-500">Next 30 days confirmed appointments</p>
      </CardHeader>
      <CardContent>
        {appointments.length > 0 ? (
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className={`p-4 rounded-lg border transition-colors hover:shadow-md ${
                  isToday(appointment.appointment_date)
                    ? 'bg-blue-50 border-blue-200'
                    : isTomorrow(appointment.appointment_date)
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    {/* Client Info */}
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-800">{appointment.client_name}</h3>
                      {isToday(appointment.appointment_date) && (
                        <span className="px-2 py-1 text-xs bg-blue-600 text-white rounded-full">
                          Today
                        </span>
                      )}
                      {isTomorrow(appointment.appointment_date) && (
                        <span className="px-2 py-1 text-xs bg-yellow-600 text-white rounded-full">
                          Tomorrow
                        </span>
                      )}
                    </div>

                    {/* Contact */}
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Phone size={14} />
                        <span>{appointment.client_mobile}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin size={14} />
                        <span>{appointment.location_name}</span>
                      </div>
                    </div>

                    {/* Service */}
                    <div className="text-sm font-medium text-gray-700">
                      {appointment.service_name}
                    </div>
                  </div>

                  <div className="flex lg:flex-col lg:items-end justify-between lg:justify-start gap-2 lg:gap-1">
                    {/* Date & Time */}
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Calendar size={14} />
                        <span>{formatDate(appointment.appointment_date)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                        <Clock size={14} />
                        <span>{formatTime(appointment.appointment_time)}</span>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency(appointment.amount)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Calendar size={48} className="mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Upcoming Appointments</h3>
            <p className="text-sm">No confirmed appointments for the next 30 days</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
