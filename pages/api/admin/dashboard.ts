// pages/api/admin/dashboard.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase, handleSupabaseError } from '../../../lib/supabase'
import { AppointmentStatus } from '../../../types/database'

interface DashboardStats {
  totalClients: number
  totalAppointments: number
  pendingAppointments: number
  completedAppointments: number
  totalRevenue: number
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DashboardStats | { error: string }>
) {
  if (req.method === 'GET') {
    try {
      // Fetch total clients
      const { count: totalClients, error: clientsError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })

      if (clientsError) {
        return handleSupabaseError(clientsError, res)
      }

      // Fetch total appointments
      const { count: totalAppointments, error: apptsError } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })

      if (apptsError) {
        return handleSupabaseError(apptsError, res)
      }

      // Fetch pending appointments
      const { count: pendingAppointments, error: pendingError } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending' as AppointmentStatus)

      if (pendingError) {
        return handleSupabaseError(pendingError, res)
      }

      // Fetch completed appointments
      const { count: completedAppointments, error: completedError } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed' as AppointmentStatus)

      if (completedError) {
        return handleSupabaseError(completedError, res)
      }

      // Calculate total revenue (sum of amount from completed appointments)
      const { data: revenueData, error: revenueError } = await supabase
        .from('appointments')
        .select('amount')
        .eq('status', 'completed' as AppointmentStatus)

      if (revenueError) {
        return handleSupabaseError(revenueError, res)
      }

      const totalRevenue = revenueData ? revenueData.reduce((sum, appt) => sum + appt.amount, 0) : 0

      const dashboardStats: DashboardStats = {
        totalClients: totalClients || 0,
        totalAppointments: totalAppointments || 0,
        pendingAppointments: pendingAppointments || 0,
        completedAppointments: completedAppointments || 0,
        totalRevenue: totalRevenue,
      }

      return res.status(200).json(dashboardStats)
    } catch (error: any) {
      return handleSupabaseError(error, res)
    }
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
