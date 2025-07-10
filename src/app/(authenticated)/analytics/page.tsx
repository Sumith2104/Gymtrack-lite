
import { Suspense } from 'react';
import { AnalyticsClientPage } from './analytics-client-page';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, Database } from 'lucide-react';
import { DataRequestForm } from '@/components/analytics/data-request-form';
import { Separator } from '@/components/ui/separator';

export default function AnalyticsPage() {
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
        <AnalyticsClientPage />
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
