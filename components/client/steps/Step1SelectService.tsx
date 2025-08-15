// components/client/Step1SelectService.tsx
'use client';

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import { setSelectedBookingService } from '@/lib/features/client/clientSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { Service } from '@/types/database';

import { Wrench, Zap, Snowflake, Settings } from 'lucide-react'; 

interface Step1SelectServiceProps {
  onNext: () => void;
}

export function Step1SelectService({ onNext }: Step1SelectServiceProps) {
  const dispatch = useDispatch();
  const { availableServices, selectedService } = useSelector((state: RootState) => state.client.booking);

  const handleServiceSelect = (service: Service) => {
    dispatch(setSelectedBookingService(service));
  };

  const getServiceIcon = (serviceName: string) => {
    const lowerCaseName = serviceName.toLowerCase();
    if (lowerCaseName.includes('cleaning')) {
      return <Snowflake className="w-10 h-10 text-gray-500 mb-2" />;
    }
    if (lowerCaseName.includes('installation')) {
      return <Wrench className="w-10 h-10 text-gray-500 mb-2" />;
    }
    if (lowerCaseName.includes('maintenance')) {
      return <Settings className="w-10 h-10 text-gray-500 mb-2" />;
    }
    if (lowerCaseName.includes('repair')) {
      return <Zap className="w-10 h-10 text-gray-500 mb-2" />;
    }
    return <Settings className="w-10 h-10 text-gray-500 mb-2" />; // Default icon
  };

  return (
    <div className="space-y-6 p-4">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Choose Your Service</h2>
        <p className="text-gray-600 text-lg">Select the type of service you need for your aircon</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableServices.map(service => (
          <Card 
            key={service.id} 
            className={`
              cursor-pointer transition-all duration-300 ease-in-out 
              flex flex-col items-center justify-center text-center p-6 
              rounded-xl shadow-md hover:shadow-lg hover:scale-105
              ${selectedService?.id === service.id 
                ? 'border-2 border-blue-500 ring-2 ring-blue-500 bg-blue-50' 
                : 'border border-gray-200 bg-white'
              }
            `}
            onClick={() => handleServiceSelect(service)}
          >
            <CardContent className="p-0 flex flex-col items-center">
              {getServiceIcon(service.name)}
              <p className="font-semibold text-lg text-gray-800 mb-1">{service.name}</p>
              <p className="text-sm text-gray-500">{service.description || 'No description available.'}</p>
              {selectedService?.id === service.id && (
                <div className="absolute top-2 right-2">
                  <Check className="text-blue-500 w-5 h-5" />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center mt-8 space-y-4 sm:space-y-0">
        <Button 
          variant="outline" 
          disabled 
          className="w-full sm:w-auto px-6 py-3 text-base rounded-full text-gray-500 border-gray-300"
        >
          <span className="mr-2">&lt;</span> Back to Location
        </Button>

        <Button 
          onClick={onNext} 
          disabled={!selectedService}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-base rounded-full shadow-md transition-all duration-300 transform hover:scale-105"
        >
          Continue to Units <span className="ml-2">&gt;</span>
        </Button>
      </div>
    </div>
  );
}
