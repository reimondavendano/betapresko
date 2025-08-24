'use client'

import { useDispatch, useSelector } from 'react-redux'
import { setActiveView, type AdminView, logout } from '@/lib/features/admin/adminSlice'
import type { RootState } from '@/lib/store'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Settings,
  CalendarCheck2,
  Blocks,
  Users2,
  Database,
  Power,
  BookAIcon
} from 'lucide-react'

const items: Array<{ key: AdminView; label: string; icon: React.ComponentType<any> }> = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'bookings', label: 'Booking Calendar', icon: CalendarCheck2 },
  { key: 'appointments', label: 'Appointment Details', icon: BookAIcon },
  { key: 'clients', label: 'Client Info', icon: Users2 },
  { key: 'master_data', label: 'Master Data', icon: Database },
  { key: 'custom_settings', label: 'Settings', icon: Settings },
]

export default function AdminSidePanel({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const dispatch = useDispatch()
  const activeView = useSelector((s: RootState) => s.admin.activeView)

  return (
   <aside
      className={`
        fixed inset-y-0 left-0 z-50 w-64 p-4 bg-gradient-to-br from-[#99BCC0] via-[#8FB6BA] to-[#6fa3a9] 
        text-white flex flex-col shadow-xl transform transition-transform duration-300
        pt-6 lg:pt-10
        lg:static lg:translate-x-0
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
      <div className="flex items-center justify-between mb-2 mt-10">
        <img
          src="/assets/images/presko_logo.png"
          alt="Presko Logo"
          className="h-30 w-auto object-contain lg:w-30 md:h-30 xl:h-30"  // 👈 bigger on desktop
        />
        {/* Close button for mobile */}
        <button className="lg:hidden text-white text-xl" onClick={onClose}>
          ✕
        </button>
      </div>
      <nav className="flex-1">
        <ul className="space-y-2">
          {items.map(({ key, label, icon: Icon }) => (
            <li key={key}>
              <button
                onClick={() => {
                  dispatch(setActiveView(key))
                  onClose()
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-colors duration-200 ${
                  activeView === key ? 'bg-white/30 text-white shadow-md' : 'hover:bg-white/20'
                }`}
              >
                <Icon size={20} />
                <span className="text-sm font-medium">{label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto pt-6 border-t border-white/20">
        <Button
          variant="secondary"
          className="w-full bg-white text-orange-600 hover:bg-white/90"
          onClick={() => {
            sessionStorage.removeItem('presko_admin');
            dispatch(logout());
            onClose()
          }}
        >
          <Power className="mr-2 h-4 w-4" /> Log out
        </Button>
      </div>
    </aside>
  )
}



