'use client'

import { useSelector } from 'react-redux'
import { RootState } from '@/lib/store'
import { 
  CheckCircle, 
  MapPin,      // Icon for Location
  Wrench,      // Icon for Service
  Settings,    // Icon for Units (like AC settings)
  Calendar,    // Icon for Schedule
  CheckSquare  // Icon for Confirm (like a checklist)
} from 'lucide-react'

const steps = [
  { id: 1, title: 'Location', description: 'Select your area', icon: MapPin },
  { id: 2, title: 'Service', description: 'Choose service type', icon: Wrench },
  { id: 3, title: 'Units', description: 'Select AC units', icon: Settings },
  { id: 4, title: 'Schedule', description: 'Pick date & time', icon: Calendar },
  { id: 5, title: 'Confirm', description: 'Review & book', icon: CheckSquare },
]

export function BookingHeader() {
  const currentStep = useSelector((state: RootState) => state.booking.step)

  return (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-5xl mx-auto px-4 py-4 sm:py-6"> {/* Adjusted vertical padding for mobile */}
        <div className="flex flex-wrap justify-center sm:justify-between items-center gap-y-4 sm:gap-y-0"> {/* Added flex-wrap and adjusted justify/gap-y */}
          {steps.map((step, index) => {
            const IconComponent = step.icon; // Get the icon component for the current step
            return (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 ${ /* Adjusted size for mobile */
                    currentStep > step.id 
                      ? 'bg-green-500 border-green-500 text-white shadow-md' 
                      : currentStep === step.id
                      ? 'bg-gradient-to-r from-[#B7DEE1] via-[#A9CDD0] to-[#99BCC0] hover:opacity-90 text-white shadow-md'
                      : 'bg-gray-100 border-gray-300 text-gray-400 shadow-md'
                  }`}>
                    {currentStep > step.id ? (
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" /> 
                    ) : (
                      <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p className={`text-xs sm:text-sm font-medium ${ /* Adjusted font size for mobile */
                      currentStep >= step.id ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      {step.title}
                    </p>
                    {/* Hide description on very small screens, show on sm and up */}
                    <p className="hidden sm:block text-xs text-gray-500">{step.description}</p> 
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-6 sm:w-16 h-0.5 mx-2 sm:mx-4 ${ /* Adjusted line width and margin for mobile */
                    currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  )
}
