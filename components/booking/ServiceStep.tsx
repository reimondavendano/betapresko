'use client'

import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '@/lib/store' // Use type-only import for RootState
import { setSelectedService, setStep } from '@/lib/features/booking/bookingSlice'
import { servicesApi } from '../../pages/api/service/servicesApi' // Adjust path to your actual API file
import { Service } from '../../types/database' // Import Service type
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Wrench, Sparkles, Settings, ChevronRight, ChevronLeft, Loader2, AlertCircle } from 'lucide-react'

// Map service names to Lucide icons (adjust as needed for your actual service names)
const serviceIcons: Record<string, React.ElementType> = {
  'Cleaning': Sparkles,
  'Repair': Wrench,
  'Maintenance': Settings,
  // Add more mappings if you have other service names in your DB
};

export function ServiceStep() {
  const dispatch = useDispatch();
  const { selectedService } = useSelector((state: RootState) => state.booking);

  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch services on component mount
  useEffect(() => {
    const fetchServices = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedServices = await servicesApi.getServices();
        setServices(fetchedServices);
        // If a service was previously selected in Redux, ensure it's still valid
        if (selectedService && !fetchedServices.some(s => s.id === selectedService.id)) {
          dispatch(setSelectedService(null)); // Clear if previously selected service is not found
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load services.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchServices();
  }, [dispatch, selectedService]); // Add selectedService to dependencies

  const handleServiceSelect = (service: Service) => {
    dispatch(setSelectedService(service));
  };

  const handleNext = () => {
    if (selectedService) {
      dispatch(setStep(3)); // Proceed to the next step (e.g., Units selection)
    }
  };

  const handleBack = () => {
    dispatch(setStep(1)); // Go back to Location selection
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center flex flex-col items-center justify-center min-h-[400px] font-inter">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-gray-600 text-lg">Loading services...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center flex flex-col items-center justify-center min-h-[400px] font-inter">
        <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
        <p className="text-red-700 text-lg mb-2">Error loading services:</p>
        <p className="text-red-600 text-sm">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4 bg-blue-600 hover:bg-blue-700">
          Retry
        </Button>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center flex flex-col items-center justify-center min-h-[400px] font-inter">
        <AlertCircle className="w-10 h-10 text-orange-500 mb-4" />
        <p className="text-orange-700 text-lg">No active services available at the moment.</p>
        <p className="text-orange-600 text-sm">Please check back later or contact support.</p>
      </div>
    );
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
            const IconComponent = serviceIcons[service.name] || Settings; // Fallback icon
            return (
              <Card
                key={service.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg rounded-xl ${
                  selectedService?.id === service.id
                    ? 'ring-2 ring-blue-500 shadow-lg'
                    : 'hover:shadow-md'
                }`}
                onClick={() => handleServiceSelect(service)}
              >
                <CardHeader className="text-center">
                  <div className="relative">
                    {/* Assuming 'popular' is a property you might add to your Service type or determine dynamically */}
                    {/* For now, no 'popular' badge as it's not in your DB schema */}
                    <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                      selectedService?.id === service.id
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      <IconComponent className="w-8 h-8" />
                    </div>
                    <CardTitle className="text-lg md:text-xl mb-2">{service.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm mb-4">{service.description || 'No description available.'}</p>
                  {/* Features are not in your DB schema for 'services' table.
                      If you need features, you'd need a separate table (e.g., service_features)
                      or store them as JSONB in the 'description' field if simple.
                      For now, removing mock features display.
                  */}
                  {service.base_price > 0 && (
                    <div className="text-sm text-gray-700 font-medium mt-2">
                      Starting from: ₱{service.base_price.toLocaleString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-between items-center gap-2">
          <Button
            onClick={handleBack}
            variant="outline"
            className="px-4 py-2 md:px-6 md:py-3 text-sm md:text-base"
          >
            <ChevronLeft className="w-4 h-4 mr-1 md:mr-2" />
            Back to Location
            
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={!selectedService}
            className="px-4 py-2 md:px-8 md:py-3 bg-blue-600 hover:bg-blue-700 text-sm md:text-base"
          >
            Continue to Units
            
            <ChevronRight className="w-4 h-4 ml-1 md:ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
