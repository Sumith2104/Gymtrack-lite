'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { cn } from '@/lib/utils';


const MAX_CAPACITY = 100; // Example max capacity

const chartConfig = {
  occupied: {
    label: "Occupied",
    color: "hsl(var(--primary))", // Gold
  },
  available: {
    label: "Available",
    color: "hsl(var(--muted))", // A muted color from theme
  },
} satisfies ChartConfig;

export function OccupancyCard({ className }: { className?: string }) {
  const [occupancy, setOccupancy] = useState(0);

  useEffect(() => {
    const initialOccupancy = Math.floor(Math.random() * (MAX_CAPACITY * 0.6)) + 5; // Initial random value up to 60% + 5
    setOccupancy(initialOccupancy);

    const interval = setInterval(() => {
      setOccupancy(prev => {
        const change = Math.floor(Math.random() * 5) - 2; // -2 to +2
        let newOccupancy = prev + change;
        if (newOccupancy < 0) newOccupancy = 0;
        if (newOccupancy > MAX_CAPACITY) newOccupancy = MAX_CAPACITY;
        return newOccupancy;
      });
    }, 5000); // Simulate real-time update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const chartData = [
    { name: 'Occupied', value: occupancy, fill: chartConfig.occupied.color },
    { name: 'Available', value: MAX_CAPACITY - occupancy, fill: chartConfig.available.color },
  ];

  return (
    <Card className={cn("shadow-lg", className)}>
      <CardHeader>
        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-semibold">Current Occupancy</CardTitle>
          <Users className="h-5 w-5 text-primary" />
        </div>
        <CardDescription className="text-xs">Real-time members in the gym.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center pt-2">
        <ChartContainer config={chartConfig} className="h-[180px] w-full max-w-[200px] mx-auto">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel indicator="dot" />}
              />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="80%"
                strokeWidth={2}
                labelLine={false}
              >
                {chartData.map((entry) => (
                  <Cell key={`cell-${entry.name}`} fill={entry.fill} stroke={entry.fill} />
                ))}
              </Pie>
              {/* Custom Legend inside or below chart */}
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
        <div className="text-3xl font-bold text-primary mt-2">
          {occupancy}
          <span className="text-xl text-muted-foreground">/{MAX_CAPACITY}</span>
        </div>
         <div className="flex items-center justify-center space-x-4 mt-3 text-xs">
            <div className="flex items-center">
              <span className="h-2 w-2 rounded-full mr-1.5" style={{ backgroundColor: chartConfig.occupied.color }} />
              Occupied
            </div>
            <div className="flex items-center">
              <span className="h-2 w-2 rounded-full mr-1.5" style={{ backgroundColor: chartConfig.available.color }} />
              Available
            </div>
          </div>
      </CardContent>
    </Card>
  );
}
