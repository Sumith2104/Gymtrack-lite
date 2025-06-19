
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { OccupancyCard } from '@/components/dashboard/occupancy-card';
import { CheckinTrendsChart } from '@/components/dashboard/checkin-trends-chart';
import { DollarSign, Users, TrendingUp, Landmark } from 'lucide-react';

// Mock data for earnings - replace with actual data fetching later
const mockEarnings = {
  totalRevenue: 75000,
  monthlyRevenue: 6500,
  averageRevenuePerMember: 120,
  topPerformingPlan: 'Premium Annual',
};

export default function ProfilePage() {
  const [gymName, setGymName] = useState<string | null>(null);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setGymName(localStorage.getItem('gymName'));
      setOwnerEmail(localStorage.getItem('gymOwnerEmail'));
    }
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <div className="mb-2">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
          {gymName ? `${gymName} - Owner Profile` : 'Owner Profile'}
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your gym details, view earnings, and get an activity overview.
        </p>
        <div className="mt-3 h-1 w-24 bg-primary rounded-full"></div>
      </div>

      {/* Gym Details Card */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Gym Information</CardTitle>
            <Landmark className="h-5 w-5 text-primary" />
          </div>
          <CardDescription>Basic details of your registered gym.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Gym Name</h3>
            <p className="text-foreground font-semibold">{gymName || 'Loading...'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Owner Email</h3>
            <p className="text-foreground font-semibold">{ownerEmail || 'Loading...'}</p>
          </div>
           <div>
            <h3 className="text-sm font-medium text-muted-foreground">Subscription Tier</h3>
            <p className="text-foreground font-semibold">GymTrack Lite - Standard</p>
          </div>
        </CardContent>
      </Card>


      {/* Earnings Overview Card - Placeholder */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Earnings Overview (Mock Data)</CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <CardDescription>A summary of your gym's financial performance.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="p-4 bg-muted/30 rounded-lg">
            <h3 className="text-sm font-medium text-muted-foreground">Total Revenue</h3>
            <p className="text-2xl font-bold text-primary">₹{mockEarnings.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg">
            <h3 className="text-sm font-medium text-muted-foreground">This Month's Revenue</h3>
            <p className="text-2xl font-bold text-primary">₹{mockEarnings.monthlyRevenue.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg">
            <h3 className="text-sm font-medium text-muted-foreground">Avg. Revenue/Member</h3>
            <p className="text-2xl font-bold text-primary">₹{mockEarnings.averageRevenuePerMember.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg">
            <h3 className="text-sm font-medium text-muted-foreground">Top Plan</h3>
            <p className="text-lg font-semibold text-foreground">{mockEarnings.topPerformingPlan}</p>
          </div>
        </CardContent>
      </Card>

      {/* Activity Snapshot */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-4">Activity Snapshot</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <OccupancyCard className="lg:col-span-1" />
          <CheckinTrendsChart className="lg:col-span-2" />
        </div>
      </div>
    </div>
  );
}
