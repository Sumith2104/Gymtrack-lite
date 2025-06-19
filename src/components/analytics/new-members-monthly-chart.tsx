
'use client';

import { useState, useEffect } from 'react';
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UserPlus, AlertCircle } from 'lucide-react';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { getNewMembersMonthly } from '@/app/actions/analytics-actions';
import { Skeleton } from '@/components/ui/skeleton';

interface MonthlyNewMembers {
  month: string; // Format "MMM 'yy", e.g., "Jan '23"
  count: number;
}

const chartConfig = {
  newMembers: {
    label: "New Members",
    color: "hsl(var(--chart-2))", 
  },
} satisfies ChartConfig;

export function NewMembersMonthlyChart() {
  const [chartData, setChartData] = useState<MonthlyNewMembers[]>([]);
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
      setChartData([]);
      setError("Gym ID not found. Cannot load monthly new members data.");
      return;
    }

    setIsLoading(true);
    setError(null);
    getNewMembersMonthly(gymDbId)
      .then(response => {
        if (response.error) {
          setError(response.error);
          setChartData([]);
        } else {
          setChartData(response.data);
        }
      })
      .catch(err => {
        setError("Failed to load monthly new members data.");
        setChartData([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [gymDbId]);
  
  const tickFormatter = (value: string, index: number) => {
    if (chartData.length === 0) return '';
    // Show first, last, and roughly every Nth tick to avoid clutter
    const N = Math.max(1, Math.floor(chartData.length / 12)); // Aim for around 12 ticks if possible
    if (index === 0 || index === chartData.length - 1 || index % N === 0) {
      return value;
    }
    return '';
  };


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">New Members Per Month (Since Creation)</CardTitle>
           <UserPlus className="h-5 w-5 text-primary" />
        </div>
        <CardDescription>Number of new members who joined each month since gym creation</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[300px] w-full flex items-center justify-center">
            <Skeleton className="h-full w-full" />
          </div>
        ) : error ? (
          <div className="h-[300px] w-full flex flex-col items-center justify-center text-destructive">
            <AlertCircle className="h-12 w-12 mb-2" />
            <p className="text-sm text-center">Error loading monthly data.</p>
            <p className="text-xs text-center mt-1">{error}</p>
          </div>
        ) : chartData.length === 0 && !isLoading ? (
          <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground">
            No new member data available for this gym.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.5)" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={true}
                  tickMargin={8}
                  fontSize={10}
                  interval="preserveStartEnd"
                  tickFormatter={tickFormatter}
                  angle={chartData.length > 12 ? -30 : 0}
                  textAnchor={chartData.length > 12 ? "end" : "middle"}
                />
                <YAxis 
                  tickLine={false}
                  axisLine={true}
                  tickMargin={8}
                  fontSize={12}
                  allowDecimals={false}
                  domain={[0, 'dataMax + 5']}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" hideIndicator={false} />}
                  formatter={(value, name, props) => [`${value} new members in ${props.payload.month}`, null]}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="var(--color-newMembers)"
                  strokeWidth={2}
                  dot={{ r: chartData.length > 24 ? 0 : (chartData.length > 12 ? 1 : 2), fill: "var(--color-newMembers)", strokeWidth:1, stroke: "hsl(var(--background))" }}
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
```