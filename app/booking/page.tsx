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
            <div className="text-sm text-gray-500">
              {/* Need help? Call (02) 123-4567 */}
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