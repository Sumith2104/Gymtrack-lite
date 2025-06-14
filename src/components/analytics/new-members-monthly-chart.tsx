
'use client';

import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UserPlus } from 'lucide-react';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { format } from 'date-fns';

interface MonthlyNewMembers {
  month: string; // Format: "Jan", "Feb", etc.
  count: number;
}

// Generate mock data for new members per month for the current year
const generateMonthlyNewMembersData = (): MonthlyNewMembers[] => {
  const data: MonthlyNewMembers[] = [];
  const currentMonth = new Date().getMonth(); // 0-11
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  for (let i = 0; i <= 11; i++) { // Iterate through all 12 months
    data.push({
      month: monthNames[i],
      // Assign 0 for future months, random for past/current
      count: i <= currentMonth ? Math.floor(Math.random() * 20) + 5 : 0, 
    });
  }
  return data;
};

const chartData: MonthlyNewMembers[] = generateMonthlyNewMembersData();

const chartConfig = {
  newMembers: {
    label: "New Members",
    color: "hsl(var(--chart-2))", // Use a different chart color
  },
} satisfies ChartConfig;

export function NewMembersMonthlyChart() {
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
                content={<ChartTooltipContent indicator="dot" />}
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
      </CardContent>
    </Card>
  );
}

    