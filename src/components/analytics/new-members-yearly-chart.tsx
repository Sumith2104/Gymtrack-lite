
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users } from 'lucide-react'; // Using Users icon for group
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface YearlyNewMembers {
  year: string;
  count: number;
}

// Generate mock data for new members per year for the past 5 years
const generateYearlyNewMembersData = (): YearlyNewMembers[] => {
  const data: YearlyNewMembers[] = [];
  const currentYear = new Date().getFullYear();
  for (let i = 4; i >= 0; i--) { // Past 5 years including current (or up to last year if preferred)
    const year = currentYear - i;
    data.push({
      year: year.toString(),
      // Simulate growth trend, could be more random
      count: Math.floor(Math.random() * 150) + 50 + ( (4-i) * 20), 
    });
  }
  return data;
};

const chartData: YearlyNewMembers[] = generateYearlyNewMembersData();

const chartConfig = {
  annualNewMembers: {
    label: "New Members",
    color: "hsl(var(--chart-3))", // Use another chart color
  },
} satisfies ChartConfig;

export function NewMembersYearlyChart() {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Yearly New Members Trend</CardTitle>
           <Users className="h-5 w-5 text-primary" />
        </div>
        <CardDescription>Total new members acquired each year (Past 5 Years)</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 0, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.3)" />
              <XAxis
                dataKey="year"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={12}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis 
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={12}
                stroke="hsl(var(--muted-foreground))"
                allowDecimals={false}
                domain={[0, 'dataMax + 50']} 
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" hideLabel />}
                formatter={(value, name, props) => [`${value} new members in ${props.payload.year}`, null]}
              />
              <Bar dataKey="count" fill="var(--color-annualNewMembers)" radius={[4, 4, 0, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

    