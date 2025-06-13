
'use server';

import { createSupabaseServerActionClient } from '@/lib/supabase/server';
import type { DailyCheckIns } from '@/lib/types';

export async function getCurrentOccupancy(gymDatabaseId: string): Promise<{ currentOccupancy: number; error?: string }> {
  if (!gymDatabaseId) {
    return { currentOccupancy: 0, error: 'Gym ID not provided.' };
  }
  const supabase = createSupabaseServerActionClient();

  // Get the start and end of the current day in UTC
  // Check-in records are assumed to be stored in UTC or comparable timezone
  const today = new Date();
  const todayStartUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0));
  const todayEndUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999));

  try {
    const { data, error, count } = await supabase
      .from('check_in_records')
      .select('id', { count: 'exact', head: false }) // head:false to get data for .length, or rely on count
      .eq('gym_id', gymDatabaseId)
      .gte('check_in_time', todayStartUTC.toISOString())
      .lte('check_in_time', todayEndUTC.toISOString())
      .is('check_out_time', null);

    if (error) {
      console.error('Error fetching current occupancy:', error.message);
      return { currentOccupancy: 0, error: error.message };
    }
    
    return { currentOccupancy: data?.length ?? 0 };
    // If using { head: true }, then count would be used:
    // return { currentOccupancy: count ?? 0 };

  } catch (e: any) {
    console.error('Unexpected error in getCurrentOccupancy:', e.message);
    return { currentOccupancy: 0, error: 'Failed to fetch occupancy data.' };
  }
}

export async function getDailyCheckInTrends(gymDatabaseId: string): Promise<{ trends: DailyCheckIns[]; error?: string }> {
  if (!gymDatabaseId) {
    return { trends: [], error: 'Gym ID not provided.' };
  }
  const supabase = createSupabaseServerActionClient();
  
  const trends: DailyCheckIns[] = [];
  const dailyCounts = new Map<string, number>();
  const daysOfWeek: string[] = [];

  // Initialize map for the last 7 days with 0 counts and prepare day labels
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    // Use UTC days to align with typical server storage
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayName = utcDate.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }).substring(0,3);
    daysOfWeek.push(dayName);
    dailyCounts.set(dayName, 0);
  }
  
  // Get the start of the 7-day period in UTC
  const sevenDaysAgoUTC = new Date();
  sevenDaysAgoUTC.setUTCDate(sevenDaysAgoUTC.getUTCDate() - 6); // Include today, so go back 6 days
  sevenDaysAgoUTC.setUTCHours(0, 0, 0, 0);

  try {
    const { data, error } = await supabase
      .from('check_in_records')
      .select('check_in_time')
      .eq('gym_id', gymDatabaseId)
      .gte('check_in_time', sevenDaysAgoUTC.toISOString());

    if (error) {
      console.error('Error fetching check-in trends:', error.message);
      return { trends: [], error: error.message };
    }

    data?.forEach(record => {
      const checkInDate = new Date(record.check_in_time);
      // Ensure we get the day name based on UTC date part
      const dayName = new Date(Date.UTC(checkInDate.getUTCFullYear(), checkInDate.getUTCMonth(), checkInDate.getUTCDate()))
                      .toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }).substring(0,3);
      if (dailyCounts.has(dayName)) { // Only count days within our 7-day window
        dailyCounts.set(dayName, (dailyCounts.get(dayName) || 0) + 1);
      }
    });

    // Populate trends array respecting the order of daysOfWeek
    daysOfWeek.forEach(dayName => {
      trends.push({ date: dayName, count: dailyCounts.get(dayName) || 0 });
    });
    
    return { trends };

  } catch (e: any) {
    console.error('Unexpected error in getDailyCheckInTrends:', e.message);
     return { trends: [], error: 'Failed to fetch check-in trends.' };
  }
}
