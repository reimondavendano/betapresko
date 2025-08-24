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
  }, [clientId, filter, page]);

  if (loading) return <p>Loading invoices...</p>;

  const computeUnitPrice = (appt: AppointmentWithDetails) => {
    const acType = appt.appointment_devices?.[0]?.devices?.ac_types?.name || "";
    console.log(acType, 'ac');
    if (acType.toLowerCase().includes("window")) return customSettings["window_type_price"] || 0;
    if (acType.toLowerCase().includes("split")) return customSettings["split_type_price"] || 0;
    if (acType.toLowerCase().includes("u")) return customSettings["split_type_price"] || 0;
    return 0;
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
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Invoices</h2>
        <div className="flex gap-2">
          {["all", "today", "incoming", "previous"].map((f) => (
            <Button
                className="rounded-md border-teal-400 text-teal-600 bg-white hover:bg-white-100 shadow-md "
                key={f}
                variant={filter === f && !dateFilter ? "outline" : "outline"}
                onClick={() => {
                    setFilter(f as any);
                    setDateFilter(""); // ✅ reset custom date when using buttons
                }}
                >
                {f}
            </Button>
          ))}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
           
            className="border rounded-md px-2 py-1 text-sm border-teal-400 text-teal-600 bg-white hover:bg-white-100 shadow-md "
          />
        </div>
      </div>

      {appointments.map((appt, idx) => {
        console.log(appt);
        const unitPrice = computeUnitPrice(appt);
        // const subtotal = appt.total_units * unitPrice;
        const total = appt.amount;

         const brandCounts: Record<string, number> = {};
        (appt.appointment_devices || []).forEach((ad) => {
          const brand = ad.devices?.brands?.name || "Unknown";
          brandCounts[brand] = (brandCounts[brand] || 0) + 1;
        });
        const devicesDisplay = Object.entries(brandCounts)
          .map(([brand, count]) => `${brand} (${count})`)
          .join(", ");

        return (
          <Card
            id={`invoice-${appt.id}`}
            key={appt.id}
            className="p-0 bg-white shadow-md relative overflow-hidden"
          >
            {/* Header with logo + background color */}
            <div className="flex justify-between items-start px-6 py-4 bg-[#A9CDD0] text-white">
              <div>
                <img src="../presko_logo.jpg" width={80} height={80} alt="Logo" className="mb-2" />
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
            <div className="px-6">
              <table className="w-full border-collapse mb-6">
                <thead className="bg-gradient-to-r from-[#B7DEE1] via-[#A9CDD0] to-[#99BCC0] text-white shadow-md">
                  <tr className="border-b">
                    <th className="text-left py-2">Service</th>
                    <th className="text-left py-2">Devices</th>
                    <th className="text-left py-2">Quantity</th>
                    <th className="text-left py-2">Unit price</th>
                    <th className="text-left py-2">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2">{appt.services?.name || "Cleaning Service"}</td>
                    <td className="py-2">{devicesDisplay}</td>
                    <td className="py-2">{appt.total_units}</td>
                    <td className="py-2">₱{unitPrice}</td>
                    <td className="py-2">₱{total.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Invoice Summary */}
            <div className="flex justify-end px-6 pb-6">
              <div className="w-1/3 text-sm space-y-1 border p-3 rounded-md bg-gray-50">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₱{total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>₱0.00</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>₱{total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payments</span>
                  <span>₱{total.toFixed(2)}</span>
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
