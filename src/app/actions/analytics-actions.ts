'use server';

import type { MembershipType } from '@/lib/types';
import {
  format,
  parseISO,
  startOfYear,
  endOfYear,
  startOfDay,
  endOfDay,
  eachYearOfInterval,
  isBefore,
  isValid
} from 'date-fns';
import { flux } from '@/lib/flux/client';
import * as z from 'zod';

// Helper to get gym creation date
async function getGymCreationDate(gymDatabaseId: string): Promise<Date | null> {
  if (!gymDatabaseId) return null;
  try {
    const query = `SELECT created_at FROM gyms WHERE id = '${gymDatabaseId}'`;
    const result = await flux.sql(query);

    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    const gymData = result.rows[0];

    const parsedDate = parseISO(gymData.created_at);
    return isValid(parsedDate) ? parsedDate : null;
  } catch (e) {
    return null;
  }
}

export async function getMembershipDistribution(gymDatabaseId: string): Promise<{ data: Array<{ type: MembershipType | string; count: number }>; error?: string }> {
  if (!gymDatabaseId) return { data: [], error: 'Gym ID not provided.' };

  try {
    const query = `
      SELECT membership_type 
      FROM members 
      WHERE gym_id = '${gymDatabaseId}' 
      AND membership_status = 'active'
    `;
    const result = await flux.sql(query);
    const gymMembers = result.rows;

    if (!gymMembers) return { data: [] };

    const distribution: { [key: string]: number } = {};
    gymMembers.forEach((member: any) => {
      const type = member.membership_type || 'Other';
      distribution[type] = (distribution[type] || 0) + 1;
    });

    const finalResult = Object.entries(distribution).map(([type, count]) => ({
      type: type as MembershipType,
      count: count || 0,
    }));

    return { data: finalResult };
  } catch (e: any) {
    return { data: [], error: e.message || 'Failed to fetch membership distribution.' };
  }
}

export async function getNewMembersYearly(gymDatabaseId: string): Promise<{ data: Array<{ year: string; count: number }>; error?: string }> {
  if (!gymDatabaseId) return { data: [], error: 'Gym ID not provided.' };

  try {
    const gymCreationDate = await getGymCreationDate(gymDatabaseId);
    if (!gymCreationDate) {
      return { data: [], error: 'Could not determine gym creation date.' };
    }

    const startYearDate = startOfYear(gymCreationDate);
    const endYearDate = endOfYear(new Date());

    if (isBefore(endYearDate, startYearDate)) {
      return { data: [], error: 'Gym creation date is in a future year. No data available.' };
    }

    const query = `
      SELECT join_date 
      FROM members 
      WHERE gym_id = '${gymDatabaseId}' 
      AND join_date >= '${startYearDate.toISOString()}' 
      AND join_date <= '${endYearDate.toISOString()}'
    `;
    const result = await flux.sql(query);
    const members = result.rows;

    if (!members) return { data: [] };

    const yearlyDataMap = new Map<string, number>();
    const intervalYears = eachYearOfInterval({ start: startYearDate, end: endYearDate });
    intervalYears.forEach(yearDate => {
      yearlyDataMap.set(format(yearDate, "yyyy"), 0);
    });

    members.forEach((member: any) => {
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

    const finalResult = Array.from(yearlyDataMap, ([year, count]) => ({ year, count }))
      .sort((a, b) => parseInt(a.year) - parseInt(b.year));

    return { data: finalResult };
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

  try {
    let records: any[] = [];
    let headers: string[] = [];

    const rangeStart = startOfDay(dateRange.from);
    const rangeEnd = endOfDay(dateRange.to);

    switch (reportType) {
      case 'check_in_details': {
        const checkInQuery = `
          SELECT ci.check_in_time, ci.check_out_time, m.name, m.member_id
          FROM check_ins ci
          LEFT JOIN members m ON ci.member_table_id = m.id
          WHERE ci.gym_id = '${gymDatabaseId}' 
          AND ci.check_in_time >= '${rangeStart.toISOString()}' 
          AND ci.check_in_time <= '${rangeEnd.toISOString()}' 
          ORDER BY ci.check_in_time DESC
        `;
        const result = await flux.sql(checkInQuery);
        const data = result.rows || [];

        headers = ['member_name', 'member_id', 'check_in_time', 'check_out_time'];
        records = data.map((r: any) => ({
          member_name: r.name || 'N/A',
          member_id: r.member_id || 'N/A',
          check_in_time: format(parseISO(r.check_in_time), 'yyyy-MM-dd HH:mm:ss'),
          check_out_time: r.check_out_time ? format(parseISO(r.check_out_time), 'yyyy-MM-dd HH:mm:ss') : 'N/A',
        }));
        break;
      }

      case 'members_joined': {
        const membersQuery = `
          SELECT m.name, m.member_id, m.join_date, m.membership_type, p.price, p.plan_name
          FROM members m
          LEFT JOIN plans p ON m.plan_id = p.id
          WHERE m.gym_id = '${gymDatabaseId}' 
          AND m.join_date >= '${rangeStart.toISOString()}' 
          AND m.join_date <= '${rangeEnd.toISOString()}' 
          ORDER BY m.join_date DESC
        `;
        const result = await flux.sql(membersQuery);
        const data = result.rows || [];

        headers = ['member_name', 'member_id', 'join_date', 'plan_name', 'plan_price'];
        records = data.map((r: any) => ({
          member_name: r.name,
          member_id: r.member_id,
          join_date: r.join_date ? format(parseISO(r.join_date), 'yyyy-MM-dd') : 'N/A',
          plan_name: r.membership_type || r.plan_name || 'N/A',
          plan_price: r.price ?? 0,
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
