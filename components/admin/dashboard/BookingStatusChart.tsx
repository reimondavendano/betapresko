'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { DashboardStats } from '@/types/database'

interface BookingStatusChartProps {
  data: DashboardStats['bookingStatusBreakdown']
}

const COLORS = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  completed: '#10b981',
  voided: '#ef4444'
}

const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  voided: 'Voided'
}

export default function BookingStatusChart({ data }: BookingStatusChartProps) {
  const chartData = Object.entries(data).map(([status, count]) => ({
    name: STATUS_LABELS[status as keyof typeof STATUS_LABELS],
    value: count,
    color: COLORS[status as keyof typeof COLORS]
  })).filter(item => item.value > 0)

  const total = Object.values(data).reduce((sum, count) => sum + count, 0)

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-800">{data.name}</p>
          <p className="text-sm text-gray-600">
            {data.value} bookings ({Math.round((data.value / total) * 100)}%)
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="bg-white rounded-2xl shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-800">
          Booking Status Breakdown
        </CardTitle>
        <p className="text-sm text-gray-500">Current month appointment status distribution</p>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <div className="h-80 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value, entry: any) => (
                    <span style={{ color: entry.color }} className="text-sm">
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">{total}</div>
                <div className="text-sm text-gray-500">Total</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-2">📅</div>
              <p>No bookings this month</p>
            </div>
          </div>
        )}

        {/* Status Summary */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          {Object.entries(data).map(([status, count]) => (
            <div key={status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: COLORS[status as keyof typeof COLORS] }}
                ></div>
                <span className="text-sm text-gray-600">
                  {STATUS_LABELS[status as keyof typeof STATUS_LABELS]}
                </span>
              </div>
              <span className="font-semibold text-gray-800">{count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
