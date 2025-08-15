// lib/features/admin/RealtimeBooking.ts
import { supabase } from '@/lib/supabase';
import { store } from '@/lib/store';
import { addAppointment, setNotifications, setNewNotificationsCount } from './adminSlice';

export const subscribeToBookings = () => {
  const channel = supabase
    .channel('admin-realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'appointments' },
      (payload) => {
        store.dispatch(addAppointment(payload.new));
      }
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications' },
      async (payload) => {
        console.log('New notification inserted:', payload.new);
        try {
          const res = await fetch('/api/admin/notifications');
          const json = await res.json();
          store.dispatch(setNotifications(json.data || []));
          store.dispatch(setNewNotificationsCount(json.data?.length || 0));
        } catch (err) {
          console.error('Failed to fetch notifications after realtime update', err);
        }
      }
    )
    .subscribe();

  return channel;
};