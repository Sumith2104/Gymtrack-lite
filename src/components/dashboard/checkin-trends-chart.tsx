
'use client';

import { useState, useEffect } from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { DailyCheckIns } from '@/lib/types';
import { CalendarDays, AlertCircle } from 'lucide-react';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { getDailyCheckInTrends } from '@/app/actions/dashboard-actions';
import { Skeleton } from '@/components/ui/skeleton';

const chartConfig = {
  checkIns: {
    label: "Check-ins",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export function CheckinTrendsChart({ className }: { className?: string }) {
  const [chartData, setChartData] = useState<DailyCheckIns[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gymDbId, setGymDbId] = useState<string | null>(null);

  const fetchAndSetTrends = async (id: string) => {
    const data = await getDailyCheckInTrends(id);
    if (data.error) {
      setError(data.error);
      const emptyDays: DailyCheckIns[] = Array(7).fill(null).map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return { date: date.toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 3), count: 0 };
      });
      setChartData(emptyDays);
    } else {
      setChartData(data.trends);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const id = localStorage.getItem('gymDatabaseId');
      setGymDbId(id);

      if (id) {
        setIsLoading(true);
        setError(null);
        fetchAndSetTrends(id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
        const emptyDays: DailyCheckIns[] = Array(7).fill(null).map((_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return { date: date.toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 3), count: 0 };
        });
        setChartData(emptyDays);
      }
    }
  }, []);

  return (
    <Card className={cn("shadow-lg", className)}>
      <CardHeader>
        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-semibold">Daily Check-in Trends</CardTitle>
          <CalendarDays className="h-5 w-5 text-primary" />
        </div>
        <CardDescription className="text-xs">Member check-ins over the last 7 days.</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        {isLoading ? (
          <div className="h-[250px] w-full flex items-center justify-center">
            <Skeleton className="h-full w-full" />
          </div>
        ) : error ? (
          <div className="h-[250px] w-full flex flex-col items-center justify-center text-destructive">
            <AlertCircle className="h-12 w-12 mb-2" />
            <p className="text-sm text-center">Error loading trends.</p>
            <p className="text-xs text-center mt-1">{error}</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 0, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.3)" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={10}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={10}
                  stroke="hsl(var(--muted-foreground))"
                  domain={[0, 'dataMax + 10']}
                  allowDecimals={false}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="line" hideLabel hideIndicator={false} />}
                  formatter={(value, name, props) => [`${value} check-ins`, null]}
                />
                <Bar dataKey="count" fill="var(--color-checkIns)" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
