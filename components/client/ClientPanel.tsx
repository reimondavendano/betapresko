'use client';

import { useState } from 'react';
import Image from 'next/image';
import { User, LayoutDashboard, Briefcase, Gift, Menu, X } from 'lucide-react'; // Import Menu and X icons

// Import UI components
import { Button } from '@/components/ui/button'; // Assuming you have a Button component
import { Card, CardContent } from '@/components/ui/card'; // Assuming you have Card components

// Import tab content components
import { ClientDashboardTab } from './ClientDashboardTab';
import { ClientInfoTab } from './ClientInfoTab';
import { BookServiceTab } from './BookServiceTab';
import { ReferFriendTab } from './ReferFriendTab';

// Logo component
const NewLogo = () => <Image src="/assets/images/presko_logo.png" alt="Presko Logo" width={150} height={50} />


interface ClientPanelProps {
  params: {
    id?: string; // Client ID passed from the URL
  };
}

export default function ClientPanel({ params }: ClientPanelProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // New state for mobile menu
  const clientId = params?.id;

  const handleTabClick = (tabName: string) => {
    setActiveTab(tabName);
    setIsMobileMenuOpen(false); // Close menu after selecting a tab
  };

  if (!clientId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-inter text-red-700">
        <p>Error: Client ID is missing. Please provide a valid client ID.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      {/* Header */}
      <header className="shadow-sm" style={{ backgroundColor: '#99BCC0' }}>
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <NewLogo />
            {/* Hamburger menu button for mobile */}
            <div className="lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </Button>
            </div>
            {/* Client ID for larger screens */}
            <span className="hidden lg:block text-sm text-gray-500">Client ID: {clientId.substring(0, 8)}...</span>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)} // Close menu when clicking outside
        ></div>
      )}

      {/* Main Content Area */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation (Conditional for mobile) */}
          <Card className={`fixed lg:relative top-0 left-0 h-full lg:h-auto w-64 lg:w-1/4 rounded-none lg:rounded-xl shadow-lg p-4 bg-white flex-shrink-0 z-50 transform transition-transform duration-300 ease-in-out ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}>
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
                className={`w-full justify-start px-4 py-2 rounded-lg transition-colors duration-200 ${activeTab === 'dashboard' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-gray-100'}`}
              >
                <LayoutDashboard className="w-5 h-5 mr-3" />
                Dashboard
              </Button>
              <Button
                variant={activeTab === 'clientInfo' ? 'default' : 'ghost'}
                onClick={() => handleTabClick('clientInfo')}
                className={`w-full justify-start px-4 py-2 rounded-lg transition-colors duration-200 ${activeTab === 'clientInfo' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-gray-100'}`}
              >
                <User className="w-5 h-5 mr-3" />
                Client Info
              </Button>
              <Button
                variant={activeTab === 'bookService' ? 'default' : 'ghost'}
                onClick={() => handleTabClick('bookService')}
                className={`w-full justify-start px-4 py-2 rounded-lg transition-colors duration-200 ${activeTab === 'bookService' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-gray-100'}`}
              >
                <Briefcase className="w-5 h-5 mr-3" />
                Book A Service
              </Button>
              <Button
                variant={activeTab === 'referFriend' ? 'default' : 'ghost'}
                onClick={() => handleTabClick('referFriend')}
                className={`w-full justify-start px-4 py-2 rounded-lg transition-colors duration-200 ${activeTab === 'referFriend' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-gray-100'}`}
              >
                <Gift className="w-5 h-5 mr-3" />
                Refer A Friend
              </Button>
            </CardContent>
          </Card>

          {/* Tab Content Area */}
          <div className="lg:w-3/4 flex-grow">
            {activeTab === 'dashboard' && <ClientDashboardTab clientId={clientId} onBookNewCleaningClick={() => setActiveTab('bookService')}  />}
            {activeTab === 'clientInfo' && <ClientInfoTab clientId={clientId} />}
            {activeTab === 'bookService' && <BookServiceTab clientId={clientId} />}
            {activeTab === 'referFriend' && <ReferFriendTab clientId={clientId} />}
          </div>
        </div>
      </div>
    </div>
  );
}
