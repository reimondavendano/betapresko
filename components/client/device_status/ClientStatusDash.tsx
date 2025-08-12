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

interface CleaningStatusEntry {
  location: ClientLocation;
  dueDevices: number;
  wellMaintainedDevices: number;
  scheduledDevices: number;
  totalDevices: number;
  lastServiceDate: string | null;
}

interface ClientStatusDashProps {
  cleaningStatuses: CleaningStatusEntry[];
  handleOpenBookingModal: (locationId: UUID) => void;
  handleOpenDetailsModal: (locationId: UUID, statusType: 'scheduled' | 'due' | 'well-maintained') => void;
}


export function ClientStatusDash({ cleaningStatuses, handleOpenBookingModal, handleOpenDetailsModal }: ClientStatusDashProps) {
  return (
    <Card className="rounded-xl shadow-lg p-6 bg-white">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-xl font-bold flex items-center">
          <Clock className="w-5 h-5 mr-2 text-gray-700" />
          Cleaning Status
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 space-y-4">
        {cleaningStatuses.length > 0 ? (
          cleaningStatuses.map(status => (
            <div key={status.location.id} className="border-b last:border-b-0 py-2">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="font-bold">
                    {status.location.name}{' '}
                    {status.lastServiceDate ? (
                      <span className="text-sm font-normal text-gray-600">
                        (Last Serviced: {format(new Date(status.lastServiceDate), 'MMM d, yyyy')})
                      </span>
                    ) : (
                      <span className="text-sm font-normal text-gray-600">
                        (No Service Record Yet)
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500 mb-2">Total Devices: {status.totalDevices}</p>

                  {/* Scheduled Units */}
                  {status.scheduledDevices > 0 && (
                    <div className="text-sm mt-1 grid grid-cols-[1fr_auto] items-start sm:flex sm:items-center sm:space-x-2">
                      <span className="text-gray-700 break-words">
                        <span className="font-medium">Booked:</span> {status.scheduledDevices} unit{status.scheduledDevices > 1 && 's'}
                      </span>
                      <div className="justify-self-end">
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 h-auto text-blue-600"
                          onClick={() => handleOpenDetailsModal(status.location.id, 'scheduled')}
                        >
                          [View Details]
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Due Units */}
                  {status.dueDevices > 0 && (
                    <div className="text-sm mt-1 grid grid-cols-[1fr_auto] items-start sm:flex sm:items-center sm:space-x-2">
                      <span className="text-red-600 break-words">Due for Cleaning: {status.dueDevices} unit{status.dueDevices > 1 && 's'}</span>
                      <div className="justify-self-end">
                        <Button variant="link" size="sm" className="p-0 h-auto text-blue-600" onClick={() => handleOpenDetailsModal(status.location.id, 'due')}>
                          [View Details]
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Well Maintained Units */}
                  {status.wellMaintainedDevices > 0 && (
                    <div className="text-sm mt-1 grid grid-cols-[1fr_auto] items-start sm:flex sm:items-center sm:space-x-2">
                      <span className="text-green-600 break-words">Up to date: {status.wellMaintainedDevices} unit{status.wellMaintainedDevices > 1 && 's'}</span>
                      <div className="justify-self-end">
                        <Button variant="link" size="sm" className="p-0 h-auto text-blue-600" onClick={() => handleOpenDetailsModal(status.location.id, 'well-maintained')}>
                          [View Details]
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Removed No Service Record section */}
                </div>
                <Button className="ml-4 bg-blue-600 hover:bg-blue-700" onClick={() => handleOpenBookingModal(status.location.id)}>
                  <Plus className="w-4 h-4 mr-2" /> Add Booking
                </Button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500">No devices registered for this client yet.</p>
        )}
      </CardContent>
    </Card>
  );
}