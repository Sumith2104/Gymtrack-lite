
'use client';

import { useState, useEffect } from 'react';
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UserPlus, AlertCircle } from 'lucide-react';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { getNewMembersMonthly } from '@/app/actions/analytics-actions';
import { Skeleton } from '@/components/ui/skeleton';

interface MonthlyNewMembers {
  month: string; 
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
      setChartData(Array(12).fill(0).map((_, i) => ({ month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i], count: 0 })));
      return;
    }

    setIsLoading(true);
    setError(null);
    getNewMembersMonthly(gymDbId)
      .then(response => {
        if (response.error) {
          setError(response.error);
          setChartData(Array(12).fill(0).map((_, i) => ({ month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i], count: 0 })));
        } else {
          setChartData(response.data);
        }
      })
      .catch(err => {
        
        setError("Failed to load monthly new members data.");
        setChartData(Array(12).fill(0).map((_, i) => ({ month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i], count: 0 })));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [gymDbId]);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">New Members Per Month (Current Year)</CardTitle>
           <UserPlus className="h-5 w-5 text-primary" />
        </div>
        <CardDescription>Number of new members who joined each month this year</CardDescription>
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
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.5)" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
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
                  dot={{ r: 3, fill: "var(--color-newMembers)", strokeWidth:1, stroke: "hsl(var(--background))" }}
                  activeDot={{ r: 5, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
