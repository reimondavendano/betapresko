import { User, MapPin, Edit, Home, Plus, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Client, ClientLocation } from '../../../types/database';

interface ClientProfileProps {
  client: Client;
  primaryLocation: ClientLocation | null;
  onEditPrimaryLocation: () => void;
  onAddLocation: () => void;
}

export function ClientProfile({
  client,
  primaryLocation,
  onEditPrimaryLocation,
  onAddLocation,
}: ClientProfileProps) {
  return (
    <Card className="rounded-xl shadow-lg p-6 bg-white">
      <CardHeader className="p-0 mb-4">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold flex items-center">
            <User className="w-5 h-5 mr-2 text-gray-700" />
            Client Profile
          </CardTitle>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={onEditPrimaryLocation}
            >
              <Edit className="w-3 h-3 mr-1" />
              Edit Primary Location
            </Button>
            <Button
              variant="default"
              size="sm"
              className="text-xs"
              onClick={onAddLocation}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add New Location
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Loyalty Points</h3>
            <div className="flex items-center text-lg font-bold text-blue-600">
              <Star className="w-5 h-5 mr-2" />
              {client.points} Points
            </div>
            {client.points_expiry && (
              <p className="text-xs text-gray-500 mt-1">
                Points expire on {new Date(client.points_expiry).toLocaleDateString()}.
              </p>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Contact Info</h3>
            <p className="text-gray-900">{client.email}</p>
            <p className="text-gray-900">{client.mobile}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 flex items-center">
              <Home className="w-4 h-4 mr-2" />
              Primary Location
            </h3>
            {primaryLocation ? (
              <>
                <p className="font-semibold text-gray-900">{primaryLocation.name}</p>
                <p className="text-sm text-gray-600">
                  {primaryLocation.address_line1}, {primaryLocation.barangay_name}, {primaryLocation.city_name}
                </p>
              </>
            ) : (
              <p className="text-gray-500">No primary location set.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}