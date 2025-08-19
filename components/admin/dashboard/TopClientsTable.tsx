'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Trophy, Phone } from 'lucide-react'
import { TopClient } from '@/types/database'

interface TopClientsTableProps {
  clients: TopClient[]
}

export default function TopClientsTable({ clients }: TopClientsTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return '🥇'
      case 1:
        return '🥈'
      case 2:
        return '🥉'
      default:
        return `${index + 1}.`
    }
  }

  const getRankColor = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-yellow-50 border-yellow-200'
      case 1:
        return 'bg-gray-50 border-gray-200'
      case 2:
        return 'bg-orange-50 border-orange-200'
      default:
        return 'bg-white border-gray-100'
    }
  }

  return (
    <Card className="bg-white rounded-2xl shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Trophy size={20} />
          Top Clients by Spend
        </CardTitle>
        <p className="text-sm text-gray-500">Highest value customers based on total completed appointments</p>
      </CardHeader>
      <CardContent>
        {clients.length > 0 ? (
          <div className="space-y-3">
            {clients.map((client, index) => (
              <div
                key={client.id}
                className={`p-4 rounded-lg border transition-colors hover:shadow-md ${getRankColor(index)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Rank */}
                    <div className="flex items-center justify-center w-8 h-8 bg-white rounded-full shadow-sm font-bold text-gray-700">
                      {getRankIcon(index)}
                    </div>

                    {/* Client Info */}
                    <div className="space-y-1">
                      <div className="font-semibold text-gray-800">
                        {client.name}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Phone size={12} />
                        <span>{client.mobile}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    {/* Total Spend */}
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(client.totalSpend)}
                    </div>
                    
                    {/* Appointment Count */}
                    <div className="text-sm text-gray-500">
                      {client.appointmentCount} appointment{client.appointmentCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Average per appointment */}
                <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center text-sm">
                  <span className="text-gray-600">Average per appointment</span>
                  <span className="font-medium text-gray-800">
                    {formatCurrency(client.totalSpend / client.appointmentCount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Users size={48} className="mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Client Data</h3>
            <p className="text-sm">No completed appointments to analyze client spending</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
