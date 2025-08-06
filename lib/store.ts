import { configureStore } from '@reduxjs/toolkit'
import bookingReducer from './features/booking/bookingSlice'
import clientReducer from './features/client/clientSlice'
import adminReducer from './features/admin/adminSlice'

export const store = configureStore({
  reducer: {
    booking: bookingReducer,
    client: clientReducer,
    admin: adminReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch