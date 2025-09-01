'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { User, LayoutDashboard, Briefcase, Gift, Menu, X, Home, Bell, LogOut } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

import { ClientDashboardTab } from './ClientDashboardTab'
import { ClientInfoTab } from './ClientInfoTab'
import { BookServiceTab } from './BookServiceTab'
import { ReferFriendTab } from './ReferFriendTab'
import {
AlertDialog,
AlertDialogAction,
AlertDialogCancel,
AlertDialogContent,
AlertDialogDescription,
AlertDialogFooter,
AlertDialogHeader,
AlertDialogTitle,
AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ClientInvoice } from './ClientInvoice'
import { useRealtime } from '@/app/RealtimeContext'
// import { ClientAddLocationTab } from '../../components/client/ClientAddLocation'

const NewLogo = () => <Image src="/assets/images/presko_logo.png" alt="Presko Logo" width={200} height={100} />

interface ClientPanelProps {
  params: {
    id?: string
  }
}

export default function ClientPanel({ params }: ClientPanelProps) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [clientName, setClientName] = useState('')
  const [notifications, setNotifications] = useState<any[]>([])
  const [isNotifOpen, setIsNotifOpen] = useState(false)

  
    const { refreshKey } = useRealtime();

  const clientId = params?.id

  const handleTabClick = (tabName: string) => {
    console.log("Switching ClientPanel tab to:", tabName);
    setActiveTab(tabName)
    setIsMobileMenuOpen(false)
  }

  useEffect(() => {
    const fetchClientName = async () => {
      if (!clientId) return
      try {
        const response = await fetch(`/api/clients/${clientId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.name) {
            setClientName(data.name)
            return
          }
        }
        const searchResponse = await fetch(`/api/admin/client?search=${clientId}&page=1&pageSize=1`)
        if (searchResponse.ok) {
          const searchData = await searchResponse.json()
          if (searchData.data && searchData.data.length > 0) {
            setClientName(searchData.data[0].name)
          }
        }
      } catch (error) {
        console.error('Error fetching client name:', error)
        setClientName('Unknown Client')
      }
    }
    fetchClientName()
  }, [clientId, refreshKey])

  const fetchNotifications = async () => {
    if (!clientId) return
    try {
      const res = await fetch(`/api/clients/notification-by-id?clientId=${clientId}`)
      const json = await res.json()
      setNotifications(json.data || [])
    } catch (err) {
      console.error('Failed to fetch client notifications', err)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [clientId, refreshKey])

  if (!clientId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-inter text-red-700">
        <p>Error: Client ID is missing. Please provide a valid client ID.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 font-inter overflow-x-hidden">
      {/* Header */}
    <header className="shadow-sm" style={{ backgroundColor: '#99BCC0' }}>
      <div className="max-w-screen-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <NewLogo />

          {/* --- Desktop Right Section --- */}
          <div className="hidden lg:flex items-center gap-4 text-sm text-gray-500 relative">
            {/* Help Buttons (desktop only) */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-teal-600 text-white text-sm font-semibold px-3 py-1 rounded-full shadow-md">
                📞 Call us: <span className="font-bold">0921-561-1220</span>
              </div>
              <a
                href="https://web.facebook.com/preskoac"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-lg transition-transform transform hover:scale-105"
              >
                💬 Message us
              </a>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button onClick={() => setIsNotifOpen(!isNotifOpen)}>
                <Bell className="w-6 h-6 text-blue-500 cursor-pointer" />

                {/* 🔔 Only count "is_new" notifications */}
                {notifications.filter((n) => n.is_new).length > 0 && (
                  <span className="absolute top-0 right-0 min-h-[16px] min-w-[16px] px-1 text-xs rounded-full bg-red-500 text-white border border-white flex items-center justify-center">
                    {notifications.filter((n) => n.is_new).length}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-72 max-w-[90vw] bg-white rounded-lg shadow-lg border z-50">
                  <div className="p-3 border-b font-semibold">Notifications</div>
                  <ul className="max-h-64 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((n, idx) => (
                        <li
                          key={idx}
                          onClick={async () => {
                            try {
                              // Call backend to update is_new = false
                              await fetch(`/api/mark-notification-seen`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ notificationId: n.id }),
                              });
                            } catch (err) {
                              console.error("Failed to mark notification as seen", err);
                            }

                            // Update state immediately
                            setNotifications((prev) =>
                              prev.map((notif) =>
                                notif.id === n.id ? { ...notif, is_new: false } : notif
                              )
                            );
                          }}
                          className={`px-3 py-2 hover:opacity-90 border-b last:border-b-0 cursor-pointer ${
                            n.is_new ? "bg-white font-semibold" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          <div className="text-sm">{n.display_message || "New notification"}</div>
                          <div className="text-xs text-gray-500">
                            {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
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


            {/* Client Name */}
            <span>Client: {clientName || 'Loading...'}</span>
          </div>

          {/* --- Mobile Right Section --- */}
          <div className="flex items-center gap-2 lg:hidden">
            {/* Call + Msg (mobile only) */}
            <div className="flex items-center gap-2 z-50 relative">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="flex items-center gap-1 bg-teal-600 text-white text-xs font-medium px-2 py-1 rounded-md shadow"
                  >
                    📞 Call
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto px-3 py-2 text-sm text-gray-800">
                  <p>📞 0921-561-1220</p>
                </PopoverContent>
              </Popover>
              <a
                href="https://web.facebook.com/preskoac"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-2 py-1 rounded-md shadow"
              >
                💬 Msg
              </a>
            </div>

            {/* Hamburger Menu */}
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>
      </div>
    </header>


      {/* Main Content Area */}
      <div className="max-w-screen-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <Card
            className={`fixed lg:relative top-0 left-0 h-full lg:h-auto w-60 max-w-[80%] lg:w-1/4 rounded-none lg:rounded-xl shadow-lg p-4 bg-white flex-shrink-0 z-50 transform transition-transform duration-300 ease-in-out ${
              isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            }`}
          >
            <CardContent className="p-0 space-y-2">
              <div className="flex justify-between items-center mb-4 lg:hidden">
                <NewLogo />
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="w-6 h-6" />
                </Button>
              </div>
              <Button
                variant={activeTab === 'dashboard' ? 'default' : 'ghost'}
                onClick={() => handleTabClick('dashboard')}
                className={`w-full justify-start px-4 py-2 rounded-lg transition-colors duration-200 ${
                  activeTab === 'dashboard'
                    ? 'bg-gradient-to-r from-[#B7DEE1] via-[#A9CDD0] to-[#99BCC0] text-white shadow-md'
                    : 'hover:opacity-90'
                }`}
              >
                <LayoutDashboard className="w-5 h-5 mr-3" />
                Dashboard
              </Button>
              <Button
                variant={activeTab === 'clientInfo' ? 'default' : 'ghost'}
                onClick={() => handleTabClick('clientInfo')}
                className={`w-full justify-start px-4 py-2 rounded-lg transition-colors duration-200 ${
                  activeTab === 'clientInfo'
                    ? 'bg-gradient-to-r from-[#B7DEE1] via-[#A9CDD0] to-[#99BCC0] text-white shadow-md'
                    : 'hover:opacity-90'
                }`}
              >
                <User className="w-5 h-5 mr-3" />
                Client Info
              </Button>
              {/* <Button
                variant={activeTab === 'clientAddLocation' ? 'default' : 'ghost'}
                onClick={() => handleTabClick('clientAddLocation')}
                className={`w-full justify-start px-4 py-2 rounded-lg transition-colors duration-200 ${
                  activeTab === 'clientAddLocation'
                    ? 'bg-gradient-to-r from-[#B7DEE1] via-[#A9CDD0] to-[#99BCC0] text-white shadow-md'
                    : 'hover:opacity-90'
                }`}
              >
                <Home className="w-5 h-5 mr-3" />
                Add Location
              </Button>
              <Button
                variant={activeTab === 'bookService' ? 'default' : 'ghost'}
                onClick={() => handleTabClick('bookService')}
                className={`w-full justify-start px-4 py-2 rounded-lg transition-colors duration-200 ${
                  activeTab === 'bookService'
                    ? 'bg-gradient-to-r from-[#B7DEE1] via-[#A9CDD0] to-[#99BCC0] text-white shadow-md'
                    : 'hover:opacity-90'
                }`}
              >
                <Briefcase className="w-5 h-5 mr-3" />
                Book Another Service
              </Button> */}
              <Button
                variant={activeTab === 'invoices' ? 'default' : 'ghost'}
                onClick={() => handleTabClick('invoices')}
                className={`w-full justify-start px-4 py-2 rounded-lg transition-colors duration-200 ${
                  activeTab === 'invoices'
                    ? 'bg-gradient-to-r from-[#B7DEE1] via-[#A9CDD0] to-[#99BCC0] text-white shadow-md'
                    : 'hover:opacity-90'
                }`}
              >
                <Briefcase className="w-5 h-5 mr-3" />
                Invoices
              </Button>

              {/* <Button
                variant={activeTab === 'referFriend' ? 'default' : 'ghost'}
                onClick={() => handleTabClick('referFriend')}
                className={`w-full justify-start px-4 py-2 rounded-lg transition-colors duration-200 ${
                  activeTab === 'referFriend'
                    ? 'bg-gradient-to-r from-[#B7DEE1] via-[#A9CDD0] to-[#99BCC0] text-white shadow-md'
                    : 'hover:opacity-90'
                }`}
              >
                <Gift className="w-5 h-5 mr-3" />
                Refer A Friend
              </Button> */}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors duration-200"
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Logout
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove your saved client session and redirect you to the booking page.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      localStorage.removeItem("confirmedClientId");
                      window.location.href = "/booking"; // pre-booking route
                    }}
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    Logout
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            </CardContent>
          </Card>

          {/* Tab Content Area */}
          <div className="lg:w-3/4 flex-grow">
            {activeTab === 'dashboard' && (
              <ClientDashboardTab
                clientId={clientId}
                onBookNewCleaningClick={() => handleTabClick('bookService')}
                onReferClick={() => handleTabClick('clientInfo')}
                onViewProfile={() => handleTabClick("clientInfo")}
              />
            )}
            {activeTab === 'clientInfo' && <ClientInfoTab clientId={clientId} />}
            {/* {activeTab === 'clientAddLocation' && <ClientAddLocationTab clientId={clientId} />}
            {activeTab === 'bookService' && <BookServiceTab clientId={clientId} />} */}
            {activeTab === 'invoices' && <ClientInvoice clientId={clientId} />}
            {/* {activeTab === 'referFriend' && <ReferFriendTab clientId={clientId} />} */}
          </div>
        </div>
      </div>
    </div>
  )
}
