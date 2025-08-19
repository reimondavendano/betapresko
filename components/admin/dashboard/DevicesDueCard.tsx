'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Wrench, AlertTriangle, Calendar, MapPin } from 'lucide-react'
import { DeviceDueSoon, DashboardStats } from '@/types/database'
import { format } from 'date-fns'

interface DevicesDueCardProps {
  devices: DeviceDueSoon[]
  stats: DashboardStats['devicesData']
}

export default function DevicesDueCard({ devices, stats }: DevicesDueCardProps) {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy')
    } catch (error) {
      return dateString
    }
  }

  const getDueTypeLabel = (dueType: string) => {
    switch (dueType) {
      case '3_months':
        return '3 Month'
      case '4_months':
        return '4 Month'
      case '6_months':
        return '6 Month'
      default:
        return 'Unknown'
    }
  }

  const getDueTypeColor = (dueType: string) => {
    switch (dueType) {
      case '3_months':
        return 'bg-red-100 text-red-700 border-red-200'
      case '4_months':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case '6_months':
        return 'bg-green-100 text-green-700 border-green-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const isOverdue = (dateString: string) => {
    const today = new Date()
    const dueDate = new Date(dateString)
    return dueDate < today
  }

  const getDaysUntilDue = (dateString: string) => {
    const today = new Date()
    const dueDate = new Date(dateString)
    const diffTime = dueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Due Within 30 Days
            </CardTitle>
            <div className="bg-orange-100 text-orange-600 rounded-full p-2">
              <Wrench size={20} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-800">
              {stats.dueWithin30Days}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Devices requiring maintenance
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Churn Risk
            </CardTitle>
            <div className="bg-red-100 text-red-600 rounded-full p-2">
              <AlertTriangle size={20} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-800">
              {stats.churnRisk}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Clients at risk of churning
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Devices Due List */}
      <Card className="bg-white rounded-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Calendar size={20} />
            Devices Due Soon
          </CardTitle>
          <p className="text-sm text-gray-500">Devices requiring maintenance in the next 30 days</p>
        </CardHeader>
        <CardContent>
          {devices.length > 0 ? (
            <div className="space-y-3">
              {devices.slice(0, 10).map((device) => {
                const daysUntilDue = getDaysUntilDue(device.due_date)
                const overdue = isOverdue(device.due_date)

                return (
                  <div
                    key={`${device.id}-${device.due_type}`}
                    className={`p-4 rounded-lg border transition-colors hover:shadow-md ${
                      overdue
                        ? 'bg-red-50 border-red-200'
                        : daysUntilDue <= 7
                        ? 'bg-orange-50 border-orange-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        {/* Device Info */}
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-800">{device.name}</h3>
                          <span className={`px-2 py-1 text-xs border rounded-full ${getDueTypeColor(device.due_type)}`}>
                            {getDueTypeLabel(device.due_type)} Service
                          </span>
                          {overdue && (
                            <span className="px-2 py-1 text-xs bg-red-600 text-white rounded-full">
                              Overdue
                            </span>
                          )}
                        </div>

                        {/* Client & Location */}
                        <div className="space-y-1 text-sm text-gray-600">
                          <div>{device.client_name}</div>
                          <div className="flex items-center gap-1">
                            <MapPin size={12} />
                            <span>{device.location_name}</span>
                          </div>
                        </div>

                        {/* Device Details */}
                        {(device.brand_name || device.ac_type_name) && (
                          <div className="text-sm text-gray-500">
                            {device.brand_name && <span>{device.brand_name}</span>}
                            {device.brand_name && device.ac_type_name && <span> • </span>}
                            {device.ac_type_name && <span>{device.ac_type_name}</span>}
                          </div>
                        )}
                      </div>

                      <div className="text-right space-y-1">
                        {/* Due Date */}
                        <div className="text-sm font-medium text-gray-800">
                          {formatDate(device.due_date)}
                        </div>
                        
                        {/* Days Until Due */}
                        <div className={`text-sm ${
                          overdue
                            ? 'text-red-600'
                            : daysUntilDue <= 7
                            ? 'text-orange-600'
                            : 'text-gray-500'
                        }`}>
                          {overdue 
                            ? `${Math.abs(daysUntilDue)} days overdue`
                            : daysUntilDue === 0
                            ? 'Due today'
                            : daysUntilDue === 1
                            ? 'Due tomorrow'
                            : `${daysUntilDue} days left`
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              
              {devices.length > 10 && (
                <div className="text-center py-4 text-gray-500">
                  <p className="text-sm">
                    And {devices.length - 10} more devices due for maintenance...
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Wrench size={48} className="mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Maintenance Due</h3>
              <p className="text-sm">No devices require maintenance in the next 30 days</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
