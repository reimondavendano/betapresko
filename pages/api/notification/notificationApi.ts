// src/pages/api/notification/notificationApi.ts
import { supabase } from '../../../lib/supabase';
import { Notification, UUID, DateString } from '../../../types/database';

export const notificationApi = {
  /**
   * Creates a new notification.
   */
  createNotification: async (notificationData: {
    client_id: UUID;
    send_to_admin: boolean;
    send_to_client: boolean;
    is_referral: boolean;
    date: DateString;
  }): Promise<Notification> => {
    const { data, error } = await supabase
      .from('notifications')
      .insert([notificationData])
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      throw new Error(error.message);
    }
    return data as Notification;
  },

  /**
   * Creates multiple notifications at once.
   */
  createMany: async (notifications: Array<{
    client_id: UUID;
    send_to_admin: boolean;
    send_to_client: boolean;
    is_referral: boolean;
    date: DateString;
  }>): Promise<Notification[]> => {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) {
      console.error('Error creating notifications:', error);
      throw new Error(error.message);
    }
    return data as Notification[];
  },

  /**
   * Fetches notifications for a specific client.
   */
  getNotificationsByClientId: async (clientId: UUID): Promise<Notification[]> => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      throw new Error(error.message);
    }
    return data as Notification[];
  },

  /**
   * Fetches all notifications.
   */
  getAllNotifications: async (): Promise<Notification[]> => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      throw new Error(error.message);
    }
    return data as Notification[];
  }
};
