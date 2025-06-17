
'use client';

import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { OccupancyData } from '@/lib/types';
import { Activity } from 'lucide-react';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

const chartData: OccupancyData[] = [
  { time: '9 AM', count: 10 }, { time: '10 AM', count: 15 }, { time: '11 AM', count: 25 },
  { time: '12 PM', count: 30 }, { time: '1 PM', count: 22 }, { time: '2 PM', count: 18 },
  { time: '3 PM', count: 20 }, { time: '4 PM', count: 28 }, { time: '5 PM', count: 40 },
  { time: '6 PM', count: 45 }, { time: '7 PM', count: 35 }, { time: '8 PM', count: 25 },
];

const chartConfig = {
  occupancy: {
    label: "Occupancy",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export function OccupancyChart() {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Hourly Occupancy Trend</CardTitle>
           <Activity className="h-5 w-5 text-primary" />
        </div>
        <CardDescription>Typical gym usage throughout the day</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.5)" />
              <XAxis
                dataKey="time"
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
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" hideIndicator={false} />}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="var(--color-occupancy)"
                strokeWidth={2}
                dot={{ r: 4, fill: "var(--color-occupancy)", strokeWidth:2, stroke: "var(--background)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
