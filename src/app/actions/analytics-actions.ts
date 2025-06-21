
'use server';

import type { Member, MembershipType, DailyCheckIns } from '@/lib/types';
import { 
  subDays, 
  format, 
  getMonth as getMonthFns, 
  getYear as getYearFns, 
  parseISO, 
  startOfYear, 
  endOfYear, 
  startOfToday, 
  eachDayOfInterval,
  eachMonthOfInterval,
  eachYearOfInterval,
  isBefore,
  startOfMonth,
  endOfMonth,
  isValid
} from 'date-fns';
import { createSupabaseServerActionClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

// Helper to get gym creation date
async function getGymCreationDate(gymDatabaseId: string, supabase: SupabaseClient<Database>): Promise<Date | null> {
  if (!gymDatabaseId) return null;
  const { data: gymData, error: gymError } = await supabase
    .from('gyms')
    .select('created_at')
    .eq('id', gymDatabaseId)
    .single();

  if (gymError || !gymData?.created_at) {
    return null;
  }
  try {
    const parsedDate = parseISO(gymData.created_at);
    return isValid(parsedDate) ? parsedDate : null;
  } catch (e) {
    return null;
  }
}

export async function getMembershipDistribution(gymDatabaseId: string): Promise<{ data: Array<{ type: MembershipType | string; count: number }>; error?: string }> {
  if (!gymDatabaseId) return { data: [], error: 'Gym ID not provided.' };
  const supabase = createSupabaseServerActionClient();
  try {
    
    const { data: gymMembers, error: memberError } = await supabase
      .from('members')
      .select('membership_type')
      .eq('gym_id', gymDatabaseId)
      .eq('membership_status', 'active'); 

    if (memberError) throw memberError;
    if (!gymMembers) return { data: [] };

    const distribution: { [key: string]: number } = {};
    gymMembers.forEach(member => {
      const type = member.membership_type || 'Other';
      distribution[type] = (distribution[type] || 0) + 1;
    });
    
    const result = Object.entries(distribution).map(([type, count]) => ({
      type: type as MembershipType, 
      count: count || 0,
    }));
    
    return { data: result };
  } catch (e: any) {
    return { data: [], error: e.message || 'Failed to fetch membership distribution.' };
  }
}

export async function getNewMembersYearly(gymDatabaseId: string): Promise<{ data: Array<{ year: string; count: number }>; error?: string }> {
  if (!gymDatabaseId) return { data: [], error: 'Gym ID not provided.' };
  const supabase = createSupabaseServerActionClient();
  try {
    const gymCreationDate = await getGymCreationDate(gymDatabaseId, supabase);
    if (!gymCreationDate) {
      return { data: [], error: 'Could not determine gym creation date.' };
    }

    const startYearDate = startOfYear(gymCreationDate);
    const endYearDate = endOfYear(new Date());

    if (isBefore(endYearDate, startYearDate)) {
        return { data: [], error: 'Gym creation date is in a future year. No data available.' };
    }

    const { data: members, error: memberError } = await supabase
      .from('members')
      .select('join_date')
      .eq('gym_id', gymDatabaseId)
      .gte('join_date', startYearDate.toISOString())
      .lte('join_date', endYearDate.toISOString());

    if (memberError) throw memberError;
    if (!members) return { data: [] };

    const yearlyDataMap = new Map<string, number>();
    const intervalYears = eachYearOfInterval({ start: startYearDate, end: endYearDate });
    intervalYears.forEach(yearDate => {
      yearlyDataMap.set(format(yearDate, "yyyy"), 0);
    });
    
    members.forEach(member => {
      if (member.join_date) {
        const joinDate = parseISO(member.join_date);
        if (isValid(joinDate)) {
            const yearStr = format(joinDate, "yyyy");
            if (yearlyDataMap.has(yearStr)) {
                yearlyDataMap.set(yearStr, (yearlyDataMap.get(yearStr) || 0) + 1);
            }
        }
      }
    });

    const result = Array.from(yearlyDataMap, ([year, count]) => ({ year, count}))
                   .sort((a,b) => parseInt(a.year) - parseInt(b.year));

    return { data: result };
  } catch (e: any) {
    return { data: [], error: e.message || 'Failed to fetch new members yearly since creation.' };
  }
}

// Helper function to check date validity (already in date-utils, but good for local reference if needed)
function isValidDate(d: any): d is Date {
  return d instanceof Date && !isNaN(d.getTime());
}
