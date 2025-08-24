"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { appointmentApi } from "@/pages/api/appointments/appointmentApi";
import { customSettingsApi } from "@/pages/api/custom_settings/customSettingsApi";
import type { AppointmentWithDetails, CustomSetting } from "@/types/database";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface Props {
  clientId: string;
}

export function ClientInvoice({ clientId }: Props) {
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "today" | "incoming" | "previous">("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [customSettings, setCustomSettings] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchData = async () => {
      if (!clientId) return;
      setLoading(true);

      const res = await appointmentApi.getAppointments({
        clientId,
        status: "completed",
        dateFilter: dateFilter || filter,
        page,
        limit: 1,
      });
      setAppointments(res.data || []);
      setTotalPages(res.pagination.totalPages || 1);

      const settingsRes = await customSettingsApi.getAll();
      const mapped: Record<string, number> = {};
      (settingsRes as CustomSetting[] || []).forEach((s) => {
        mapped[s.setting_key] = Number(s.setting_value);
      });
      setCustomSettings(mapped);

      setLoading(false);
    };
    fetchData();
  }, [clientId, filter, page, dateFilter]);

  if (loading) return <p>Loading invoices...</p>;

   const computeUnitPrice = (device: any): number => {
      if (!customSettings || Object.keys(customSettings).length === 0) {
        return 0;
      }
      
      const acType = device?.ac_types?.name || "";
      const horsepowerValue = parseFloat(device?.horsepower_options?.value || "0");

      let unitPrice = 0;

      if (acType.toLowerCase().includes("split") || acType.toLowerCase().includes("u")) {
        // Split Type and U-shaped
        if (horsepowerValue <= 1.5) {
          unitPrice = customSettings["split_type_price"] || 0;
        } else {
          unitPrice = (customSettings["split_type_price"] || 0) + (customSettings["surcharge"] || 0);
        }
      } else if (acType.toLowerCase().includes("window")) {
        // Window Type
        if (horsepowerValue <= 1.5) {
          unitPrice = customSettings["window_type_price"] || 0;
        } else {
          unitPrice = (customSettings["window_type_price"] || 0) + (customSettings["surcharge"] || 0);
        }
      }

      return unitPrice;
    };

    const calculateDiscount = (client: any) => {
      if (!client) return { value: 0, type: "None" };

      const discountValue = customSettings["discount"] || 0;
      const familyDiscountValue = customSettings["family_discount"] || 0;

      if (client.discounted) {
        // Client has discount enabled - choose the larger discount
        if (familyDiscountValue > discountValue) {
          return { value: familyDiscountValue, type: "Family/Friends" };
        } else {
          return { value: discountValue, type: "Standard" };
        }
      } else {
        // Client has no "discounted" flag, apply standard discount if > 0
        if (discountValue > 0) {
          return { value: discountValue, type: "Standard" };
        }
      }
      return { value: 0, type: "None" };
    };



  // ✅ Capture invoice via canvas and download as PDF
  const downloadPDF = (invoiceId: string) => {
    const element = document.getElementById(`invoice-${invoiceId}`);
    if (!element) return;

    // Hide download button before capture
    const btn = element.querySelector(".pdf-btn") as HTMLElement;
    if (btn) btn.style.display = "none";

    html2canvas(element, { scale: 2, backgroundColor: "#fff" }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pageWidth) / imgProps.width;

      pdf.addImage(imgData, "PNG", 0, 0, pageWidth, imgHeight);
      pdf.save(`invoice-${invoiceId}.pdf`);

      // Restore button after capture
      if (btn) btn.style.display = "block";
    });
  };

  return (
    <div className="space-y-6">
      {/* ✅ Filter Buttons */}
     {/* ✅ Filter Buttons */}
      <div className="flex flex-col sm:flex-row sm:justify-between w-full gap-2">
        {/* Buttons Row */}
        <div className="flex flex-wrap gap-2">
          {["all", "today", "incoming", "previous"].map((f) => (
            <Button
              key={f}
              className="rounded-md border-teal-400 text-teal-600 bg-white hover:bg-white-100 shadow-md text-sm"
              variant={filter === f && !dateFilter ? "outline" : "outline"}
              onClick={() => {
                setFilter(f as any);
                setDateFilter("");
              }}
            >
              {f}
            </Button>
          ))}
        </div>

        {/* Date Input */}
        <div className="flex w-full sm:w-auto">
          <input
            type="date"
            value={dateFilter}
              onChange={(e) => {
              setDateFilter(e.target.value);
              setPage(1);
            }}
            
            className="w-full sm:w-auto border rounded-md px-2 py-1 text-sm border-teal-400 text-teal-600 bg-white hover:bg-white-100 shadow-md"
          />
        </div>
      </div>


      {appointments.map((appt, idx) => {
        const unitPrice = computeUnitPrice(appt);
        // const subtotal = appt.total_units * unitPrice;
        const total = appt.amount;
        // Compute subtotal = sum of device unit prices
        const subtotal = (appt.appointment_devices || []).reduce((sum, ad) => {
          const unitPrice = computeUnitPrice(ad.devices);
          return sum + unitPrice;
        }, 0);

        // Apply discount on subtotal
        const discount = calculateDiscount(appt.clients);
        const discountAmount = (subtotal * discount.value) / 100;

        // Final total comes from appointment table (trusted amount)
        const finalTotal = appt.amount;


        return (
          <Card
            id={`invoice-${appt.id}`}
            key={appt.id}
            className="p-0 bg-white shadow-md relative overflow-hidden"
          >
            {/* Header with logo + background color */}
            <div className="flex justify-between items-start px-6 py-4 bg-[#A9CDD0] text-white">
              <div>
                <img src="../assets/images/presko_logo.png" width={250} height={250} alt="Logo" className="h-150 mb-2" />
                <h3 className="font-bold text-lg">PreskoAC</h3>
                <p>preskoac@gmail.com</p>
              </div>
              <div className="text-right space-y-1">
                <p><strong>Invoice:</strong> {String(idx + 1).padStart(4, "0")}</p>
                <p><strong>Issue date:</strong> {appt.appointment_date}</p>
                <p><strong>Due date:</strong> {appt.appointment_date}</p>

                {/* ✅ PDF Download Button */}
                <Button
                  variant="outline"
                  onClick={() => downloadPDF(appt.id)}
                  className="mt-2 border-teal-400 text-teal-600 bg-white hover:bg-white-100 shadow-md text-sm pdf-btn"
                >
                  Download PDF
                </Button>
              </div>
            </div>

            {/* Client Info */}
            <div className="mb-6 px-6 py-4">
              <p className="font-semibold">To</p>
              <p>{appt.clients?.name}</p>
              <p>{appt.clients?.email || ""}</p>
              <p>{appt.clients?.mobile}</p>
            </div>

            {/* Table */}
           <div className="px-6 overflow-x-auto">
              <table className="w-full border-collapse mb-6">
                <thead>
                <tr className="bg-gradient-to-r from-[#B7DEE1] via-[#A9CDD0] to-[#99BCC0] text-white">
                  <th className="px-4 py-2 text-left">Service</th>
                  <th className="px-4 py-2 text-left">Device</th>
                  <th className="px-4 py-2 text-left">Brand</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Horsepower</th>
                  <th className="px-4 py-2 text-left">Quantity</th>
                  <th className="px-4 py-2 text-left">Unit Price</th>
                </tr>
              </thead>

                <tbody>
                  {(appt.appointment_devices || []).map((ad, idx2) => {
                  const device = ad.devices;
                  const unitPrice = computeUnitPrice(device); // now pass device, not appt

                  return (
                    <tr key={idx2} className="border-b">
                      <td className="py-2">{appt.services?.name || "Cleaning Service"}</td>
                      <td className="py-2">{device?.name || "Device"}</td>
                      <td className="py-2">{device?.brands?.name || "-"}</td>
                      <td className="py-2">{device?.ac_types?.name || "-"}</td>
                      <td className="py-2">{device?.horsepower_options?.display_name || "-"}</td>
                      <td className="py-2">1</td>
                      <td className="py-2">₱{unitPrice}</td>
                    </tr>
                  );
                })}

                </tbody>
              </table>
            </div>

            {/* Invoice Summary */}
          <div className="flex justify-end px-6 pb-6">
            <div className="w-full sm:w-1/2 lg:w-1/3 text-sm space-y-1 border p-3 rounded-md bg-gray-50">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₱{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount ({discount.value}% {discount.type})</span>
                <span>-₱{discountAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>₱0.00</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>₱{finalTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Payments</span>
                <span>₱{finalTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Balance</span>
                <span>₱0.00</span>
              </div>
            </div>
          </div>



          </Card>
        );
      })}

      {/* ✅ Pagination */}
      <div className="flex justify-center gap-4">
        <Button disabled={page === 1} onClick={() => setPage((p) => p - 1)} variant="outline" className="rounded-md border-teal-400 text-teal-600 bg-white hover:bg-white-100 shadow-md text-sm">
          Prev
        </Button>
        <span>Page {page} of {totalPages}</span>
        <Button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} variant="outline" className="rounded-md border-teal-400 text-teal-600 bg-white hover:bg-white-100 shadow-md text-sm">
          Next
        </Button>
      </div>
    </div>
  );
}
