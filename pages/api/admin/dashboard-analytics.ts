// pages/api/admin/dashboard-analytics.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase, handleSupabaseError } from '../../../lib/supabase'
import { 
  DashboardStats, 
  MonthlySalesData, 
  UpcomingAppointment, 
  TopClient,
  ClientsByArea,
  DeviceDueSoon,
  ForecastData,
  ChurnRiskClient,
  ReturnClient
} from '../../../types/database'

interface DashboardAnalytics {
  stats: DashboardStats;
  monthlySalesData: MonthlySalesData[];
  upcomingAppointments: UpcomingAppointment[];
  topClients: TopClient[];
  returnClients: ReturnClient[];
  clientsByArea: ClientsByArea[];
  devicesDueSoon: DeviceDueSoon[];
  forecastData: ForecastData[];
  churnRiskClients: ChurnRiskClient[];
}


function addMonths(date: Date, months: number) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DashboardAnalytics | { error: string }>
) {
  if (req.method === 'GET') {
    try {
      // Get current date ranges
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const next30Days = new Date();
      next30Days.setDate(now.getDate() + 30);

      // 🔹 Sales & Bookings Data
      const todayISO = today.toISOString().split('T')[0];
      const weekISO = startOfWeek.toISOString().split('T')[0];
      const monthISO = startOfMonth.toISOString().split('T')[0];

      // Total sales calculations
      const { data: todaySales } = await supabase
        .from('appointments')
        .select('amount')
        .eq('status', 'completed')
        .eq('appointment_date', todayISO);

      const { data: weekSales } = await supabase
        .from('appointments')
        .select('amount')
        .eq('status', 'completed')
        .gte('appointment_date', weekISO);

      const { data: monthSales } = await supabase
        .from('appointments')
        .select('amount')
        .eq('status', 'completed')
        .gte('appointment_date', monthISO);

      // Booking status breakdown
      const { data: statusBreakdown } = await supabase
        .from('appointments')
        .select('status')
        .gte('appointment_date', monthISO);

      const bookingStatusBreakdown = {
        pending: statusBreakdown?.filter(a => a.status === 'pending').length || 0,
        confirmed: statusBreakdown?.filter(a => a.status === 'confirmed').length || 0,
        completed: statusBreakdown?.filter(a => a.status === 'completed').length || 0,
        voided: statusBreakdown?.filter(a => a.status === 'voided').length || 0,
      };

      // Monthly sales trend data (last 12 months)
      const { data: monthlySalesRaw } = await supabase
        .from('appointments')
        .select('appointment_date, amount, status')
        .eq('status', 'completed')
        .gte('appointment_date', new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString().split('T')[0])
        .order('appointment_date');

      const monthlySalesMap = new Map();
      monthlySalesRaw?.forEach(appointment => {
        const monthKey = appointment.appointment_date.substring(0, 7); // YYYY-MM
        if (!monthlySalesMap.has(monthKey)) {
          monthlySalesMap.set(monthKey, { sales: 0, bookings: 0 });
        }
        monthlySalesMap.get(monthKey).sales += appointment.amount;
        monthlySalesMap.get(monthKey).bookings += 1;
      });

      const monthlySalesData: MonthlySalesData[] = Array.from(monthlySalesMap.entries())
        .map(([month, data]) => ({
          month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          sales: data.sales,
          bookings: data.bookings
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

        type RawUpcomingAppointment = {
          id: string;
          appointment_date: string;
          appointment_time: string | null;
          amount: number;
          clients: { name: string; mobile: string } | null;
          client_locations: { name: string } | null;
          services: { name: string } | null;
        };

      // Upcoming appointments (next 30 days, confirmed status)
      const { data: upcomingAppointmentsData } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          amount,
          clients (name, mobile),
          client_locations (name),
          services (name)
        `)
        .eq('status', 'confirmed')
        .gte('appointment_date', todayISO)
        .lte('appointment_date', next30Days.toISOString().split('T')[0])
        .order('appointment_date')
        .limit(10);

      const upcomingAppointments: UpcomingAppointment[] =
        (upcomingAppointmentsData as RawUpcomingAppointment[] | null)?.map((apt) => ({
          id: apt.id,
          client_name: apt.clients?.name || "Unknown",
          client_mobile: apt.clients?.mobile || "",
          appointment_date: apt.appointment_date,
          appointment_time: apt.appointment_time,
          service_name: apt.services?.name || "Unknown Service",
          location_name: apt.client_locations?.name || "Unknown Location",
          amount: apt.amount ?? 0,
        })) || [];

      // 🔹 Clients & Retention Data
      
      // New clients this month
      const { count: newClientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString());

      // Returning clients (clients with more than one appointment)
      const { data: clientAppointmentCounts } = await supabase
        .from('appointments')
        .select('client_id')
        .eq('status', 'completed');

      const clientCounts = new Map();
      clientAppointmentCounts?.forEach(apt => {
        clientCounts.set(apt.client_id, (clientCounts.get(apt.client_id) || 0) + 1);
      });
      const returningClientsCount = Array.from(clientCounts.values()).filter(count => count > 1).length;

      type RawTopClientAppointment = {
        client_id: string;
        amount: number;
        clients: {
          id: string;
          name: string;
          mobile: string;
        } | null;
      };

      // Top clients by spend
      const { data: topClientsData } = await supabase
        .from("appointments")
        .select(`
          client_id,
          amount,
          clients ( id, name, mobile )
        `)
        .eq("status", "completed");

      const clientSpendMap = new Map<string, {
        id: string;
        name: string;
        mobile: string;
        totalSpend: number;
        appointmentCount: number;
      }>();

      (topClientsData as RawTopClientAppointment[] | null)?.forEach((apt) => {
        const clientId = apt.client_id;
        if (!clientSpendMap.has(clientId)) {
          clientSpendMap.set(clientId, {
            id: clientId,
            name: apt.clients?.name || "Unknown",
            mobile: apt.clients?.mobile || "",
            totalSpend: 0,
            appointmentCount: 0,
          });
        }
        const client = clientSpendMap.get(clientId)!;
        client.totalSpend += apt.amount ?? 0;
        client.appointmentCount += 1;
      });

      const topClients: TopClient[] = Array.from(clientSpendMap.values())
        .sort((a, b) => b.totalSpend - a.totalSpend)
        .slice(0, 10);

      

        // Top returning clients
          const { data: returnClientsData, error: returnClientsErr } = await supabase
            .from("appointments")
            .select(`
              client_id,
              clients ( id, name, mobile )
            `)
            .eq("status", "completed");

          if (returnClientsErr) throw returnClientsErr;

          // Count completed appointments per client
          const returnClientsMap: Record<string, { id: string; name: string; mobile: string; count: number }> = {};

          (returnClientsData || []).forEach((appt: any) => {
            const client = appt.clients;
            if (!client) return;
            if (!returnClientsMap[client.id]) {
              returnClientsMap[client.id] = { ...client, count: 0 };
            }
            returnClientsMap[client.id].count++;
          });

          // ✅ Only include clients with at least 2 completed appts (returning)
          const returnClients = Object.values(returnClientsMap)
            .filter(c => c.count > 1)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);





      // Clients by area - simplified query to avoid complex joins
      const { data: clientsByAreaData } = await supabase
        .from('client_locations')
        .select(`
          barangays (name),
          cities (name),
          client_id
        `);

      
        type AppointmentRevenueRow = {
          client_id: string;
          amount: number;
          status: string;
        };

        type ClientLocationRow = {
          client_id: string | null;
          barangays: { name: string } | null;
          cities: { name: string } | null;
        };

      // Get appointments data separately to avoid complex joins
        const { data: appointmentsRevenue } = await supabase
          .from("appointments")
          .select("client_id, amount, status")
          .eq("status", "completed");

        const areaMap = new Map<
          string,
          {
            area: string;
            city: string;
            clientCount: Set<string>;
            totalRevenue: number;
          }
        >();

        const clientRevenueMap = new Map<string, number>();

        // Build client revenue mapping
        (appointmentsRevenue as AppointmentRevenueRow[] | null)?.forEach((apt) => {
          const current = clientRevenueMap.get(apt.client_id) || 0;
          clientRevenueMap.set(apt.client_id, current + (apt.amount ?? 0));
        });

        // Aggregate revenue per area
        (clientsByAreaData as ClientLocationRow[] | null)?.forEach((location) => {
          const areaKey = `${location.barangays?.name || "Unknown"}, ${
            location.cities?.name || "Unknown"
          }`;

          if (!areaMap.has(areaKey)) {
            areaMap.set(areaKey, {
              area: location.barangays?.name || "Unknown",
              city: location.cities?.name || "Unknown",
              clientCount: new Set(),
              totalRevenue: 0,
            });
          }

          const area = areaMap.get(areaKey)!;

          if (location.client_id) {
            area.clientCount.add(location.client_id);

            const clientRevenue = clientRevenueMap.get(location.client_id) || 0;
            area.totalRevenue += clientRevenue;
          }
        });

      const clientsByArea: ClientsByArea[] = Array.from(areaMap.values())
        .map(area => ({
          ...area,
          clientCount: area.clientCount.size
        }))
        .filter(area => area.clientCount > 0)
        .sort((a, b) => b.clientCount - a.clientCount)
        .slice(0, 10);

      // 🔹 Devices & Maintenance Forecast

      type RawDeviceDue = {
          id: string;
          name: string;
          client_id : string;
          due_3_months: string | null;
          due_4_months: string | null;
          due_6_months: string | null;
          clients: { name: string } | null;
          client_locations: { name: string } | null;
          brands: { name: string } | null;
          ac_types: { name: string } | null;
        };
      // Devices due soon (within 30 days)
      const { data: devicesDueData } = await supabase
        .from('devices')
        .select(`
          id,
          name,
          client_id,
          due_3_months,
          due_4_months,
          due_6_months,
          clients (name),
          client_locations (name),
          brands (name),
          ac_types (name)
        `);

      const devicesDueSoon: DeviceDueSoon[] = [];
      const next30DaysISO = next30Days.toISOString().split("T")[0];

      (devicesDueData as RawDeviceDue[] | null)?.forEach((device) => {
        const dueDates = [
          { date: device.due_3_months, type: "3_months" as const },
          { date: device.due_4_months, type: "4_months" as const },
          { date: device.due_6_months, type: "6_months" as const },
        ];

        dueDates.forEach((due) => {
          if (due.date && due.date <= next30DaysISO && due.date >= todayISO) {
            devicesDueSoon.push({
              id: device.id,
              name: device.name,
              client_name: device.clients?.name || 'Unknown',
              location_name: device.client_locations?.name || 'Unknown',
              brand_name: device.brands?.name,
              ac_type_name: device.ac_types?.name,
              due_date: due.date,
              due_type: due.type
            });
          }
        });
      });

      // Churn risk clients (clients with devices but no appointments in last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(now.getMonth() - 6);
      const sixMonthsAgoISO = sixMonthsAgo.toISOString().split('T')[0];

      const { data: churnRiskData } = await supabase
        .from('clients')
        .select(`
          id,
          name,
          mobile,
          devices (id),
          appointments (appointment_date)
        `);

      const churnRiskClients: ChurnRiskClient[] = [];
      churnRiskData?.forEach(client => {
        const deviceCount = client.devices?.length || 0;
        if (deviceCount > 0) {
          const appointments = client.appointments || [];
          const lastAppointment = appointments
            .map(apt => apt.appointment_date)
            .sort()
            .pop() || null;
          
          const daysSinceLastAppointment = lastAppointment 
            ? Math.floor((now.getTime() - new Date(lastAppointment).getTime()) / (1000 * 60 * 60 * 24))
            : 999;

          if (!lastAppointment || lastAppointment < sixMonthsAgoISO) {
            churnRiskClients.push({
              id: client.id,
              name: client.name,
              mobile: client.mobile,
              deviceCount,
              lastAppointment,
              daysSinceLastAppointment
            });
          }
        }
      });

      // 🔹 Forecast & Projections

      // Generate forecast data for next 6 months

      const { data: forecastDevices, error: devErr } = await supabase
          .from('devices')
          .select('id, client_id, due_3_months, due_4_months, due_6_months')

        if (devErr) throw devErr

        const deviceIds = (forecastDevices || []).map(d => d.id)

        // 2. Get latest appointment per device (ordered by date)
        const { data: appointmentsData, error: apptErr } = await supabase
          .from('appointment_devices')
          .select('device_id, appointment:appointments(amount, appointment_date)')
          .in('device_id', deviceIds)
          .order('appointment_date', { referencedTable: 'appointments', ascending: false })

        if (apptErr) throw apptErr

        // 3. Map device_id → latest appointment.amount
        const deviceRevenueMap = new Map<string, number>()
        appointmentsData?.forEach((row: any) => {
          if (!deviceRevenueMap.has(row.device_id)) {
            const amount = row.appointment?.amount || 0
            deviceRevenueMap.set(row.device_id, amount)
          }
        })

        // 4. Build forecast data month by month
        const forecastData: ForecastData[] = []

        for (let i = 0; i < 6; i++) {
          const forecastMonth = new Date(now.getFullYear(), now.getMonth() + i + 1, 1)
          const monthKey = forecastMonth.toISOString().substring(0, 7)

          const devicesDueThisMonth = (forecastDevices || []).filter(d =>
            [d.due_3_months, d.due_4_months, d.due_6_months].some(due => due?.startsWith(monthKey))
          )

        const devicesScheduled = devicesDueThisMonth.length
         const clientSet = new Set<string>()
            devicesDueThisMonth.forEach(d => {
              const hasAppointment = appointmentsData?.some(row => row.device_id === d.id)
              if (hasAppointment) {
                clientSet.add(d.client_id) // count client only once, regardless of devices
              }
            })
            const projectedBookings = clientSet.size

          // Revenue = sum of each device's *latest* appointment amount
          const projectedRevenue = devicesDueThisMonth.reduce((sum, d) => {
            return sum + (deviceRevenueMap.get(d.id) || 0)
          }, 0)

          forecastData.push({
            month: forecastMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            projectedRevenue,
            projectedBookings,
            devicesScheduled,
          })
        }


      

      // Compile dashboard stats
      const stats: DashboardStats = {
        totalSales: {
          today: todaySales?.reduce((sum, apt) => sum + apt.amount, 0) || 0,
          thisWeek: weekSales?.reduce((sum, apt) => sum + apt.amount, 0) || 0,
          thisMonth: monthSales?.reduce((sum, apt) => sum + apt.amount, 0) || 0
        },
        bookingStatusBreakdown,
        devicesData: {
          dueWithin30Days: devicesDueSoon.length,
          churnRisk: churnRiskClients.length
        },
        clientStats: {
          newThisMonth: newClientsCount || 0,
          returningClients: returningClientsCount
        }
      };

      const analytics: DashboardAnalytics = {
        stats,
        monthlySalesData,
        upcomingAppointments,
        topClients,
        returnClients,
        clientsByArea,
        devicesDueSoon: devicesDueSoon.slice(0, 20), // Limit to top 20
        forecastData,
        churnRiskClients: churnRiskClients.slice(0, 15) // Limit to top 15
      };

      return res.status(200).json(analytics);
    } catch (error: any) {
      console.error('Dashboard analytics error:', error);
      return handleSupabaseError(error, res);
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
