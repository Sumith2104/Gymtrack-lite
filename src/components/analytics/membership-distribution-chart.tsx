'use client';

import { Pie, PieChart, ResponsiveContainer, Cell, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { MembershipDistribution } from '@/lib/types';
import { PieChart as PieChartIcon } from 'lucide-react';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';


const chartData: MembershipDistribution[] = [
  { status: 'Active', count: 150 },
  { status: 'Inactive', count: 30 },
  { status: 'Expired', count: 20 },
];

const chartConfig = {
  members: {
    label: "Members",
  },
  active: {
    label: "Active",
    color: "hsl(var(--chart-1))",
  },
  inactive: {
    label: "Inactive",
    color: "hsl(var(--chart-2))",
  },
  expired: {
    label: "Expired",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;


export function MembershipDistributionChart() {
  return (
    <Card className="shadow-lg">
      <CardHeader>
         <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Membership Status Distribution</CardTitle>
            <PieChartIcon className="h-5 w-5 text-primary" />
        </div>
        <CardDescription>Overview of member statuses</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie
                data={chartData}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={60}
                labelLine={false}
                // label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                //   const RADIAN = Math.PI / 180;
                //   const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                //   const x = cx + radius * Math.cos(-midAngle * RADIAN);
                //   const y = cy + radius * Math.sin(-midAngle * RADIAN);
                //   return (
                //     <text x={x} y={y} fill="hsl(var(--foreground))" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
                //       {`${(percent * 100).toFixed(0)}%`}
                //     </text>
                //   );
                // }}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={chartConfig[entry.status.toLowerCase() as keyof typeof chartConfig]?.color || "hsl(var(--muted))"} />
                ))}
              </Pie>
               <ChartLegend content={<ChartLegendContent nameKey="status" />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
