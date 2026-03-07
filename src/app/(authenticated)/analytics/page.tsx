import { Suspense } from 'react';
import { AnalyticsClientPage } from './analytics-client-page';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3 } from 'lucide-react';
import { DataRequestForm } from '@/components/analytics/data-request-form';
import { Separator } from '@/components/ui/separator';
import { getServerSession } from '@/lib/auth-service';
import { getMembershipDistribution, getNewMembersYearly } from '@/app/actions/analytics-actions';
import { getDailyCheckInTrends } from '@/app/actions/dashboard-actions';
import type { ChartConfig } from '@/components/ui/chart';

export default async function AnalyticsPage() {
  const session = await getServerSession();
  const gymDbId = session.gymDatabaseId || '';

  // Parallel prefetching for all analytics data
  const [distRes, yearlyRes, trendsRes] = await Promise.all([
    getMembershipDistribution(gymDbId),
    getNewMembersYearly(gymDbId),
    getDailyCheckInTrends(gymDbId)
  ]);

  // Derive initial config for distribution chart on the server
  const initialDistConfig: ChartConfig = distRes.data?.reduce((acc: any, item: any, index: number) => {
    const key = (item.type as string).toLowerCase().replace(/\s+/g, '_') || `type_${index}`;
    acc[key] = {
      label: item.type,
      color: `hsl(var(--chart-${(index % 5) + 1}))`,
    };
    return acc;
  }, {} as ChartConfig) || {};

  return (
    <div className="flex flex-col gap-8">
      <div className="mb-2">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight flex items-center">
          <BarChart3 className="mr-3 h-8 w-8" />
          Analytics
        </h1>
        <p className="text-muted-foreground mt-1">
          Detailed insights into your gym's performance and member activity.
        </p>
        <div className="mt-3 h-1 w-24 bg-primary rounded-full"></div>
      </div>
      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsClientPage
          initialDistribution={distRes.data}
          initialDistributionConfig={initialDistConfig}
          initialYearly={yearlyRes.data}
          initialTrends={trendsRes.trends}
        />
      </Suspense>

      <Separator />

      <DataRequestForm />
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Skeleton className="h-[400px] w-full rounded-lg" />
      <Skeleton className="h-[400px] w-full rounded-lg" />
      <div className="lg:col-span-2">
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>
    </div>
  )
}
