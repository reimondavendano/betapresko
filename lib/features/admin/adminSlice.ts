import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export type AdminView =
  | 'dashboard'
  | 'bookings'
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
  loading: boolean
  error: string | null
  activeView: AdminView
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
  loading: false,
  error: null,
  activeView: 'dashboard',
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
  logout,
} = adminSlice.actions

export default adminSlice.reducer