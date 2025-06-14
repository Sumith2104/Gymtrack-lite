
import { OccupancyChart } from '@/components/analytics/occupancy-chart'; // Reused
import { MembershipDistributionChart } from '@/components/analytics/membership-distribution-chart'; // Will be updated for Type
import { CheckinTrendsChart } from '@/components/dashboard/checkin-trends-chart'; // Reused for 7-day

import { ThirtyDayCheckinTrendChart } from '@/components/analytics/thirty-day-checkin-trend-chart';
import { NewMembersMonthlyChart } from '@/components/analytics/new-members-monthly-chart';
import { NewMembersYearlyChart } from '@/components/analytics/new-members-yearly-chart';

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="mb-2">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">Gym Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Visual insights into your gym's performance and member trends.
        </p>
        <div className="mt-3 h-1 w-24 bg-primary rounded-full"></div>
      </div>

      {/* Row 1 */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <OccupancyChart /> {/* Pie */}
        <CheckinTrendsChart /> {/* Bar (7-day) */}
      </div>
      
      {/* Row 2 */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <MembershipDistributionChart /> {/* Pie (Membership Type) */}
        <ThirtyDayCheckinTrendChart /> {/* Line */}
      </div>

      {/* Row 3 */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <NewMembersMonthlyChart /> {/* Line */}
        <NewMembersYearlyChart /> {/* Bar */}
      </div>
    </div>
  );
}

    