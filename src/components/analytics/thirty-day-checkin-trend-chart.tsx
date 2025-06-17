
'use client';

import { useState, useEffect } from 'react';
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, AlertCircle } from 'lucide-react';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { getThirtyDayCheckInTrend } from '@/app/actions/analytics-actions';
import { Skeleton } from '@/components/ui/skeleton';

interface DailyCheckin {
  date: string; 
  count: number;
}

const chartConfig = {
  checkins: {
    label: "Check-ins",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function ThirtyDayCheckinTrendChart() {
  const [chartData, setChartData] = useState<DailyCheckin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gymDbId, setGymDbId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const id = localStorage.getItem('gymDatabaseId');
      setGymDbId(id);
    }
  }, []);
  
  useEffect(() => {
    if (!gymDbId) {
      setIsLoading(false);
      // setError("Gym ID not found. Cannot load 30-day trend.");
      setChartData([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    getThirtyDayCheckInTrend(gymDbId)
      .then(response => {
        if (response.error) {
          setError(response.error);
          setChartData([]);
        } else {
          setChartData(response.data);
        }
      })
      .catch(err => {
        console.error("ThirtyDayCheckinTrendChart fetch error:", err);
        setError("Failed to load 30-day check-in trend data.");
        setChartData([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [gymDbId]);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">30-Day Check-in Trend</CardTitle>
           <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <CardDescription>Daily member check-ins over the past 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[300px] w-full flex items-center justify-center">
            <Skeleton className="h-full w-full" />
          </div>
        ) : error ? (
          <div className="h-[300px] w-full flex flex-col items-center justify-center text-destructive">
            <AlertCircle className="h-12 w-12 mb-2" />
            <p className="text-sm text-center">Error loading 30-day trend.</p>
            <p className="text-xs text-center mt-1">{error}</p>
          </div>
        ) : chartData.length === 0 && !isLoading ? (
           <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground">
            No check-in data available for the last 30 days for this gym.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.5)" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={10} 
                  interval="preserveStartEnd" 
                  tickFormatter={(value, index) => index % 4 === 0 || index === chartData.length -1 ? value : ''} // Show fewer ticks
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                  allowDecimals={false}
                  domain={[0, 'dataMax + 10']} 
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" hideIndicator={false} />}
                   formatter={(value, name, props) => [`${value} check-ins on ${props.payload.date}`, null]}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="var(--color-checkins)"
                  strokeWidth={2}
                  dot={{ r: 2, fill: "var(--color-checkins)", strokeWidth:1, stroke: "hsl(var(--background))" }}
                  activeDot={{ r: 4, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

    
