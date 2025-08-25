'use client'

import { useSelector } from 'react-redux'
import { RootState } from '@/lib/store'
import Image from 'next/image'
import { BookingHeader } from '@/components/booking/BookingHeader'
import { LocationStep } from '@/components/booking/LocationStep'
import { ServiceStep } from '@/components/booking/ServiceStep'
import { UnitsStep } from '@/components/booking/UnitsStep'
import { ScheduleStep } from '@/components/booking/ScheduleStep'
import { ConfirmStep } from '@/components/booking/ConfirmStep'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function BookingPage() {
  const currentStep = useSelector((state: RootState) => state.booking.step)
  const router = useRouter();

  useEffect(() => {
    const confirmedClientId = localStorage.getItem("confirmedClientId");
    if (confirmedClientId) {
      //  Prevent access to booking page if already confirmed
      router.replace(`/client/${confirmedClientId}`);
    }
  }, [router]);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <LocationStep />
      case 2:
        return <ServiceStep />
      case 3:
        return <UnitsStep />
      case 4:
        return <ScheduleStep />
      case 5:
        return <ConfirmStep />
      default:
        return <LocationStep />
    }
  }

  return (
    <div className="min-h-screen" >
      {/* Header */}
      <header className="shadow-sm" style={{ backgroundColor: '#99BCC0' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Replaced Logo component with Image component and updated the src */}
            <div className="flex-shrink-0">
              <Image src="/assets/images/presko_logo.png" alt="Presko Logo" width={180} height={120} />
            </div>
           <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <div className="text-sm font-medium text-white bg-teal-600 px-3 py-1 rounded-lg shadow-md animate-pulse">
                📞 Need help? Call us: <span className="font-bold">0921-561-1220</span>
              </div>
              <a
                href="https://web.facebook.com/preskoac"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-lg transition-transform transform hover:scale-105"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 36 36"
                  className="w-5 h-5 fill-current"
                >
                  <path d="M18 0C8.06 0 0 7.52 0 16.8c0 5.3 2.7 10.04 6.9 13.16V36l6.3-3.44c1.5.42 3.1.64 4.8.64 9.94 0 18-7.52 18-16.8S27.94 0 18 0zm.9 22.6l-4.8-5.1-9 5.1 9.9-10.6 4.8 5.1 9-5.1-9.9 10.6z" />
                </svg>
                Message us
              </a>
            </div>

          </div>
        </div>
      </header>

      {/* Booking Progress */}
      <BookingHeader />

      {/* Step Content */}
      <main>
        {renderStep()}
      </main>
    </div>
  )
}