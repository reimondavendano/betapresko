'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, TrendingUp, Calendar, Users } from 'lucide-react'
import { DashboardStats } from '@/types/database'

interface SalesCardsProps {
  stats: DashboardStats
}

export default function SalesCards({ stats }: SalesCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return 0
    return Math.round(((current - previous) / previous) * 100)
  }

  // Simple growth calculation (you might want to enhance this with historical data)
  const weeklyGrowth = calculateGrowth(stats.totalSales.thisWeek, stats.totalSales.thisWeek * 0.8)
  const monthlyGrowth = calculateGrowth(stats.totalSales.thisMonth, stats.totalSales.thisMonth * 0.9)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Today's Sales */}
      <Card className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            Today`s Sales
          </CardTitle>
          <div className="bg-green-100 text-green-600 rounded-full p-2">
            <DollarSign size={20} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-800">
            {formatCurrency(stats.totalSales.today)}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Daily revenue
          </p>
        </CardContent>
      </Card>

      {/* Weekly Sales */}
      <Card className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            This Week
          </CardTitle>
          <div className="bg-blue-100 text-blue-600 rounded-full p-2">
            <TrendingUp size={20} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-800">
            {formatCurrency(stats.totalSales.thisWeek)}
          </div>
          <p className={`flex items-center gap-1 text-xs mt-1 ${
            weeklyGrowth >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            <TrendingUp size={12} />
            {weeklyGrowth >= 0 ? '+' : ''}{weeklyGrowth}% vs last week
          </p>
        </CardContent>
      </Card>

      {/* Monthly Sales */}
      <Card className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            This Month
          </CardTitle>
          <div className="bg-purple-100 text-purple-600 rounded-full p-2">
            <Calendar size={20} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-800">
            {formatCurrency(stats.totalSales.thisMonth)}
          </div>
          <p className={`flex items-center gap-1 text-xs mt-1 ${
            monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            <TrendingUp size={12} />
            {monthlyGrowth >= 0 ? '+' : ''}{monthlyGrowth}% vs last month
          </p>
        </CardContent>
      </Card>

      {/* New Clients */}
      <Card className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            New Clients
          </CardTitle>
          <div className="bg-orange-100 text-orange-600 rounded-full p-2">
            <Users size={20} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-800">
            {stats.clientStats.newThisMonth}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            This month
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
