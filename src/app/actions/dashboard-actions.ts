
'use server';

import { flux } from '@/lib/flux/client';
import type { DailyCheckIns } from '@/lib/types';

export async function getCurrentOccupancy(gymDatabaseId: string): Promise<{ currentOccupancy: number; error?: string }> {
  if (!gymDatabaseId) {
    return { currentOccupancy: 0, error: 'Gym ID not provided.' };
  }

  try {
    const now = new Date().toISOString();

    // Check-in is valid if check_in_time is in past AND check_out_time is in future
    const query = `
      SELECT count(*) as count 
      FROM check_ins 
      WHERE gym_id = '${gymDatabaseId}' 
      AND check_in_time <= '${now}' 
      AND check_out_time > '${now}'
    `;

    const result = await flux.sql(query);

    if (!result.rows) {
      return { currentOccupancy: 0 };
    }

    // Count is usually returned as a string in some SQL dialects, ensure number
    const count = parseInt(result.rows[0].count || '0', 10);

    return { currentOccupancy: count };

  } catch (e: any) {
    console.error("Occupancy Fetch Error:", e);
    return { currentOccupancy: 0, error: 'Failed to fetch occupancy data.' };
  }
}

export async function getDailyCheckInTrends(gymDatabaseId: string): Promise<{ trends: DailyCheckIns[]; error?: string }> {
  if (!gymDatabaseId) {
    return { trends: [], error: 'Gym ID not provided.' };
  }

  const trends: DailyCheckIns[] = [];
  const dailyCounts = new Map<string, number>();
  const daysOfWeek: string[] = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayName = utcDate.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }).substring(0, 3);
    daysOfWeek.push(dayName);
    dailyCounts.set(dayName, 0);
  }

  const sevenDaysAgoUTC = new Date();
  sevenDaysAgoUTC.setUTCDate(sevenDaysAgoUTC.getUTCDate() - 6);
  sevenDaysAgoUTC.setUTCHours(0, 0, 0, 0);

  try {
    const query = `
      SELECT check_in_time
      FROM check_ins
      WHERE gym_id = '${gymDatabaseId}'
      AND check_in_time >= '${sevenDaysAgoUTC.toISOString()}'
    `;

    const result = await flux.sql(query);

    if (result.rows) {
      result.rows.forEach((record: any) => {
        const checkInDate = new Date(record.check_in_time);
        const dayName = new Date(Date.UTC(checkInDate.getUTCFullYear(), checkInDate.getUTCMonth(), checkInDate.getUTCDate()))
          .toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }).substring(0, 3);
        if (dailyCounts.has(dayName)) {
          dailyCounts.set(dayName, (dailyCounts.get(dayName) || 0) + 1);
        }
      });
    }

    daysOfWeek.forEach(dayName => {
      trends.push({ date: dayName, count: dailyCounts.get(dayName) || 0 });
    });

    return { trends };

  } catch (e: any) {
    console.error("Trends Fetch Error:", e);
    return { trends: [], error: 'Failed to fetch check-in trends.' };
  }
}
