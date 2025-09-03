// PointsAppointments.tsx
"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { RecentAppointmentsTable } from "./RecentAppointmentsTable";
import { PointsCard } from "./PointsCard";
import { ClientDevicesTable } from "./ClientDevicesTable";
import {
  Appointment,
  ClientLocation,
  Device,
  Brand,
  ACType,
  HorsepowerOption,
  AppointmentDevice,
  UUID,
  Service,
} from "../../../types/database";

// shadcn/ui
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PointsAppointmentsProps {
  clientId: string;
  appointments: Appointment[];
  deviceIdToAppointmentId: Map<UUID, UUID[]>;
  points: number;
  pointsExpiry?: string | null;
  
  getServiceName: (id: UUID | null) => string;
  locations: ClientLocation[];
  devices: Device[];
  brands: Brand[];
  acTypes: ACType[];
  horsepowerOptions: HorsepowerOption[];
  onApplyDeviceUpdate: (
    id: UUID,
    patch: Partial<Pick<Device, "name" | "brand_id" | "ac_type_id" | "horsepower_id">>
  ) => Promise<Device>;
  onDeviceUpdated?: (device: Device) => void; 
  onReferClick: () => void;
  allServices: Service[];
  loyaltyPointsHistory: any[];
}

export function PointsAppointments({
  clientId,
  appointments,
  deviceIdToAppointmentId,
  points,
  pointsExpiry,
  getServiceName,
  locations,
  devices,
  brands,
  acTypes,
  horsepowerOptions,
  onApplyDeviceUpdate,
  onDeviceUpdated,
  onReferClick,
  allServices,
  loyaltyPointsHistory
}: PointsAppointmentsProps) {
  const [activeTab, setActiveTab] = useState<
    "points" | "appointments" | "devices"
  >("points");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [editedData, setEditedData] = useState<
    Partial<Pick<Device, "name" | "brand_id" | "ac_type_id" | "horsepower_id">>
  >({});
  const [saving, setSaving] = useState(false);

  // Map device -> appointment statuses
  const isSpecsEditable = (deviceId: UUID | null) => {
    if (!deviceId) return true;

    const apptIds = deviceIdToAppointmentId.get(deviceId) || [];
    const statuses = apptIds
      .map((id) => appointments.find((a) => a.id === id)?.status)
      .filter((s): s is Appointment["status"] => !!s);

    if (statuses.length === 0) return true;
    return statuses.every((s) => s === "completed");
  };

  
  const openEditFor = (device: Device) => {
    setEditingDevice(device);
    setEditedData({
      name: device.name || "",
      brand_id: device.brand_id ?? undefined,
      ac_type_id: device.ac_type_id ?? undefined,
      horsepower_id: device.horsepower_id ?? undefined,
    });
    setIsEditModalOpen(true);
  };

  const confirmAndSave = async () => {
    if (!editingDevice) return;
    try {
      setSaving(true);
      const updated = await onApplyDeviceUpdate(editingDevice.id, {
        name: editedData.name?.trim() ?? undefined,
        brand_id: editedData.brand_id ?? null,
        ac_type_id: editedData.ac_type_id ?? null,
        horsepower_id: editedData.horsepower_id ?? null,
      });
      onDeviceUpdated?.(updated);
      setIsConfirmModalOpen(false);
      setEditingDevice(null);
    } catch (err) {
      console.error("Failed to update device", err);
      // optional: toast here
    } finally {
      setSaving(false);
    }
  };

  const specsLocked = editingDevice ? !isSpecsEditable(editingDevice.id) : false;

  return (
    <div className="bg-white rounded-xl shadow-md p-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b mb-4">
        <Button
          variant={activeTab === "points" ? "default" : "outline"}
          className={`rounded-t-md px-4 py-2 ${
            activeTab === "points"
              ? "bg-teal-500 text-white shadow-md"
              : "border-teal-400 text-teal-600"
          }`}
          onClick={() => setActiveTab("points")}
        >
          Points
        </Button>
        <Button
          variant={activeTab === "appointments" ? "default" : "outline"}
          className={`rounded-t-md px-4 py-2 ${
            activeTab === "appointments"
              ? "bg-teal-500 text-white shadow-md"
              : "border-teal-400 text-teal-600"
          }`}
          onClick={() => setActiveTab("appointments")}
        >
          Appointments
        </Button>
        <Button
          variant={activeTab === "devices" ? "default" : "outline"}
          className={`rounded-t-md px-4 py-2 ${
            activeTab === "devices"
              ? "bg-teal-500 text-white shadow-md"
              : "border-teal-400 text-teal-600"
          }`}
          onClick={() => setActiveTab("devices")}
        >
          Devices
        </Button>
      </div>

      {/* Tab Content */}
      <div>
       {activeTab === "points" && (
          <PointsCard clientId={clientId} itemsPerPage={5} />
        )}


        {activeTab === "appointments" && (
          <RecentAppointmentsTable
            appointments={appointments}
            getServiceName={getServiceName}
            locations={locations}
            itemsPerPage={5}
          />
        )}

        {activeTab === "devices" && (
          <ClientDevicesTable
            devices={devices}
            locations={locations}
            brands={brands}
            acTypes={acTypes}
            horsepowerOptions={horsepowerOptions}
            appointments={appointments}
            deviceIdToAppointmentId={deviceIdToAppointmentId}
            onEditDevice={openEditFor}
            allServices={allServices || []}
          />
        )}
      </div>

      {/* ------------------------- */}
      {/* Edit Device Dialog        */}
      {/* ------------------------- */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Device</DialogTitle>
          </DialogHeader>

          {editingDevice && (
            <div className="space-y-4">
              {/* Device Name */}
              <div>
                <Label>Device Name</Label>
                <Input
                  value={editedData.name || ""}
                  onChange={(e) =>
                    setEditedData({ ...editedData, name: e.target.value })
                  }
                />
              </div>

              {/* Brand */}
              <div>
                <Label>Brand</Label>
                <Select
                  disabled={specsLocked}
                  value={(editedData.brand_id as string) || ""}
                  onValueChange={(val) =>
                    setEditedData({ ...editedData, brand_id: val as UUID })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* AC Type */}
              <div>
                <Label>AC Type</Label>
                <Select
                  disabled={specsLocked}
                  value={(editedData.ac_type_id as string) || ""}
                  onValueChange={(val) =>
                    setEditedData({ ...editedData, ac_type_id: val as UUID })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select AC Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {acTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Horsepower */}
              <div>
                <Label>Horsepower</Label>
                <Select
                  disabled={specsLocked}
                  value={(editedData.horsepower_id as string) || ""}
                  onValueChange={(val) =>
                    setEditedData({ ...editedData, horsepower_id: val as UUID })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Horsepower" />
                  </SelectTrigger>
                  <SelectContent>
                    {horsepowerOptions.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" className="rounded-lg w-full sm:w-auto rounded-lg border-teal-400 text-teal-600 shadow-md bg-white hover:bg-white" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              className="rounded-lg w-full sm:w-auto rounded-lg border-teal-400 text-teal-600 shadow-md bg-white hover:bg-white"
              onClick={() => {
                setIsEditModalOpen(false);
                setIsConfirmModalOpen(true);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------- */}
      {/* Confirm Dialog            */}
      {/* ------------------------- */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Update</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to update this device?</p>
          <DialogFooter>
            <Button variant="outline"  className="rounded-lg w-full sm:w-auto rounded-lg border-teal-400 text-teal-600 shadow-md bg-white hover:bg-white" onClick={() => setIsConfirmModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmAndSave}  variant="outline" className="rounded-lg w-full sm:w-auto rounded-lg border-teal-400 text-teal-600 shadow-md bg-white hover:bg-white" disabled={saving}>
              {saving ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}