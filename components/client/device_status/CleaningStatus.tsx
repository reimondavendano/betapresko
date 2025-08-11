'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Clock,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import {
  ClientLocation,
  UUID
} from '../../../types/database';

// Helper function to format the full address
const formatAddress = (location: ClientLocation) => {
  const parts = [
    location.address_line1,
    location.street,
    location.barangay_name,
    location.city_name
  ].filter(Boolean);
  return parts.join(', ');
};

interface CleaningStatusProps {
  cleaningStatuses: Array<{
    location: ClientLocation;
    dueDevices: number;
    lastServiceDate: string | null;
    totalDevices: number;
    acNames: {
      name: string;
      brand: string;
      type: string;
      hp: string;
    }[];
    due3MonthAcNames: string[];
    due4MonthAcNames: string[];
    due6MonthAcNames: string[];
    wellMaintainedAcNames: string[];
    pendingAcNames: string[];
  }>;
  handleOpenBookingModal: (locationId: UUID) => void;
}

export function CleaningStatus({ cleaningStatuses, handleOpenBookingModal }: CleaningStatusProps) {
  return (
    <Card className="rounded-xl shadow-lg p-6 bg-white">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-xl font-bold flex items-center">
          <Clock className="w-5 h-5 mr-2 text-gray-700" />
          Cleaning Status by Location
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 space-y-4">
        {cleaningStatuses.length > 0 ? (
          cleaningStatuses.map(status => {
            const hasPendingDevices = status.pendingAcNames.length > 0;
            const hasDueDevices = status.dueDevices > 0;
            const hasWellMaintainedDevices = status.wellMaintainedAcNames.length > 0;

            return (
              <div key={status.location.id} className="border-b last:border-b-0 py-2">
                <div className="flex justify-between items-start">
                  <div className='flex-grow'>
                    <p className="font-semibold">{status.location.name}</p>
                    <p className="text-sm text-gray-600">{formatAddress(status.location)}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <Button className="ml-4 bg-blue-600 hover:bg-blue-700" onClick={() => handleOpenBookingModal(status.location.id)}>
                      <Plus className="w-4 h-4 mr-2" /> Add Booking
                    </Button>
                  </div>
                </div>
                <div className="mt-2 text-sm">
                  <p>
                    Last Service Date:{' '}
                    <span className="font-medium text-gray-800">
                      {status.lastServiceDate
                        ? format(new Date(status.lastServiceDate), 'MMM d, yyyy')
                        : "No status yet, we will update once it's completed"}
                    </span>
                  </p>
                  <div className="mt-1">
                    <span className="font-medium">Status:</span>
                    
                    {/* Display Pending Devices */}
                    {hasPendingDevices && (
                      <div className="ml-2 mt-1">
                        <span className="text-orange-600 font-semibold block">
                          Transactions still pending for:
                        </span>
                        <ul className="list-disc list-inside text-gray-700 pl-4">
                          {status.pendingAcNames.map((ac, i) => (
                            <li key={i}>{ac}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Display Due Devices */}
                    {hasDueDevices && (
                      <div className="ml-2 mt-1">
                        <span className="text-red-600 font-semibold block">
                          {status.dueDevices} of {status.totalDevices} AC unit
                          {status.dueDevices > 1 || status.totalDevices > 1 ? 's' : ''} due for cleaning
                        </span>
                        <ul className="list-disc list-inside text-gray-700 pl-4">
                          {status.due3MonthAcNames.map((ac, i) => (
                            <li key={i}>{`${ac} has already due 3 months`}</li>
                          ))}
                          {status.due4MonthAcNames.map((ac, i) => (
                            <li key={i}>{`${ac} has already due 4 months`}</li>
                          ))}
                          {status.due6MonthAcNames.map((ac, i) => (
                            <li key={i}>{`${ac} has already due 6 months`}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Display Well Maintained Devices */}
                    {hasWellMaintainedDevices && (
                      <div className="ml-2 mt-1">
                        <span className="text-green-600 font-semibold block">
                          {status.wellMaintainedAcNames.length} of {status.totalDevices} device
                          {status.totalDevices > 1 ? 's are' : ' is'} well maintained:
                        </span>
                        <ul className="list-disc list-inside text-gray-700 pl-4">
                          {status.wellMaintainedAcNames.map((ac, i) => (
                            <li key={i}>{ac}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* If no status to display */}
                    {!hasPendingDevices && !hasDueDevices && !hasWellMaintainedDevices && (
                      <p className="text-gray-500">No status available for devices at this location.</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-gray-500">No devices registered for this client yet.</p>
        )}
      </CardContent>
    </Card>
  );
}