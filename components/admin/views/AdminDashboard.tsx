'use client'

import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '@/lib/store'
import { setError, setLoading } from '@/lib/features/admin/adminSlice'
import { RefreshCw, AlertCircle } from 'lucide-react'

// Import dashboard components
import SalesCards from '../dashboard/SalesCards'
import SalesTrendChart from '../dashboard/SalesTrendChart'
import BookingStatusChart from '../dashboard/BookingStatusChart'
import UpcomingAppointmentsTable from '../dashboard/UpcomingAppointmentsTable'
import TopClientsTable from '../dashboard/TopClientsTable'
import DevicesDueCard from '../dashboard/DevicesDueCard'
import ForecastChart from '../dashboard/ForecastChart'
import ClientsByAreaChart from '../dashboard/ClientsByAreaChart'
import ReturnClientsTable from "../dashboard/ReturnClientsTable";

// Import types
import {
  DashboardStats,
  MonthlySalesData,
  UpcomingAppointment,
  TopClient,
  ClientsByArea,
  DeviceDueSoon,
  ForecastData,
  ChurnRiskClient,
  ReturnClient
} from '@/types/database'

interface DashboardAnalytics {
  stats: DashboardStats;
  monthlySalesData: MonthlySalesData[];
  upcomingAppointments: UpcomingAppointment[];
  topClients: TopClient[];
  clientsByArea: ClientsByArea[];
  returnClients: ReturnClient[];
  devicesDueSoon: DeviceDueSoon[];
  forecastData: ForecastData[];
  churnRiskClients: ChurnRiskClient[];
}

export default function AdminDashboard() {
  const dispatch = useDispatch()
  const { loading, error } = useSelector((s: RootState) => s.admin)
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const loadAnalytics = async () => {
    setRefreshing(true)
    dispatch(setLoading(true))
    try {
      const res = await fetch('/api/admin/dashboard-analytics')
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to fetch analytics')
      setAnalytics(data)
      dispatch(setError(null))
    } catch (e: any) {
      dispatch(setError(e.message))
      console.error('Analytics error:', e)
    } finally {
      dispatch(setLoading(false))
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadAnalytics()
  }, [])

  if (loading && !analytics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <div className="animate-spin">
            <RefreshCw size={20} className="text-blue-600" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow-lg p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-3"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow-lg p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <button
            onClick={loadAnalytics}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Retry
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <AlertCircle size={24} className="text-red-600" />
            <div>
              <h3 className="text-lg font-semibold text-red-800">Failed to Load Dashboard</h3>
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-500">No analytics data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-6 pb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-gray-600 text-sm">
              Comprehensive analytics and insights for your AC cleaning business
            </p>
          </div>
          <button
            onClick={loadAnalytics}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Sales & Bookings Section */}
        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            💰 Sales & Bookings
          </h2>
          
          <SalesCards stats={analytics.stats} />
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <SalesTrendChart data={analytics.monthlySalesData} />
            <BookingStatusChart data={analytics.stats.bookingStatusBreakdown} />
          </div>
          
          <UpcomingAppointmentsTable appointments={analytics.upcomingAppointments} />
        </section>

        {/* Clients & Retention Section */}
        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            👥 Clients & Retention
          </h2>
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <TopClientsTable clients={analytics.topClients} />
            <ReturnClientsTable clients={analytics.returnClients} />
            
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-1">
            <ClientsByAreaChart data={analytics.clientsByArea} />
          </div>
        </section>

        {/* Devices & Maintenance Section */}
        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            🔧 Devices & Maintenance Forecast
          </h2>
          
          <DevicesDueCard 
            devices={analytics.devicesDueSoon} 
            stats={analytics.stats.devicesData} 
          />
        </section>

        {/* Forecast & Projections Section */}
        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            📈 Forecast & Projections
          </h2>
          
          <ForecastChart data={analytics.forecastData} />
          
          {/* Churn Risk Summary */}
          {analytics.churnRiskClients.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-amber-800 mb-3">⚠️ Churn Risk Alert</h3>
              <p className="text-amber-700 mb-4">
                {analytics.churnRiskClients.length} client{analytics.churnRiskClients.length !== 1 ? 's' : ''} with devices haven`t booked in 6+ months
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {analytics.churnRiskClients.slice(0, 6).map((client) => (
                  <div key={client.id} className="bg-white rounded-lg p-4 border border-amber-200">
                    <div className="font-medium text-gray-800">{client.name}</div>
                    <div className="text-sm text-gray-600">{client.mobile}</div>
                    <div className="text-xs text-amber-600 mt-1">
                      {client.deviceCount} device{client.deviceCount !== 1 ? 's' : ''} • 
                      {client.daysSinceLastAppointment} days ago
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Footer */}
        <div className="text-center py-6 text-gray-500 border-t border-gray-200">
          <p className="text-xs">
            Dashboard last updated: {new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}


