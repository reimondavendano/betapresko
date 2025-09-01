"use client"

import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '@/lib/store'
import { setAuthenticated, setCurrentAdmin } from '@/lib/features/admin/adminSlice'
import AdminLogin from '@/components/admin/AdminLogin'
import AdminLayout from '@/components/admin/layout/AdminLayout'
import { RealtimeProvider } from "@/app/RealtimeContext"
import Notifications from "@/components/Notifications"   // 👈 import it

export default function AdminPage() {
  const dispatch = useDispatch()
  const isAuthenticated = useSelector((s: RootState) => s.admin.isAuthenticated)
  const currentAdmin = useSelector((s: RootState) => s.admin.currentAdmin) // 👈 get admin details
  const [hydrating, setHydrating] = useState(true)


  useEffect(() => {
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem('presko_admin') : null
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed?.id) {
          dispatch(setCurrentAdmin(parsed))
          dispatch(setAuthenticated(true))
          // Refresh profile if name/address are missing
          if (!parsed.name || !parsed.address) {
            fetch(`/api/admin/me?id=${encodeURIComponent(parsed.id)}`)
              .then((r) => r.json())
              .then((fresh) => {
                if (fresh && fresh.id) {
                  localStorage.setItem('presko_admin', JSON.stringify(fresh))
                  dispatch(setCurrentAdmin(fresh))
                }
              })
              .catch(() => {})
          }
        }
      } catch {}
    }
    setHydrating(false)
  }, [dispatch])

  if (hydrating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#99BCC0] via-[#8FB6BA] to-[#6fa3a9]">
        <div className="text-white/90 text-sm">Loading…</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <AdminLogin />
  }

  return (
    <RealtimeProvider>
      {/* 👇 Register admin push subscription globally */}
      {currentAdmin?.id && <Notifications admin_id={currentAdmin.id} />}
      <AdminLayout />
    </RealtimeProvider>
  )
}
