"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { appointmentApi } from "@/pages/api/appointments/appointmentApi";
import { loyaltyPointsApi } from "@/pages/api/loyalty_points/loyaltyPointsApi";
import { deviceApi } from "@/pages/api/device/deviceApi";
import { appointmentDevicesApi } from "@/pages/api/appointment_devices/appointmentDevicesApi";
import { servicesApi } from "@/pages/api/service/servicesApi";
import { customSettingsApi } from "@/pages/api/custom_settings/customSettingsApi";

interface RedeemBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  point: any; // LoyaltyPoint
}

interface Device {
  id: string;
  name: string;
  brand?: { id: string; name: string } | null;
  ac_type?: { id: string; name: string } | null;
  horsepower?: { id: string; display_name: string } | null;
  price?: number;       // computed for logic
  isEligible?: boolean; // used to check if device can be redeemed
}

interface Service {
  id: string;
  name: string;
}

export function RedeemBookingModal({
  isOpen,
  onClose,
  clientId,
  point,
}: RedeemBookingModalProps) {
  const [step, setStep] = useState(1);
  const [date, setDate] = useState<string>("");
  const [service, setService] = useState<Service | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [services, setServices] = useState<{ id: string; name: string }[]>([]);

  // ✅ fetch available services (only Cleaning)
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const data = await servicesApi.getServices();
        setServices(data);
      } catch (err) {
        console.error("Error fetching services:", err);
      }
    };
    fetchServices();
  }, []);

  useEffect(() => {
    if (isOpen) {
        (async () => {
        try {
        const clientDevices = await deviceApi.getByClientIdForRedeemed(clientId);

        // 1. Fetch settings once
        const windowSetting = await customSettingsApi.getSetting("window_type_price");
        const splitSetting = await customSettingsApi.getSetting("split_type_price");

        const windowPrice = parseFloat(windowSetting?.setting_value || "0");
        const splitPrice = parseFloat(splitSetting?.setting_value || "0");

        // 2. Compute device prices for logic
        const withPrices = clientDevices.map((d: any) => {
        let price = 0;
        if (d.ac_type?.name?.toLowerCase() === "window") {
            price = windowPrice;
        } else if (
            ["split", "u-shape"].includes(d.ac_type?.name?.toLowerCase())
        ) {
            price = splitPrice;
        }
        return { ...d, price };
        });

        // 3. Find minimum price
        const minPrice = Math.min(...withPrices.map((d: any) => d.price));

        // 4. Store devices with price + flag for enabled
        const finalDevices = withPrices.map((d: any) => ({
        ...d,
        isEligible: d.price === minPrice,
        }));

            setDevices(finalDevices);
        } catch (err) {
            console.error("Error fetching devices:", err);
        }
        })();
    }
    }, [isOpen, clientId]);

  // ✅ fetch base prices from custom_settings & assign to devices
  useEffect(() => {
    const fetchDevicePrices = async () => {
      try {
        const windowSetting = await customSettingsApi.getSetting("window_type_price");
        const splitSetting = await customSettingsApi.getSetting("split_type_price");

        const windowPrice = Number(windowSetting?.setting_value || 0);
        const splitPrice = Number(splitSetting?.setting_value || 0);

        const pricedDevices = devices.map((d) => {
          let basePrice = 0;
          if (d.ac_type?.name?.toLowerCase().includes("window")) {
            basePrice = windowPrice;
          } else if (
            d.ac_type?.name?.toLowerCase().includes("split") ||
            d.ac_type?.name?.toLowerCase().includes("u-shape")
          ) {
            basePrice = splitPrice;
          }
          return { ...d, price: basePrice };
        });

        setDevices(pricedDevices);

        // ✅ preselect cheapest device
        const minPrice = Math.min(...pricedDevices.map((d) => d.price || Infinity));
        const cheapest = pricedDevices.find((d) => d.price === minPrice);
        if (cheapest) {
          setSelectedDevice(cheapest.id);
        }
      } catch (err) {
        console.error("Error fetching device prices:", err);
      }
    };

    if (devices.length > 0) {
      fetchDevicePrices();
    }
  }, [devices.length]);

  // ✅ Confirm Redeem
  const handleConfirm = async () => {
    if (!date || !service || !selectedDevice) return;

    setLoading(true);
    try {
      // 1. Create the appointment
      const newAppointment = await appointmentApi.createAppointmentRedeem({
        client_id: clientId,
        location_id: point?.client?.location_id || "",
        service_id: service.id,
        appointment_date: date,
        appointment_time: null,
        amount: 0,
        total_units: 1,
        stored_discount: 0,
        notes: "Redeemed free cleaning via loyalty points",
        status: "redeemed",
        discount_type: "none",
        stored_loyalty_points: point.points, // store used points
      });

      // 2. Attach the device
      if (newAppointment?.id) {
        await appointmentDevicesApi.createMany([
          {
            appointment_id: newAppointment.id,
            device_id: selectedDevice,
          },
        ]);
      }

      // 3. Update loyalty point status → Redeem
      await loyaltyPointsApi.updateLoyaltyPointStatus(point.id, "Redeemed");

      onClose();
    } catch (err) {
      console.error("Failed to redeem booking:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Redeem Free Cleaning</DialogTitle>
        </DialogHeader>

        {/* Step 1: Select Date */}
        {step === 1 && (
          <div className="space-y-4">
            <label className="block text-sm font-medium">Select Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border rounded px-3 py-2 w-full"
            />
            <DialogFooter>
              <Button onClick={() => setStep(2)} disabled={!date} className="bg-teal-600 text-white">
                Next
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 2: Select Service */}
        {step === 2 && (
          <div className="space-y-4">
            <label className="block text-sm font-medium">Select Service</label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={service?.id || ""}
              onChange={(e) =>
                setService({
                  id: e.target.value,
                  name: e.target.options[e.target.selectedIndex].text,
                })
              }
            >
              <option value="">-- Select Service --</option>
              {services
                .filter((s) => s.name.toLowerCase() === "cleaning") // ✅ show only Cleaning
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={!service} className="bg-teal-600 text-white">
                Next
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 3: Select Device */}
        {step === 3 && (
          <div className="space-y-4">
            <label className="block text-sm font-medium">Select Device</label>
            <div className="space-y-3">
              {devices.map((d) => (
                <label
                    key={d.id}
                    className={`flex items-center gap-2 p-2 border rounded cursor-pointer ${
                    !d.isEligible ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                >
                    <input
                    type="radio"
                    name="device"
                    value={d.id}
                    checked={selectedDevice === d.id}
                    onChange={() => setSelectedDevice(d.id)}
                    disabled={!d.isEligible} // 🔥 only lowest-price device(s) can be selected
                    />
                    <div>
                    <p className="font-medium">{d.name}</p>
                    <p className="text-xs text-gray-500">
                        {d.brand?.name || ""} | {d.ac_type?.name || ""} |{" "}
                        {d.horsepower?.display_name || ""}
                    </p>
                    <p className="text-xs text-teal-600">Eligible for Free Cleaning</p>
                    </div>
                </label>
                ))}

            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={() => setStep(4)} disabled={!selectedDevice} className="bg-teal-600 text-white">
                Next
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 4: Summary */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-md font-semibold">Summary</h3>
            <p>
              <strong>Date:</strong> {format(new Date(date), "MMM d, yyyy")}
            </p>
            <p>
              <strong>Service:</strong> {service?.name}
            </p>
            <p>
              <strong>Device:</strong> {devices.find((d) => d.id === selectedDevice)?.name}
            </p>
            <p>
              <strong>Total Price:</strong> ₱0 (Free Cleaning)
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button onClick={handleConfirm} disabled={loading} className="bg-teal-600 text-white">
                {loading ? "Processing..." : "Confirm Redeem"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
