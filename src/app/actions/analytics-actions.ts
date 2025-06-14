
'use server';

import type { Member, MembershipType, DailyCheckIns } from '@/lib/types';
import { subDays, format, getMonth, getYear, parseISO, startOfYear, endOfYear, startOfToday } from 'date-fns';
import { createSupabaseServerActionClient } from '@/lib/supabase/server';

// Helper to map DB row to Member type (if needed, usually for complex joins not done here)
// For analytics, we often just need specific fields.

export async function getMembershipDistribution(gymDatabaseId: string): Promise<{ data: Array<{ type: MembershipType | string; count: number }>; error?: string }> {
  if (!gymDatabaseId) return { data: [], error: 'Gym ID not provided.' };
  const supabase = createSupabaseServerActionClient();
  try {
    // Fetch all members for the gym, then aggregate client-side (or server-side in JS)
    const { data: gymMembers, error: memberError } = await supabase
      .from('members')
      .select('membership_type')
      .eq('gym_id', gymDatabaseId)
      .eq('membership_status', 'active'); // Consider if you want only active members for distribution

    if (memberError) throw memberError;
    if (!gymMembers) return { data: [] };

    const distribution: { [key: string]: number } = {};
    gymMembers.forEach(member => {
      const type = member.membership_type || 'Other';
      distribution[type] = (distribution[type] || 0) + 1;
    });
    
    const result = Object.entries(distribution).map(([type, count]) => ({
      type: type as MembershipType, // Cast, assuming membership_type in DB matches MembershipType
      count: count || 0,
    }));
    
    return { data: result };
  } catch (e: any) {
    console.error('Error in getMembershipDistribution:', e.message);
    return { data: [], error: e.message || 'Failed to fetch membership distribution.' };
  }
}


export async function getThirtyDayCheckInTrend(gymDatabaseId: string): Promise<{ data: DailyCheckIns[]; error?: string }> {
  if (!gymDatabaseId) return { data: [], error: 'Gym ID not provided.' };
  const supabase = createSupabaseServerActionClient();
  try {
    const thirtyDaysAgo = subDays(startOfToday(), 29).toISOString(); // Start of 30 days ago
    const todayEnd = new Date().toISOString(); // End of today

    const { data: checkIns, error: checkInError } = await supabase
      .from('check_ins')
      .select('check_in_time')
      .eq('gym_id', gymDatabaseId)
      .gte('check_in_time', thirtyDaysAgo)
      .lte('check_in_time', todayEnd);

    if (checkInError) throw checkInError;
    if (!checkIns) return { data: [] };

    const trendsMap = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
        const date = subDays(new Date(), i);
        trendsMap.set(format(date, 'MMM dd'), 0);
    }

    checkIns.forEach(record => {
      const dateStr = format(parseISO(record.check_in_time), 'MMM dd');
      if (trendsMap.has(dateStr)) {
        trendsMap.set(dateStr, (trendsMap.get(dateStr) || 0) + 1);
      }
    });
    
    const result: DailyCheckIns[] = Array.from(trendsMap, ([date, count]) => ({ date, count }));
    return { data: result };
  } catch (e: any) {
    console.error('Error in getThirtyDayCheckInTrend:', e.message);
    return { data: [], error: e.message || 'Failed to fetch 30-day check-in trend.' };
  }
}

export async function getNewMembersMonthly(gymDatabaseId: string): Promise<{ data: Array<{ month: string; count: number }>; error?: string }> {
  if (!gymDatabaseId) return { data: [], error: 'Gym ID not provided.' };
  const supabase = createSupabaseServerActionClient();
  try {
    const currentYearStart = startOfYear(new Date()).toISOString();
    const currentYearEnd = endOfYear(new Date()).toISOString();

    const { data: members, error: memberError } = await supabase
      .from('members')
      .select('join_date')
      .eq('gym_id', gymDatabaseId)
      .gte('join_date', currentYearStart)
      .lte('join_date', currentYearEnd);

    if (memberError) throw memberError;
    if (!members) return { data: [] };
    
    const monthlyData: { [key: number]: number } = {}; // Key is month index 0-11
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let i = 0; i < 12; i++) monthlyData[i] = 0;

    members.forEach(member => {
      if (member.join_date) {
        const joinDate = parseISO(member.join_date);
        const month = getMonth(joinDate); // 0-11
        monthlyData[month] = (monthlyData[month] || 0) + 1;
      }
    });

    const result = monthNames.map((name, index) => ({
      month: name,
      count: monthlyData[index] || 0,
    }));
    
    return { data: result };
  } catch (e: any) {
    console.error('Error in getNewMembersMonthly:', e.message);
    return { data: [], error: e.message || 'Failed to fetch new members monthly.' };
  }
}

export async function getNewMembersYearly(gymDatabaseId: string): Promise<{ data: Array<{ year: string; count: number }>; error?: string }> {
  if (!gymDatabaseId) return { data: [], error: 'Gym ID not provided.' };
  const supabase = createSupabaseServerActionClient();
  try {
    const fiveYearsAgoStart = startOfYear(subDays(new Date(), 365 * 5)).toISOString(); // Approximation
    const currentYearEnd = endOfYear(new Date()).toISOString();

    const { data: members, error: memberError } = await supabase
      .from('members')
      .select('join_date')
      .eq('gym_id', gymDatabaseId)
      .gte('join_date', fiveYearsAgoStart)
      .lte('join_date', currentYearEnd);

    if (memberError) throw memberError;
    if (!members) return { data: [] };

    const yearlyData: { [key: string]: number } = {};
    const currentFullYear = getYear(new Date());
    for (let i = 4; i >= 0; i--) {
      yearlyData[(currentFullYear - i).toString()] = 0; 
    }
    
    members.forEach(member => {
      if (member.join_date) {
        const joinDate = parseISO(member.join_date);
        const year = getYear(joinDate).toString();
        if (yearlyData.hasOwnProperty(year)) { 
             yearlyData[year] = (yearlyData[year] || 0) + 1;
        }
      }
    });

    const result = Object.entries(yearlyData).map(([year, count]) => ({
      year,
      count,
    })).sort((a,b) => parseInt(a.year) - parseInt(b.year));

    return { data: result };
  } catch (e: any) {
    console.error('Error in getNewMembersYearly:', e.message);
    return { data: [], error: e.message || 'Failed to fetch new members yearly.' };
  }
}
