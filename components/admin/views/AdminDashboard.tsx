'use client'

import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RootState } from '@/lib/store'
import { setDashboardStats, setError, setLoading } from '@/lib/features/admin/adminSlice'
import { Users, Calendar, Clock, DollarSign, TrendingUp } from 'lucide-react'

export default function AdminDashboard() {
  const dispatch = useDispatch()
  const { dashboardStats, loading, error } = useSelector((s: RootState) => s.admin)

  useEffect(() => {
    const load = async () => {
      dispatch(setLoading(true))
      try {
        const res = await fetch('/api/admin/dashboard')
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Failed to fetch dashboard')
        dispatch(setDashboardStats(data))
        dispatch(setError(null))
      } catch (e: any) {
        dispatch(setError(e.message))
      } finally {
        dispatch(setLoading(false))
      }
    }
    load()
  }, [dispatch])

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="bg-white rounded-2xl shadow-lg p-6">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Sales</p>
              <p className="text-3xl font-bold text-gray-800">₱250,220</p>
              <p className="flex items-center gap-1 text-xs text-green-600 font-medium mt-1">
                <TrendingUp size={14} />
                +55% last month
              </p>
            </div>
            <div className="bg-green-100 text-green-600 rounded-full p-3">
              <DollarSign size={28} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white rounded-2xl shadow-lg p-6">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Sales</p>
              <p className="text-3xl font-bold text-gray-800">₱250,220</p>
              <p className="flex items-center gap-1 text-xs text-green-600 font-medium mt-1">
                <TrendingUp size={14} />
                +55% last month
              </p>
            </div>
            <div className="bg-green-100 text-green-600 rounded-full p-3">
              <DollarSign size={28} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white rounded-2xl shadow-lg p-6">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Sales</p>
              <p className="text-3xl font-bold text-gray-800">₱250,220</p>
              <p className="flex items-center gap-1 text-xs text-green-600 font-medium mt-1">
                <TrendingUp size={14} />
                +55% last month
              </p>
            </div>
            <div className="bg-green-100 text-green-600 rounded-full p-3">
              <DollarSign size={28} />
            </div>
          </CardContent>
        </Card>
      </div>
      

      {/* Charts Section */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-white rounded-2xl shadow-lg">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-800">Revenue</h3>
          </CardHeader>
          <CardContent>
            {/* Placeholder for Revenue Line Chart */}
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg text-gray-400">
              [ Revenue Chart Placeholder ]
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white rounded-2xl shadow-lg">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-800">Website Visitors</h3>
          </CardHeader>
          <CardContent>
            {/* Placeholder for Website Visitors Donut Chart */}
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg text-gray-400">
              [ Website Visitors Chart Placeholder ]
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables/Lists Section */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-white rounded-2xl shadow-lg">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-800">Top Selling Product</h3>
          </CardHeader>
          <CardContent>
            {/* Placeholder for Top Selling Product Table */}
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg text-gray-400">
              [ Top Selling Product Table Placeholder ]
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white rounded-2xl shadow-lg">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-800">New Customers</h3>
          </CardHeader>
          <CardContent>
            {/* Placeholder for New Customers List */}
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg text-gray-400">
              [ New Customers List Placeholder ]
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


