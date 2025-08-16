'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { User, LayoutDashboard, Briefcase, Gift, Menu, X, Home, Bell } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

import { ClientDashboardTab } from './ClientDashboardTab'
import { ClientInfoTab } from './ClientInfoTab'
import { BookServiceTab } from './BookServiceTab'
import { ReferFriendTab } from './ReferFriendTab'
// import { ClientAddLocationTab } from '../../components/client/ClientAddLocation'

const NewLogo = () => <Image src="/assets/images/presko_logo.png" alt="Presko Logo" width={150} height={50} />

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

  const clientId = params?.id

  const handleTabClick = (tabName: string) => {
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
  }, [clientId])

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
  }, [clientId])

  if (!clientId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-inter text-red-700">
        <p>Error: Client ID is missing. Please provide a valid client ID.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      {/* Header */}
      <header className="shadow-sm" style={{ backgroundColor: '#99BCC0' }}>
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <NewLogo />
            <div className="lg:hidden">
              <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </Button>
            </div>
            <div className="hidden lg:flex items-center gap-4 text-sm text-gray-500 relative">
              <div className="relative">
                <button onClick={() => setIsNotifOpen(!isNotifOpen)}>
                  <Bell className="w-6 h-6 text-blue-500 cursor-pointer" />
                  {notifications.length > 0 && (
                    <span className="absolute top-0 right-0 min-h-[16px] min-w-[16px] px-1 text-xs rounded-full bg-red-500 text-white border border-white flex items-center justify-center">
                      {notifications.length}
                    </span>
                  )}
                </button>
                {isNotifOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
                    <div className="p-3 border-b font-semibold">Notifications</div>
                    <ul className="max-h-64 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((n, idx) => (
                          <li
                            key={idx}
                            className="px-3 py-2 hover:bg-gray-100 border-b last:border-b-0"
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
              <span>Client: {clientName || 'Loading...'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Main Content Area */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <Card
            className={`fixed lg:relative top-0 left-0 h-full lg:h-auto w-64 lg:w-1/4 rounded-none lg:rounded-xl shadow-lg p-4 bg-white flex-shrink-0 z-50 transform transition-transform duration-300 ease-in-out ${
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
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'hover:bg-gray-100'
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
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'hover:bg-gray-100'
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
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'hover:bg-gray-100'
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
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'hover:bg-gray-100'
                }`}
              >
                <Briefcase className="w-5 h-5 mr-3" />
                Book Another Service
              </Button> */}
              <Button
                variant={activeTab === 'referFriend' ? 'default' : 'ghost'}
                onClick={() => handleTabClick('referFriend')}
                className={`w-full justify-start px-4 py-2 rounded-lg transition-colors duration-200 ${
                  activeTab === 'referFriend'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'hover:bg-gray-100'
                }`}
              >
                <Gift className="w-5 h-5 mr-3" />
                Refer A Friend
              </Button>
            </CardContent>
          </Card>

          {/* Tab Content Area */}
          <div className="lg:w-3/4 flex-grow">
            {activeTab === 'dashboard' && (
              <ClientDashboardTab
                clientId={clientId}
                onBookNewCleaningClick={() => handleTabClick('bookService')}
                onReferClick={() => handleTabClick('referFriend')}
              />
            )}
            {activeTab === 'clientInfo' && <ClientInfoTab clientId={clientId} />}
            {/* {activeTab === 'clientAddLocation' && <ClientAddLocationTab clientId={clientId} />}
            {activeTab === 'bookService' && <BookServiceTab clientId={clientId} />} */}
            {activeTab === 'referFriend' && <ReferFriendTab clientId={clientId} />}
          </div>
        </div>
      </div>
    </div>
  )
}
