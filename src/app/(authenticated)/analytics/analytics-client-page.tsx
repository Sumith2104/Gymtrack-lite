
'use client';

import { useSearchParams } from 'next/navigation';
import { MembershipDistributionChart } from '@/components/analytics/membership-distribution-chart';
import { NewMembersYearlyChart } from '@/components/analytics/new-members-yearly-chart';
import { CheckinTrendsChart } from '@/components/dashboard/checkin-trends-chart';

export function AnalyticsClientPage() {
  // This hook needs to be wrapped in a Suspense boundary.
  const searchParams = useSearchParams();

  // You can use searchParams for filtering later, e.g.
  // const dateRange = searchParams.get('range');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <MembershipDistributionChart />
      <NewMembersYearlyChart />
      <div className="lg:col-span-2">
        {/* We can re-use this chart here for more detailed daily trends */}
        <CheckinTrendsChart />
      </div>
    </div>
  );
}
