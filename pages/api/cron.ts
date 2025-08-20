import { NextResponse } from "next/server";

export async function GET() {
  try {
    // // Example: Find upcoming bookings and send SMS
    // const upcomingBookings = await fetchBookingsForTomorrow(); // <-- your DB logic
    
    // for (const booking of upcomingBookings) {
    //   const smsMessage = `Hi ${booking.clientName}, reminder: your cleaning is on ${booking.date}.`;

    //   await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/sms/send-sms`, {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({
    //       number: booking.clientPhone,
    //       message: smsMessage,
    //       type: "normal",
    //     }),
    //   });
    // }

    // return NextResponse.json({
    //   success: true,
    //   count: upcomingBookings.length,
    //   runAt: new Date().toISOString(),
    // });
  } catch (err: any) {
    console.error("Cron job failed", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
