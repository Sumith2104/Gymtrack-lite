
'use server';

import type { Member, MembershipType } from '@/lib/types';
import { subDays, format, getMonth, getYear, parseISO } from 'date-fns';

// Consistent mock data source for analytics, simulating a database.
// Ensures that members data used for analytics is from a single source related to their gymId.
const MOCK_MEMBERS_ANALYTICS_SOURCE: Member[] = [
  // Gym UOFIPOIB
  { id: 'member_uuid_1', memberId: 'SUMI0493P', name: 'Sumith Analyst', email: 'sumith.analyst@example.com', membershipStatus: 'active', gymId: 'UOFIPOIB', createdAt: "2023-01-10T00:00:00.000Z", joinDate: "2023-01-15T00:00:00.000Z", expiryDate: new Date(Date.now() + 86400000 * 355).toISOString(), phoneNumber: '8310870493', membershipType: 'Premium', planPrice: 300, age: 21 },
  { id: 'member_uuid_4', memberId: 'MBR004', name: 'David Report', email: 'david.report@example.com', membershipStatus: 'active', gymId: 'UOFIPOIB', createdAt: "2024-02-01T00:00:00.000Z", joinDate: "2024-02-20T00:00:00.000Z", expiryDate: new Date(Date.now() + 86400000 * 10).toISOString(), phoneNumber: '345-678-9012', membershipType: '6-Month', planPrice: 150, age: 22 },
  { id: 'member_uuid_5', memberId: 'MBR005', name: 'Eva Insight', email: 'eva.insight@example.com', membershipStatus: 'active', gymId: 'UOFIPOIB', createdAt: "2024-03-05T00:00:00.000Z", joinDate: "2024-03-10T00:00:00.000Z", expiryDate: new Date(Date.now() + 86400000 * 30).toISOString(), phoneNumber: '555-555-5555', membershipType: 'Annual', planPrice: 500, age: 30 },
  { id: 'member_uuid_8', memberId: 'MBR008', name: 'Recent Stat', email: 'recent.stat@example.com', membershipStatus: 'active', gymId: 'UOFIPOIB', createdAt: subDays(new Date(), 5).toISOString(), joinDate: subDays(new Date(), 5).toISOString(), expiryDate: new Date(Date.now() + 86400000 * 25).toISOString(), phoneNumber: '777-888-9999', membershipType: 'Monthly', planPrice: 30, age: 28 },
  { id: 'member_uuid_9', memberId: 'MBR009', name: 'Uofi Trendsetter', email: 'uofi.trend@example.com', membershipStatus: 'active', gymId: 'UOFIPOIB', createdAt: "2022-11-15T00:00:00.000Z", joinDate: "2022-11-15T00:00:00.000Z", expiryDate: new Date(Date.now() + 86400000 * 150).toISOString(), phoneNumber: '777-111-9999', membershipType: 'Annual', planPrice: 480, age: 33 },


  // Gym GYM123_default
  { id: 'member_uuid_2', memberId: 'MBR002', name: 'Bob Metric', email: 'bob.metric@example.com', membershipStatus: 'inactive', gymId: 'GYM123_default', createdAt: "2023-11-20T00:00:00.000Z", joinDate: "2023-12-01T00:00:00.000Z", phoneNumber: '234-567-8901', membershipType: 'Monthly', planPrice: 30, age: 35 },
  { id: 'member_uuid_3', memberId: 'MBR003', name: 'Carol Graph', email: 'carol.graph@example.com', membershipStatus: 'expired', gymId: 'GYM123_default', createdAt: "2023-04-10T00:00:00.000Z", joinDate: "2023-05-10T00:00:00.000Z", expiryDate: new Date(Date.now() - 86400000 * 5).toISOString(), membershipType: 'Other', planPrice: 30, age: 42 },
  { id: 'member_uuid_6', memberId: 'MBR006', name: 'Penny Data', email: 'penny.data@example.com', membershipStatus: 'pending', gymId: 'GYM123_default', createdAt: "2024-03-28T00:00:00.000Z", joinDate: "2024-04-01T00:00:00.000Z", phoneNumber: '456-789-0123', membershipType: 'Class Pass', planPrice: 100, age: 25 },
  { id: 'member_uuid_7', memberId: 'MBR007', name: 'Old Faithful', email: 'old.faithful@example.com', membershipStatus: 'active', gymId: 'GYM123_default', createdAt: "2022-01-10T00:00:00.000Z", joinDate: "2022-01-15T00:00:00.000Z", expiryDate: new Date(Date.now() + 86400000 * 100).toISOString(), phoneNumber: '111-222-3333', membershipType: 'Annual', planPrice: 280, age: 55 },
  { id: 'member_uuid_10', memberId: 'MBR010', name: 'Default User', email: 'default.user@example.com', membershipStatus: 'active', gymId: 'GYM123_default', createdAt: "2023-08-15T00:00:00.000Z", joinDate: "2023-08-15T00:00:00.000Z", expiryDate: new Date(Date.now() + 86400000 * 50).toISOString(), phoneNumber: '111-333-5555', membershipType: '6-Month', planPrice: 160, age: 40 },
];


