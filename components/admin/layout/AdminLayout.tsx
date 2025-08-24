'use client'

import { useState } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '@/lib/store'
import AdminSidePanel from './AdminSidePanel'
import AdminHeader from './AdminHeader'
import AdminDashboard from '../views/AdminDashboard'
import AdminBookings from '../views/AdminBookings'
import AdminCustomSettings from '../views/AdminCustomSettings'
import AdminMasterData from '../views/AdminMasterData'
import AdminClientInfo from '../views/AdminClientInfo'
import AdminAppointments from '../views/AdminAppointments'

export default function AdminLayout() {
  const view = useSelector((s: RootState) => s.admin.activeView)
  const [isSideOpen, setIsSideOpen] = useState(false)

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <AdminDashboard />
      case 'bookings':
        return <AdminBookings />
      case 'appointments':
        return <AdminAppointments />
      case 'clients':
        return <AdminClientInfo />
      case 'master_data':
        return <AdminMasterData />
      case 'custom_settings':
        return <AdminCustomSettings />
      default:
        return <AdminDashboard />
    }
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-900">
      {/* Mobile overlay */}
      {isSideOpen && (
        <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsSideOpen(false)}
          />
        )}

        <AdminSidePanel isOpen={isSideOpen} onClose={() => setIsSideOpen(false)} />

        <div className="flex flex-1 flex-col min-w-0">
          <AdminHeader onMenuClick={() => setIsSideOpen(true)} />
          <main className="flex-1 p-6 bg-gray-50 shadow-inner overflow-auto">
            {renderView()}
          </main>
        </div>
    </div>
  )
}
