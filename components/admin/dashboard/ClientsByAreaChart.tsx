'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { MapPin } from 'lucide-react'
import { ClientsByArea } from '@/types/database'

interface ClientsByAreaChartProps {
  data: ClientsByArea[]
}

export default function ClientsByAreaChart({ data }: ClientsByAreaChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Prepare data for chart (limit to top 10 areas)
  const chartData = data.slice(0, 10).map(area => ({
    name: area.area.length > 12 ? `${area.area.substring(0, 12)}...` : area.area,
    fullName: `${area.area}, ${area.city}`,
    clients: area.clientCount,
    revenue: area.totalRevenue
  }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-800 mb-2">{data.fullName}</p>
          <div className="space-y-1">
            <p className="text-sm text-blue-600">
              Clients: {data.clients}
            </p>
            <p className="text-sm text-green-600">
              Total Revenue: {formatCurrency(data.revenue)}
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="bg-white rounded-2xl shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <MapPin size={20} />
          Clients by Area
        </CardTitle>
        <p className="text-sm text-gray-500">Top locations by client count and revenue generation</p>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="name" 
                    className="text-xs"
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="clients" 
                    fill="#3b82f6" 
                    radius={[4, 4, 0, 0]}
                    name="clients"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed List */}
            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Detailed Breakdown</h3>
              {data.slice(0, 8).map((area, index) => (
                <div
                  key={`${area.area}-${area.city}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full text-xs font-medium text-blue-700">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">{area.area}</div>
                      <div className="text-sm text-gray-500">{area.city}</div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-semibold text-gray-800">
                      {area.clientCount} client{area.clientCount !== 1 ? 's' : ''}
                    </div>
                    <div className="text-sm text-green-600">
                      {formatCurrency(area.totalRevenue)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {data.reduce((sum, area) => sum + area.clientCount, 0)}
                </div>
                <div className="text-sm text-gray-500">Total Clients</div>
                <div className="text-xs text-gray-400">Across all areas</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(data.reduce((sum, area) => sum + area.totalRevenue, 0))}
                </div>
                <div className="text-sm text-gray-500">Total Revenue</div>
                <div className="text-xs text-gray-400">All completed appointments</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {data.length}
                </div>
                <div className="text-sm text-gray-500">Active Areas</div>
                <div className="text-xs text-gray-400">With at least 1 client</div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <MapPin size={48} className="mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Area Data</h3>
            <p className="text-sm">No client location data available for analysis</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
