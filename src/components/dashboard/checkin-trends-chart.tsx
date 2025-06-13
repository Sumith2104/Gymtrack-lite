'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { DailyCheckIns } from '@/lib/types';
import { CalendarDays } from 'lucide-react'; // Changed from TrendingUp to match image
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { cn } from '@/lib/utils';

const chartData: DailyCheckIns[] = Array.from({ length: 7 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (6 - i));
  return {
    date: date.toLocaleDateString('en-US', { weekday: 'short' }), // Use short day name like "Sat"
    count: Math.floor(Math.random() * 80) + 20, 
  };
}).map(item => ({ ...item, date: item.date.substring(0, 3) })); // Ensure consistent "Sat", "Sun"

const chartConfig = {
  checkIns: {
    label: "Check-ins",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export function CheckinTrendsChart({ className }: { className?: string }) {
  return (
    <Card className={cn("shadow-lg", className)}>
      <CardHeader>
        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-semibold">Daily Check-in Trends</CardTitle>
          <CalendarDays className="h-5 w-5 text-primary" />
        </div>
        <CardDescription className="text-xs">Number of member check-ins over the last 7 days.</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
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
                domain={[0, 'dataMax + 10']} // Give some space at the top
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" hideLabel />}
                formatter={(value, name, props) => [`${value} check-ins`, null]}
              />
              <Bar dataKey="count" fill="var(--color-checkIns)" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
