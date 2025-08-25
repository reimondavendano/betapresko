'use client'

import { useDispatch, useSelector } from 'react-redux'
import { setNotifications, setNewNotificationsCount } from '@/lib/features/admin/adminSlice'
import type { RootState } from '@/lib/store'
import { Bell, Menu } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function AdminHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const dispatch = useDispatch()
  const admin = useSelector((s: RootState) => s.admin.currentAdmin)
  const activeView = useSelector((s: RootState) => s.admin.activeView)
  const notifications = useSelector((s: RootState) => s.admin.notifications)
  const newNotificationsCount = useSelector((s: RootState) => s.admin.newNotificationsCount)

  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const fetchInitialNotifications = async () => {
      try {
        const res = await fetch('/api/admin/notifications')
        const json = await res.json()
        dispatch(setNotifications(json.data || []))
        dispatch(setNewNotificationsCount(json.data?.length || 0))
      } catch (err) {
        console.error('Failed to fetch initial notifications', err)
      }
    }
    fetchInitialNotifications()
  }, [dispatch])

  const viewLabelMap: Record<string, string> = {
    dashboard: 'Dashboard',
    bookings: 'Booking Calendar',
    appointments: 'Appointment Details',
    clients: 'Client Info',
    master_data: 'Master Data',
    custom_settings: 'Custom Settings',
  }
  const headerTitle = viewLabelMap[activeView] || 'Dashboard'

  return (
    <header className="h-16 flex items-center justify-between p-4 bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">

      <div className="flex items-center gap-3">
        {/* Hamburger only on mobile */}
        <button className="lg:hidden p-2 rounded-md hover:bg-gray-200" onClick={onMenuClick}>
          <Menu className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="text-xl font-bold text-gray-800">{headerTitle}</h1>
      </div>

      <div className="flex items-center">
        <div className="relative">
          <button
            className="p-2 rounded-full hover:bg-gray-200 transition-colors duration-200"
            onClick={() => setIsOpen(!isOpen)}
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {newNotificationsCount > 0 && (
              <span className="absolute top-0 right-0 min-h-[16px] min-w-[16px] px-1 text-xs rounded-full bg-red-500 text-white border border-white flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </button>
          {isOpen && (
            <div
              className="
                absolute mt-2 w-80 max-w-[90vw] bg-white rounded-lg shadow-lg border z-50
                right-0 md:right-0
                left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0
              "
            >
              <ul className="divide-y divide-gray-200 max-h-[60vh] overflow-y-auto">
                <li className="px-3 py-2 text-sm font-semibold text-gray-800">
                  Notifications
                </li>
                {notifications.length > 0 ? (
                  notifications.map((n: any) => (
                    <li
                      key={n.id}
                      className="px-3 py-4 hover:bg-gray-100 cursor-pointer transition-colors duration-200"
                    >
                      <div className="text-sm text-gray-800">
                        {n.display_message || 'New notification'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="px-3 py-4 text-sm text-gray-500 text-center">
                    No notifications
                  </li>
                )}
              </ul>
            </div>
          )}


        </div>

        <div className="flex items-center gap-2 ml-4 cursor-pointer max-w-xs">
          <img
            src="https://placehold.co/100x100/orange/white?text=A"
            alt="User Avatar"
            className="w-9 h-9 rounded-full ring-2 ring-orange-400"
          />
          <div className="flex flex-col leading-tight">
            <span
              className="text-sm font-medium text-gray-800 truncate"
              title={admin?.name || admin?.username || 'Admin'}
            >
              {admin?.name || admin?.username || 'Admin'}
            </span>
            <span
              className="text-xs text-gray-500 truncate"
              title={admin?.address || ''}
            >
              {admin?.address || ''}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
