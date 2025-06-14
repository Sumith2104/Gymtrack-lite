
'use client';

import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { subDays, format } from 'date-fns';

interface DailyCheckin {
  date: string; // Format: "MMM dd"
  count: number;
}

// Generate mock data for the last 30 days
const generateThirtyDayData = (): DailyCheckin[] => {
  const data: DailyCheckin[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = subDays(today, i);
    data.push({
      date: format(date, 'MMM dd'),
      count: Math.floor(Math.random() * 80) + 10, // Random count between 10 and 90
    });
  }
  return data;
};

const chartData: DailyCheckin[] = generateThirtyDayData();

const chartConfig = {
  checkins: {
    label: "Check-ins",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function ThirtyDayCheckinTrendChart() {
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
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.5)" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={10} // Smaller font for more ticks
                interval="preserveStartEnd" // Show start and end, let recharts decide middle
              />
              <YAxis 
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={12}
                domain={[0, 'dataMax + 20']} // Add some padding to Y-axis
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
                 formatter={(value, name, props) => [`${value} check-ins on ${props.payload.date}`, null]}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="var(--color-checkins)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--color-checkins)", strokeWidth:1, stroke: "hsl(var(--background))" }}
                activeDot={{ r: 5, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

    