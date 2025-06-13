import { OccupancyChart } from '@/components/analytics/occupancy-chart';
import { MembershipDistributionChart } from '@/components/analytics/membership-distribution-chart';
import { CheckinTrendsChart } from '@/components/dashboard/checkin-trends-chart'; // Reusing from dashboard for consistency

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-headline font-semibold text-primary">Analytics</h1>
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <OccupancyChart />
        <MembershipDistributionChart />
      </div>
      <div className="grid gap-6">
         {/* Full width chart or another section */}
        <CheckinTrendsChart /> {/* Can be more detailed here or a different timeframe */}
      </div>
    </div>
  );
}
