
'use client';

import { Pie, PieChart, ResponsiveContainer, Cell, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users } from 'lucide-react'; // Changed icon to Users or similar
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import type { Member, MembershipType } from '@/lib/types'; // Assuming Member and MembershipType are defined
import { MOCK_MEMBERSHIP_PLANS } from '@/lib/constants'; // Use for types/labels

// Mock data - in a real app, aggregate this from your members data
// This should count members for each membershipType
const mockMemberDataForDistribution: { type: MembershipType, count: number }[] = [
  { type: 'Annual', count: 75 },
  { type: 'Monthly', count: 120 },
  { type: 'Premium', count: 40 }, // Assuming "Premium" can be distinct type or a version of Annual/Monthly
  { type: '6-Month', count: 30 },
  { type: 'Class Pass', count: 25 },
  { type: 'Other', count: 10 },
];

// Dynamically create chartConfig based on MOCK_MEMBERSHIP_PLANS or distinct types in data
const chartConfig = mockMemberDataForDistribution.reduce((acc, item, index) => {
  acc[item.type.toLowerCase().replace(/\s+/g, '_')] = { // e.g., 'class_pass'
    label: item.type,
    color: `hsl(var(--chart-${(index % 5) + 1}))`, // Cycle through chart colors
  };
  return acc;
}, {} as ChartConfig);


export function MembershipDistributionChart() {
  return (
    <Card className="shadow-lg">
      <CardHeader>
         <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Membership Type Distribution</CardTitle>
            <Users className="h-5 w-5 text-primary" />
        </div>
        <CardDescription>Breakdown of members by their plan type</CardDescription>
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
                data={mockMemberDataForDistribution}
                dataKey="count"
                nameKey="type" // This is the key for the name of the slice (e.g., "Annual")
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={60}
                labelLine={false}
              >
                {mockMemberDataForDistribution.map((entry) => (
                  <Cell 
                    key={`cell-${entry.type}`} 
                    fill={chartConfig[entry.type.toLowerCase().replace(/\s+/g, '_') as keyof typeof chartConfig]?.color || "hsl(var(--muted))"} 
                  />
                ))}
              </Pie>
               <ChartLegend content={<ChartLegendContent nameKey="type" />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

    