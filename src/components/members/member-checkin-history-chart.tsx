
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react'; 
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { getMemberCheckinHistory } from '@/app/actions/member-actions';
import { Skeleton } from '@/components/ui/skeleton';
import type { MonthlyCheckin } from '@/lib/types';


const chartConfig = {
  checkins: {
    label: "Check-ins",
    color: "hsl(var(--chart-1))", 
  },
} satisfies ChartConfig;

export function MemberCheckinHistoryChart({ memberDbId }: { memberDbId: string }) {
  const [chartData, setChartData] = useState<MonthlyCheckin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChartData = useCallback(() => {
    if (!memberDbId) {
      setIsLoading(false);
      setChartData([]);
      setError("Member ID not provided.");
      return;
    }

    setIsLoading(true);
    setError(null);
    getMemberCheckinHistory(memberDbId)
      .then(response => {
        if (response.error) {
          setError(response.error);
          setChartData([]);
        } else if (response.data) {
          setChartData(response.data);
        }
      })
      .catch(err => {
        setError("Failed to load check-in history data.");
        setChartData([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [memberDbId]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  return (
    <div>
        {isLoading ? (
          <div className="h-[250px] w-full flex items-center justify-center">
            <Skeleton className="h-full w-full" />
          </div>
        ) : error ? (
          <div className="h-[250px] w-full flex flex-col items-center justify-center text-destructive">
            <AlertCircle className="h-12 w-12 mb-2" />
            <p className="text-sm text-center">Error loading history.</p>
            <p className="text-xs text-center mt-1">{error}</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[250px] w-full flex items-center justify-center text-muted-foreground">
            No check-in data available for this member.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.3)" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={true}
                  tickMargin={8}
                  fontSize={12}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis 
                  tickLine={false}
                  axisLine={true}
                  tickMargin={8}
                  fontSize={12}
                  stroke="hsl(var(--muted-foreground))"
                  allowDecimals={false}
                  domain={[0, 'dataMax + 5']} 
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="line" hideIndicator={false} />}
                  formatter={(value, name, props) => [`${value} check-ins in ${props.payload.month}`, null]}
                />
                <Bar dataKey="count" fill="var(--color-checkins)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
    </div>
  );
}