export async function getMembershipDistribution(gymDatabaseId: string): Promise<{ data: Array<{ type: MembershipType; count: number }>; error?: string }> {
  if (!gymDatabaseId) return { data: [], error: 'Gym ID not provided.' };
  try {
    const gymMembers = MOCK_MEMBERS_ANALYTICS_SOURCE.filter(member => member.gymId === gymDatabaseId);
    const distribution: { [key: string]: number } = {}; // Use string for key initially

    gymMembers.forEach(member => {
      if (member.membershipType) {
        distribution[member.membershipType] = (distribution[member.membershipType] || 0) + 1;
      } else {
        distribution['Other'] = (distribution['Other'] || 0) + 1; // Count members with no type as 'Other'
      }
    });
    
    const result = Object.entries(distribution).map(([type, count]) => ({
      type: type as MembershipType, // Cast to MembershipType
      count: count || 0,
    }));
    
    return { data: result };
  } catch (e: any) {
    console.error('Error in getMembershipDistribution:', e.message);
    return { data: [], error: e.message || 'Failed to fetch membership distribution.' };
  }
}


export async function getThirtyDayCheckInTrend(gymDatabaseId: string): Promise<{ data: Array<{ date: string; count: number }>; error?: string }> {
  if (!gymDatabaseId) return { data: [], error: 'Gym ID not provided.' };
  try {
    const trends: Array<{ date: string; count: number }> = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = subDays(today, i);
      // Simulate some variation based on gymId - very basic
      const baseCount = gymDatabaseId === 'UOFIPOIB' ? Math.floor(Math.random() * 20) + 30 : Math.floor(Math.random() * 15) + 10; // UOFIPOIB generally busier
      trends.push({
        date: format(date, 'MMM dd'),
        count: Math.max(5, baseCount + Math.floor(Math.random() * (i/2 + 5)) - (i/3) ), // Simulate some daily variation and slight downward trend further back
      });
    }
    return { data: trends };
  } catch (e: any) {
    console.error('Error in getThirtyDayCheckInTrend:', e.message);
    return { data: [], error: e.message || 'Failed to fetch 30-day check-in trend.' };
  }
}

export async function getNewMembersMonthly(gymDatabaseId: string): Promise<{ data: Array<{ month: string; count: number }>; error?: string }> {
  if (!gymDatabaseId) return { data: [], error: 'Gym ID not provided.' };
  try {
    const gymMembers = MOCK_MEMBERS_ANALYTICS_SOURCE.filter(member => member.gymId === gymDatabaseId);
    const monthlyData: { [key: number]: number } = {}; // Key is month index 0-11
    const currentYear = getYear(new Date());
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (let i = 0; i < 12; i++) {
        monthlyData[i] = 0; // Initialize all months for current year
    }

    gymMembers.forEach(member => {
      if (member.joinDate) {
        const joinDate = parseISO(member.joinDate); // Ensure date is parsed correctly
        if (getYear(joinDate) === currentYear) {
          const month = getMonth(joinDate); // 0-11
          monthlyData[month] = (monthlyData[month] || 0) + 1;
        }
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
  try {
    const gymMembers = MOCK_MEMBERS_ANALYTICS_SOURCE.filter(member => member.gymId === gymDatabaseId);
    const yearlyData: { [key: string]: number } = {};
    const currentFullYear = getYear(new Date());

    for (let i = 4; i >= 0; i--) { // Past 5 years including current
      const year = currentFullYear - i;
      yearlyData[year.toString()] = 0; 
    }
    
    gymMembers.forEach(member => {
      if (member.joinDate) {
        const joinDate = parseISO(member.joinDate);
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

    