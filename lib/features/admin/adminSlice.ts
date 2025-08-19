import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export type AdminView =
  | 'dashboard'
  | 'bookings'
  | 'appointments'
  | 'custom_settings'
  | 'master_data'
  | 'brands'
  | 'horsepower'
  | 'types'
  | 'cities'
  | 'barangays'
  | 'services'
  | 'blocked_dates'
  | 'clients'

interface AdminState {
  isAuthenticated: boolean
  currentAdmin: {
    id: string
    username: string
    email: string
    role: string
    name?: string | null
    address?: string | null
  } | null
  dashboardStats: {
    totalClients: number
    totalAppointments: number
    pendingAppointments: number
    completedAppointments: number
    totalRevenue: number
  }
  appointments: any[]
  loading: boolean
  error: string | null
  activeView: AdminView
  notifications: any[]
  newNotificationsCount: number
}

const initialState: AdminState = {
  isAuthenticated: false,
  currentAdmin: null,
  dashboardStats: {
    totalClients: 0,
    totalAppointments: 0,
    pendingAppointments: 0,
    completedAppointments: 0,
    totalRevenue: 0,
  },
  appointments: [],
  loading: false,
  error: null,
  activeView: 'dashboard',
  notifications: [],
  newNotificationsCount: 0,
}

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
    setAuthenticated: (state, action: PayloadAction<boolean>) => {
      state.isAuthenticated = action.payload
    },
    setCurrentAdmin: (state, action: PayloadAction<AdminState['currentAdmin']>) => {
      state.currentAdmin = action.payload
    },
    setDashboardStats: (state, action: PayloadAction<AdminState['dashboardStats']>) => {
      state.dashboardStats = action.payload
    },
    setActiveView: (state, action: PayloadAction<AdminView>) => {
      state.activeView = action.payload
    },
    setAppointments: (state, action: PayloadAction<any[]>) => {
      state.appointments = action.payload
    },
    addAppointment: (state, action: PayloadAction<any>) => {
      const existingAppointment = state.appointments.find(appointment => appointment.id === action.payload.id);
      if (!existingAppointment) {
        state.appointments.unshift(action.payload);
      }
    },
    setNotifications: (state, action: PayloadAction<any[]>) => {
      state.notifications = action.payload;
    },
    setNewNotificationsCount: (state, action: PayloadAction<number>) => {
      state.newNotificationsCount = action.payload;
    },
    logout: (state) => {
      state.isAuthenticated = false
      state.currentAdmin = null
      state.activeView = 'dashboard'
    },
  },
})

export const {
  setLoading,
  setError,
  setAuthenticated,
  setCurrentAdmin,
  setDashboardStats,
  setActiveView,
  setAppointments,
  addAppointment,
  setNotifications,
  setNewNotificationsCount,
  logout,
} = adminSlice.actions

export default adminSlice.reducer