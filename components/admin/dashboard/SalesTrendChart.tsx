'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { MonthlySalesData } from '@/types/database'

interface SalesTrendChartProps {
  data: MonthlySalesData[]
}

export default function SalesTrendChart({ data }: SalesTrendChartProps) {
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
              {entry.dataKey === 'sales' && (
                <>Revenue: {formatCurrency(entry.value)}</>
              )}
              {entry.dataKey === 'bookings' && (
                <>Bookings: {entry.value}</>
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
        <CardTitle className="text-lg font-semibold text-gray-800">
          Monthly Sales Trend
        </CardTitle>
        <p className="text-sm text-gray-500">Revenue and booking trends over the last 12 months</p>
      </CardHeader>
      <CardContent>
        <div className="h-80">
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
                formatter={(value) => value === 'sales' ? 'Sales Revenue' : 'Bookings Count'}
              />
              
              {/* Sales bars */}
              <Bar
                yAxisId="left"
                dataKey="sales"
                fill="#059669"
                fillOpacity={0.7}
                radius={[2, 2, 0, 0]}
              />
              
              {/* Bookings line */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="bookings"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ r: 4, fill: '#3b82f6' }}
                activeDot={{ r: 6, fill: '#1d4ed8' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-600 rounded"></div>
            <span className="text-sm text-gray-600">Sales Revenue (₱)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Bookings Count</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
