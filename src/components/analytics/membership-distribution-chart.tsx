
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Pie, PieChart, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, AlertCircle } from 'lucide-react'; 
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import type { MembershipType } from '@/lib/types';
import { getMembershipDistribution } from '@/app/actions/analytics-actions';
import { Skeleton } from '@/components/ui/skeleton';


interface MembershipDistributionData {
  type: MembershipType;
  count: number;
}

export function MembershipDistributionChart() {
  const [chartData, setChartData] = useState<MembershipDistributionData[]>([]);
  const [chartConfig, setChartConfig] = useState<ChartConfig>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gymDbId, setGymDbId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const id = localStorage.getItem('gymDatabaseId');
      setGymDbId(id);
    }
  }, []);

  const fetchChartData = useCallback(() => {
    if (!gymDbId) {
      setIsLoading(false);
      setChartData([]); 
      return;
    }

    setIsLoading(true);
    setError(null);
    getMembershipDistribution(gymDbId)
      .then(response => {
        if (response.error) {
          setError(response.error);
          setChartData([]);
        } else {
          setChartData(response.data);
          
          const newChartConfig = response.data.reduce((acc, item, index) => {
            const key = item.type.toLowerCase().replace(/\s+/g, '_') || `type_${index}`;
            acc[key] = {
              label: item.type,
              color: `hsl(var(--chart-${(index % 5) + 1}))`,
            };
            return acc;
          }, {} as ChartConfig);
          setChartConfig(newChartConfig);
        }
      })
      .catch(err => {
        
        setError("Failed to load membership distribution data.");
        setChartData([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [gymDbId]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  useEffect(() => {
    const handleRefetch = () => {
      fetchChartData();
    };
    window.addEventListener('clear-cache-and-refetch', handleRefetch);
    return () => {
      window.removeEventListener('clear-cache-and-refetch', handleRefetch);
    };
  }, [fetchChartData]);


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
        {isLoading ? (
          <div className="h-[300px] w-full flex items-center justify-center">
            <Skeleton className="h-[200px] w-[200px] rounded-full" />
          </div>
        ) : error ? (
          <div className="h-[300px] w-full flex flex-col items-center justify-center text-destructive">
            <AlertCircle className="h-12 w-12 mb-2" />
            <p className="text-sm text-center">Error loading distribution.</p>
            <p className="text-xs text-center mt-1">{error}</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground">
            No membership data available for this gym.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel hideIndicator={false} />}
                />
                <Pie
                  data={chartData}
                  dataKey="count"
                  nameKey="type" 
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={60}
                  labelLine={false}
                >
                  {chartData.map((entry) => (
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
        )}
      </CardContent>
    </Card>
  );
}
