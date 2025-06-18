
import { OccupancyCard } from '@/components/dashboard/occupancy-card'; // Reused from dashboard for Current Occupancy
import { CheckinTrendsChart } from '@/components/dashboard/checkin-trends-chart'; // Reused from dashboard for 7-day trends
import { MembershipDistributionChart } from '@/components/analytics/membership-distribution-chart';
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

      {/* Row 1: Current Occupancy & 7-Day Check-in Trends */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <OccupancyCard /> {/* Replaced OccupancyChart (hourly) with OccupancyCard (current) */}
        <CheckinTrendsChart />
      </div>
      
      {/* Row 2: Membership Distribution & 30-Day Check-in Trend */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <MembershipDistributionChart />
        <ThirtyDayCheckinTrendChart />
      </div>

      {/* Row 3: New Members Monthly & New Members Yearly */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <NewMembersMonthlyChart />
        <NewMembersYearlyChart />
      </div>
    </div>
  );
}
