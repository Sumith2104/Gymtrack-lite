'use client';

import { useSearchParams } from 'next/navigation';
import { MembershipDistributionData, MembershipDistributionChart } from '@/components/analytics/membership-distribution-chart';
import { YearlyNewMembers, NewMembersYearlyChart } from '@/components/analytics/new-members-yearly-chart';
import { CheckinTrendsChart } from '@/components/dashboard/checkin-trends-chart';
import type { DailyCheckIns } from '@/lib/types';
import type { ChartConfig } from '@/components/ui/chart';

export function AnalyticsClientPage({
  initialDistribution,
  initialDistributionConfig,
  initialYearly,
  initialTrends
}: {
  initialDistribution?: MembershipDistributionData[];
  initialDistributionConfig?: ChartConfig;
  initialYearly?: YearlyNewMembers[];
  initialTrends?: DailyCheckIns[];
}) {
  const searchParams = useSearchParams();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <MembershipDistributionChart
        initialData={initialDistribution}
        initialConfig={initialDistributionConfig}
      />
      <NewMembersYearlyChart initialData={initialYearly} />
      <div className="lg:col-span-2">
        <CheckinTrendsChart initialTrends={initialTrends} />
      </div>
    </div>
  );
}
