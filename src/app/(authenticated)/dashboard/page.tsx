
'use client';

import { useState, useEffect } from 'react';
import { OccupancyCard } from '@/components/dashboard/occupancy-card';
import { CheckinTrendsChart } from '@/components/dashboard/checkin-trends-chart';
import { AnnouncementsSection } from '@/components/dashboard/announcements-section';
import { Separator } from '@/components/ui/separator';


export default function DashboardPage() {
  const [gymName, setGymName] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedGymName = localStorage.getItem('gymName');
      setGymName(storedGymName);
    }
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <div className="mb-2">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
          {gymName ? `Welcome to ${gymName}` : 'Gym Dashboard'}
        </h1>
        <p className="text-muted-foreground mt-1">
          Overview of current gym status, activity trends, and important updates.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <OccupancyCard className="lg:col-span-1" />
        <CheckinTrendsChart className="lg:col-span-2" />
      </div>
      
      <Separator className="my-2 bg-border" /> 

      <div className="grid grid-cols-1 gap-6">
        <AnnouncementsSection />
      </div>
    </div>
  );
}

