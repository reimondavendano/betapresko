'use client'

import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '@/lib/store'
import { setSelectedService, setStep } from '@/lib/features/booking/bookingSlice'
import { servicesApi } from '../../pages/api/service/servicesApi'
import { customSettingsApi } from '../../pages/api/custom_settings/customSettingsApi'
import { Service } from '../../types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Wrench, Sparkles, Settings, ChevronRight, ChevronLeft, Loader2, AlertCircle, Lock } from 'lucide-react'

// Map service names to Lucide icons
const serviceIcons: Record<string, React.ElementType> = {
  Cleaning: Sparkles,
  Repair: Wrench,
  Maintenance: Settings,
}

export function ServiceStep() {
  const dispatch = useDispatch()
  const { selectedService } = useSelector((state: RootState) => state.booking)

  const [services, setServices] = useState<Service[]>([])
  const [inactiveLabel, setInactiveLabel] = useState<string>('Unavailable')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch services + custom settings
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [fetchedServices, setting] = await Promise.all([
          servicesApi.getServices(),
          customSettingsApi.getSetting('service_inactive'),
        ])

        // Show only active services
        setServices(fetchedServices.filter((s) => s.is_active))

        // Dynamic label (fallback if missing)
        if (setting?.setting_value) {
          setInactiveLabel(setting.setting_value)
        }

        // Clear invalid selected service
        if (selectedService && !fetchedServices.some((s) => s.id === selectedService.id)) {
          dispatch(setSelectedService(null))
        }

        // Auto select Cleaning if none selected
        if (!selectedService && fetchedServices.length > 0) {
          const cleaning =
            fetchedServices.find((s) => s.name?.toLowerCase().includes('clean')) || fetchedServices[0]
          if (cleaning) dispatch(setSelectedService(cleaning))
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load services.')
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [dispatch, selectedService])

  const handleServiceSelect = (service: Service) => {
    if (service.set_inactive) return // 🚫 block selecting inactive
    dispatch(setSelectedService(service))
  }

  const handleNext = () => {
    if (selectedService) {
      dispatch(setStep(3))
    }
  }

  const handleBack = () => {
    dispatch(setStep(1))
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center flex flex-col items-center justify-center min-h-[400px] font-inter">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-gray-600 text-lg">Loading services...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center flex flex-col items-center justify-center min-h-[400px] font-inter">
        <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
        <p className="text-red-700 text-lg mb-2">Error loading services:</p>
        <p className="text-red-600 text-sm">{error}</p>
        <Button onClick={() => window.location.reload()} className="rounded-lg w-full sm:w-auto border-teal-400 text-teal-600 bg-white hover:bg-white shadow-md0">
          Retry
        </Button>
      </div>
    )
  }

  if (services.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center flex flex-col items-center justify-center min-h-[400px] font-inter">
        <AlertCircle className="w-10 h-10 text-orange-500 mb-4" />
        <p className="text-orange-700 text-lg">No active services available at the moment.</p>
        <p className="text-orange-600 text-sm">Please check back later or contact support.</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto font-inter">
        <div className="text-center mb-4 md:mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Choose Your Service</h2>
          <p className="text-sm md:text-lg text-gray-600">Select the type of service you need for your aircon</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 md:gap-6 mb-8">
          {services.map((service) => {
            const IconComponent = serviceIcons[service.name] || Settings
            const isInactive = service.set_inactive

            return (
              <Card
                key={service.id}
                className={`transition-all duration-200 rounded-xl ${
                  isInactive
                    ? 'opacity-50 cursor-not-allowed pointer-events-none'
                    : 'cursor-pointer hover:shadow-lg'
                } ${selectedService?.id === service.id ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}
                onClick={() => handleServiceSelect(service)}
              >
                <CardHeader className="text-center">
                  <div className="relative">
                    <div
                      className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                        selectedService?.id === service.id
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {isInactive ? <Lock className="w-8 h-8" /> : <IconComponent className="w-8 h-8" />}
                    </div>
                    <CardTitle className="text-lg md:text-xl mb-2">{service.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm mb-4">
                    {service.description || 'No description available.'}
                  </p>
                  {service.base_price > 0 && (
                    <div className="text-sm text-gray-700 font-medium mt-2">
                      Starting from: ₱{service.base_price.toLocaleString()}
                    </div>
                  )}
                  {isInactive && (
                    <div className="text-xs font-medium text-red-500 mt-2 text-center">{inactiveLabel}</div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="flex justify-between items-center gap-2">
          <Button
            onClick={handleBack}
            variant="outline"
            className="rounded-lg w-full sm:w-auto bg-gray-to-r border-teal-400 text-teal-600 bg-white hover:bg-white shadow-md"
          >
            <ChevronLeft className="w-4 h-4 mr-1 md:mr-2" />
            Back to Location
          </Button>
          <Button
            onClick={handleNext}
            disabled={!selectedService}
            variant="outline"
            className="px-4 py-2 md:px-8 rounded-lg w-full sm:w-auto border-teal-400 text-teal-600 bg-white hover:bg-white shadow-md"
          >
            Continue to Units
            <ChevronRight className="w-4 h-4 ml-1 md:ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
