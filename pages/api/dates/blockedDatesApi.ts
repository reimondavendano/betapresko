// src/api/blockedDatesApi.ts
import { supabase } from '../../../lib/supabase'; // Adjust path to your Supabase client setup
import { BlockedDate, DateString } from '../../../types/database'; // Import BlockedDate and DateString types
import { isWithinInterval, parseISO, startOfDay, format } from 'date-fns'; // Added format for detailed logging

export const blockedDatesApi = {
  /**
   * Fetches all blocked dates from the 'blocked_dates' table.
   */
  getBlockedDates: async (): Promise<BlockedDate[]> => {
    const { data, error } = await supabase
      .from('blocked_dates')
      .select('*')
      .order('from_date', { ascending: true }); // Order by start date

    if (error) {
      console.error('Error fetching blocked dates:', error);
      throw new Error(error.message);
    }
    return data as BlockedDate[];
  },

  /**
   * Checks if a given date (as a YYYY-MM-DD string) falls within any blocked date interval.
   * Returns the matching BlockedDate object if found, otherwise null.
   * @param dateToCheckStr The date to check for blockage (YYYY-MM-DD string).
   * @param blockedDates An array of BlockedDate objects to check against.
   */
  isDateBlocked: (dateToCheckStr: DateString, blockedDates: BlockedDate[]): BlockedDate | null => {
    // Convert the input date string to a Date object using parseISO and normalize it to the start of its day
    const normalizedDateToCheck = startOfDay(parseISO(dateToCheckStr));

    for (const blocked of blockedDates) {
      // Convert from_date and to_date strings from DB to Date objects using parseISO and normalize them.
      const from = startOfDay(parseISO(blocked.from_date));
      const to = startOfDay(parseISO(blocked.to_date));
      

      if (isWithinInterval(normalizedDateToCheck, { start: from, end: to })) {
        return blocked;
      }
    }
    return null;
  },
};
