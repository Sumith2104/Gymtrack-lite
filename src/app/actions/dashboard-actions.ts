
'use server';

import { createSupabaseServerActionClient } from '@/lib/supabase/server';
import type { DailyCheckIns } from '@/lib/types';

export async function getCurrentOccupancy(gymDatabaseId: string): Promise<{ currentOccupancy: number; error?: string }> {
  if (!gymDatabaseId) {
    return { currentOccupancy: 0, error: 'Gym ID not provided.' };
  }
  const supabase = createSupabaseServerActionClient();

  try {
    const now = new Date().toISOString();
    
    // This query now correctly counts members whose check-in time is in the past
    // and whose projected check-out time is in the future.
    const { count, error } = await supabase
      .from('check_ins') 
      .select('*', { count: 'exact', head: true }) 
      .eq('gym_id', gymDatabaseId)
      .lte('check_in_time', now)
      .gt('check_out_time', now);
      
    if (error) {
      
      return { currentOccupancy: 0, error: error.message };
    }
    
    return { currentOccupancy: count ?? 0 };

  } catch (e: any) {
    
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

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayName = utcDate.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }).substring(0,3);
    daysOfWeek.push(dayName);
    dailyCounts.set(dayName, 0);
  }
  
  const sevenDaysAgoUTC = new Date();
  sevenDaysAgoUTC.setUTCDate(sevenDaysAgoUTC.getUTCDate() - 6); 
  sevenDaysAgoUTC.setUTCHours(0, 0, 0, 0);

  try {
    const { data, error } = await supabase
      .from('check_ins') 
      .select('check_in_time')
      .eq('gym_id', gymDatabaseId)
      .gte('check_in_time', sevenDaysAgoUTC.toISOString());

    if (error) {
      
      return { trends: [], error: error.message };
    }

    data?.forEach(record => {
      const checkInDate = new Date(record.check_in_time);
      const dayName = new Date(Date.UTC(checkInDate.getUTCFullYear(), checkInDate.getUTCMonth(), checkInDate.getUTCDate()))
                      .toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }).substring(0,3);
      if (dailyCounts.has(dayName)) { 
        dailyCounts.set(dayName, (dailyCounts.get(dayName) || 0) + 1);
      }
    });

    daysOfWeek.forEach(dayName => {
      trends.push({ date: dayName, count: dailyCounts.get(dayName) || 0 });
    });
    
    return { trends };

  } catch (e: any) {
    
     return { trends: [], error: 'Failed to fetch check-in trends.' };
  }
}
