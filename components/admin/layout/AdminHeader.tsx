'use client'

import { useSelector } from 'react-redux'
import type { RootState } from '@/lib/store'
import { Bell, Globe, Search } from 'lucide-react'

export default function AdminHeader() {
  const admin = useSelector((s: RootState) => s.admin.currentAdmin)
  const activeView = useSelector((s: RootState) => s.admin.activeView)

  const viewLabelMap: Record<string, string> = {
    dashboard: 'Dashboard',
    bookings: 'Bookings',
    clients: 'Client Info',
    master_data: 'Master Data',
    custom_settings: 'Custom Settings',
  }
  const headerTitle = viewLabelMap[activeView] || 'Dashboard'

  return (
    <header className="h-16 flex items-center justify-between p-4 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="flex-1 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">{headerTitle}</h1>
      </div>
      <div className="relative mx-8 w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search..."
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
      </div>
      <div className="flex items-center gap-4 text-gray-500">
        <Globe size={24} className="hover:text-orange-500 cursor-pointer" />
        <div className="relative">
          <Bell size={24} className="hover:text-orange-500 cursor-pointer" />
          <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500 border border-white"></span>
        </div>
        <div className="flex items-center gap-2 ml-4 cursor-pointer max-w-xs">
          <img src="../assets/images/icon.jpg" alt="User Avatar" className="w-9 h-9 rounded-full ring-2 ring-orange-400" />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium text-gray-800 truncate" title={admin?.name || admin?.username || 'Admin'}>
              {admin?.name || admin?.username || 'Admin'}
            </span>
            <span className="text-xs text-gray-500 truncate" title={admin?.address || ''}>
              {admin?.address || ''}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}


