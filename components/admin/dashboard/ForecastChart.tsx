'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp } from 'lucide-react'
import { ForecastData } from '@/types/database'

interface ForecastChartProps {
  data: ForecastData[]
}

export default function ForecastChart({ data }: ForecastChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-800 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey === 'projectedRevenue' && (
                <>Revenue Forecast: {formatCurrency(entry.value)}</>
              )}
              {entry.dataKey === 'projectedBookings' && (
                <>Projected Bookings: {entry.value}</>
              )}
              {entry.dataKey === 'devicesScheduled' && (
                <>Devices Scheduled: {entry.value}</>
              )}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <Card className="bg-white rounded-2xl shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <TrendingUp size={20} />
          Revenue & Bookings Forecast
        </CardTitle>
        <p className="text-sm text-gray-500">
          Projected revenue and bookings based on scheduled device maintenance
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="month" 
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                yAxisId="left"
                className="text-xs"
                tick={{ fontSize: 12 }}
                tickFormatter={formatCurrency}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right"
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => {
                  switch (value) {
                    case 'projectedRevenue':
                      return 'Projected Revenue'
                    case 'projectedBookings':
                      return 'Projected Bookings'
                    case 'devicesScheduled':
                      return 'Devices Scheduled'
                    default:
                      return value
                  }
                }}
              />
              
              {/* Revenue bars */}
              <Bar
                yAxisId="left"
                dataKey="projectedRevenue"
                fill="#059669"
                fillOpacity={0.7}
                radius={[4, 4, 0, 0]}
              />
              
              {/* Bookings line */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="projectedBookings"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ r: 4, fill: '#3b82f6' }}
                activeDot={{ r: 6, fill: '#1d4ed8' }}
              />
              
              {/* Devices scheduled line */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="devicesScheduled"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3, fill: '#f59e0b' }}
                activeDot={{ r: 5, fill: '#d97706' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data.reduce((sum, month) => sum + month.projectedRevenue, 0))}
            </div>
            <div className="text-sm text-gray-500">Total Projected Revenue</div>
            <div className="text-xs text-gray-400">Next 6 months</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {data.reduce((sum, month) => sum + month.projectedBookings, 0)}
            </div>
            <div className="text-sm text-gray-500">Total Projected Bookings</div>
            <div className="text-xs text-gray-400">Next 6 months</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">
              {data.reduce((sum, month) => sum + month.devicesScheduled, 0)}
            </div>
            <div className="text-sm text-gray-500">Devices Due Service</div>
            <div className="text-xs text-gray-400">Next 6 months</div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-8 mt-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-600 rounded"></div>
            <span className="text-sm text-gray-600">Projected Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Projected Bookings</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-amber-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Devices Scheduled</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
