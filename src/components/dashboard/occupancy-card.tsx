
'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, AlertCircle } from 'lucide-react';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { getCurrentOccupancy } from '@/app/actions/dashboard-actions';
import { Skeleton } from '@/components/ui/skeleton';

const chartConfig = {
  occupied: {
    label: "Occupied",
    color: "hsl(var(--primary))",
  },
  available: {
    label: "Available",
    color: "hsl(var(--muted))",
  },
} satisfies ChartConfig;

export function OccupancyCard({ className }: { className?: string }) {
  const [occupancy, setOccupancy] = useState(0);
  const [maxCapacity, setMaxCapacity] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gymDbId, setGymDbId] = useState<string | null>(null);

  const fetchAndSetOccupancy = async (id: string) => {
    const data = await getCurrentOccupancy(id);
    if (data.error) {
      setError(data.error);
    } else {
      setOccupancy(data.currentOccupancy);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const id = localStorage.getItem('gymDatabaseId');
      setGymDbId(id);

      const capacityStr = localStorage.getItem('gymMaxCapacity');
      if (capacityStr) {
        setMaxCapacity(parseInt(capacityStr, 10));
      }

      if (id) {
        setIsLoading(true);
        setError(null);
        fetchAndSetOccupancy(id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
        setError("Gym ID not found. Please log in again.");
      }
    }
  }, []);

  const chartData = [
    { name: 'Occupied', value: occupancy, fill: chartConfig.occupied.color },
    { name: 'Available', value: Math.max(0, maxCapacity - occupancy), fill: chartConfig.available.color },
  ];

  return (
    <Card className={cn("shadow-lg", className)}>
      <CardHeader>
        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-semibold">Current Occupancy</CardTitle>
          <Users className="h-5 w-5 text-primary" />
        </div>
        <CardDescription className="text-xs">Members currently in the gym.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center pt-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[250px]">
            <Skeleton className="h-[150px] w-[150px] rounded-full" />
            <Skeleton className="h-8 w-24 mt-4" />
            <Skeleton className="h-4 w-32 mt-2" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[250px] text-destructive">
            <AlertCircle className="h-12 w-12 mb-2" />
            <p className="text-sm text-center">Error loading occupancy.</p>
            <p className="text-xs text-center mt-1">{error}</p>
          </div>
        ) : (
          <>
            <ChartContainer config={chartConfig} className="h-[180px] w-full max-w-[200px] mx-auto">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel indicator="dot" hideIndicator={false} />}
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
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="text-3xl font-bold text-primary mt-2">
              {occupancy}
              <span className="text-xl text-muted-foreground">/{maxCapacity}</span>
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
