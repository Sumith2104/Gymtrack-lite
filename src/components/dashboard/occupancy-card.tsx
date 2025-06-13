'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

export function OccupancyCard() {
  const [occupancy, setOccupancy] = useState(0);

  useEffect(() => {
    // Simulate real-time update
    const interval = setInterval(() => {
      setOccupancy(Math.floor(Math.random() * 50) + 5); // Random number between 5 and 54
    }, 5000);
    setOccupancy(Math.floor(Math.random() * 50) + 5); // Initial random value
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Real-Time Occupancy</CardTitle>
        <Users className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold text-primary">{occupancy}</div>
        <p className="text-xs text-muted-foreground">members currently in the gym</p>
      </CardContent>
    </Card>
  );
}
