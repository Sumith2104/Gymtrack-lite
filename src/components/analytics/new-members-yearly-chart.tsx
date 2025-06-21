
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, AlertCircle } from 'lucide-react'; 
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { getNewMembersYearly } from '@/app/actions/analytics-actions';
import { Skeleton } from '@/components/ui/skeleton';

interface YearlyNewMembers {
  year: string; // Format "yyyy"
  count: number;
}

const chartConfig = {
  annualNewMembers: {
    label: "New Members",
    color: "hsl(var(--chart-3))", 
  },
} satisfies ChartConfig;

export function NewMembersYearlyChart() {
  const [chartData, setChartData] = useState<YearlyNewMembers[]>([]);
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
      setError("Gym ID not found. Cannot load yearly new members data.");
      return;
    }

    setIsLoading(true);
    setError(null);
    getNewMembersYearly(gymDbId)
      .then(response => {
        if (response.error) {
          setError(response.error);
          setChartData([]);
        } else {
          setChartData(response.data);
        }
      })
      .catch(err => {
        setError("Failed to load yearly new members data.");
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
          <CardTitle className="text-sm font-medium">Yearly New Members Trend (Since Creation)</CardTitle>
           <Users className="h-5 w-5 text-primary" />
        </div>
        <CardDescription>Total new members acquired each year since gym creation</CardDescription>
      </CardHeader>
      <CardContent>
         {isLoading ? (
          <div className="h-[300px] w-full flex items-center justify-center">
            <Skeleton className="h-full w-full" />
          </div>
        ) : error ? (
          <div className="h-[300px] w-full flex flex-col items-center justify-center text-destructive">
            <AlertCircle className="h-12 w-12 mb-2" />
            <p className="text-sm text-center">Error loading yearly data.</p>
            <p className="text-xs text-center mt-1">{error}</p>
          </div>
        ) : chartData.length === 0 && !isLoading ? (
          <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground">
            No new member data available for this gym.
          </div>
        ): (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 0, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.3)" />
                <XAxis
                  dataKey="year"
                  tickLine={false}
                  axisLine={true}
                  tickMargin={8}
                  fontSize={12}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis 
                  tickLine={false}
                  axisLine={true}
                  tickMargin={8}
                  fontSize={12}
                  stroke="hsl(var(--muted-foreground))"
                  allowDecimals={false}
                  domain={[0, 'dataMax + 20']} 
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="line" hideLabel hideIndicator={false} />}
                  formatter={(value, name, props) => [`${value} new members in ${props.payload.year}`, null]}
                />
                <Bar dataKey="count" fill="var(--color-annualNewMembers)" radius={[4, 4, 0, 0]} barSize={chartData.length > 10 ? 15: 30} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
