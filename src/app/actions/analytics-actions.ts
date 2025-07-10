
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
  startOfDay,
  endOfDay, 
  eachDayOfInterval,
  eachMonthOfInterval,
  eachYearOfInterval,
  isBefore,
  startOfMonth,
  endOfMonth,
  isValid
} from 'date-fns';
import { createSupabaseServerActionClient, createSupabaseServiceRoleClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { sendEmail } from '@/lib/email-service';
import { APP_NAME } from '@/lib/constants';
import * as z from 'zod';

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

// --- Data Export (CSV) Logic ---
const dataRequestSchema = z.object({
  reportType: z.string().min(1, 'Report type is required.'),
  dateRange: z.object({
    from: z.date({ required_error: 'A start date is required.' }),
    to: z.date({ required_error: 'An end date is required.' }),
  }).refine((data) => data.from <= data.to, {
    message: "Start date cannot be after end date.",
    path: ["from"],
  }),
});

export type DataRequestFormValues = z.infer<typeof dataRequestSchema>;

interface DataReportResponse {
  csvData?: string;
  error?: string;
}

// Helper to convert JSON array to CSV string
function convertToCSV(data: any[], headers: string[]): string {
  if (!data || data.length === 0) {
    return '';
  }
  
  const csvRows = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        let cell = row[header] === null || row[header] === undefined ? '' : String(row[header]);
        cell = cell.includes(',') ? `"${cell}"` : cell; // Escape commas
        return cell;
      }).join(',')
    )
  ];
  
  return csvRows.join('\n');
}

export async function generateDataReportAction(
  formData: DataRequestFormValues,
  gymDatabaseId: string
): Promise<DataReportResponse> {
  const validationResult = dataRequestSchema.safeParse(formData);
  if (!validationResult.success) {
    return { error: 'Validation failed. Please check your inputs.' };
  }

  if (!gymDatabaseId) {
    return { error: 'Gym ID is missing. Cannot generate report.' };
  }
  
  const { reportType, dateRange } = validationResult.data;
  const supabase = createSupabaseServerActionClient();

  try {
    let records: any[] = [];
    let headers: string[] = [];
    
    const rangeStart = startOfDay(dateRange.from);
    const rangeEnd = endOfDay(dateRange.to);

    switch (reportType) {
      case 'check_in_details': {
        const { data, error } = await supabase
          .from('check_ins')
          .select('check_in_time, check_out_time, members(name, member_id)')
          .eq('gym_id', gymDatabaseId)
          .gte('check_in_time', rangeStart.toISOString())
          .lte('check_in_time', rangeEnd.toISOString())
          .order('check_in_time', { ascending: false });

        if (error) throw new Error(`DB Error: ${error.message}`);
        
        headers = ['member_name', 'member_id', 'check_in_time', 'check_out_time'];
        records = data.map(r => ({
          member_name: r.members?.name || 'N/A',
          member_id: r.members?.member_id || 'N/A',
          check_in_time: format(parseISO(r.check_in_time), 'yyyy-MM-dd HH:mm:ss'),
          check_out_time: r.check_out_time ? format(parseISO(r.check_out_time), 'yyyy-MM-dd HH:mm:ss') : 'N/A',
        }));
        break;
      }

      case 'members_joined': {
        const { data, error } = await supabase
          .from('members')
          .select('name, member_id, join_date, membership_type, plans(price)')
          .eq('gym_id', gymDatabaseId)
          .gte('join_date', rangeStart.toISOString())
          .lte('join_date', rangeEnd.toISOString())
          .order('join_date', { ascending: false });
        
        if (error) throw new Error(`DB Error: ${error.message}`);
        
        headers = ['member_name', 'member_id', 'join_date', 'plan_name', 'plan_price'];
        records = data.map(r => ({
          member_name: r.name,
          member_id: r.member_id,
          join_date: r.join_date ? format(parseISO(r.join_date), 'yyyy-MM-dd') : 'N/A',
          plan_name: r.membership_type,
          plan_price: r.plans?.price ?? 0,
        }));
        break;
      }
      
      default:
        return { error: 'Invalid report type specified.' };
    }
    
    if (records.length === 0) {
      return { error: 'No data found for the selected criteria.' };
    }

    const csvData = convertToCSV(records, headers);
    return { csvData };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { error: `Server error: ${errorMessage}` };
  }
}
