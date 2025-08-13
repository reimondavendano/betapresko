'use client'

import { useSelector } from 'react-redux'
import type { RootState } from '@/lib/store'
import AdminSidePanel from './AdminSidePanel'
import AdminHeader from './AdminHeader'
import AdminDashboard from '../views/AdminDashboard'
import AdminBookings from '../views/AdminBookings'
import AdminCustomSettings from '../views/AdminCustomSettings'
import AdminBrand from '../views/AdminBrand'
import AdminHP from '../views/AdminHP'
import AdminTypes from '../views/AdminTypes'
import AdminCity from '../views/AdminCity'
import AdminBarangay from '../views/AdminBarangay'
import AdminServices from '../views/AdminServices'
import AdminBlockedDates from '../views/AdminBlockedDates'
import AdminMasterData from '../views/AdminMasterData'
import AdminClientInfo from '../views/AdminClientInfo'

export default function AdminLayout() {
  const view = useSelector((s: RootState) => s.admin.activeView)

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <AdminDashboard />
      case 'bookings':
        return <AdminBookings />
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
    <div className="flex min-h-screen bg-gray-100 font-sans text-gray-900">
      <AdminSidePanel />
      <div className="flex flex-1 flex-col">
        <AdminHeader />
        <main className="flex-1 p-6  bg-gray-50 shadow-inner overflow-hidden">
          {renderView()}
        </main>
      </div>
    </div>
  );
}


