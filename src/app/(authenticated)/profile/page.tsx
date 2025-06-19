
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { OccupancyCard } from '@/components/dashboard/occupancy-card';
import { CheckinTrendsChart } from '@/components/dashboard/checkin-trends-chart';
import { DollarSign, Users, TrendingUp, Landmark, AlertCircle, Trophy, PackageOpen } from 'lucide-react';
import { getGymEarningsData, type EarningsData } from '@/app/actions/profile-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';


export default function ProfilePage() {
  const [gymName, setGymName] = useState<string | null>(null);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [gymDatabaseId, setGymDatabaseId] = useState<string | null>(null);

  const [earningsData, setEarningsData] = useState<EarningsData | null>(null);
  const [isLoadingEarnings, setIsLoadingEarnings] = useState(true);
  const [earningsError, setEarningsError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setGymName(localStorage.getItem('gymName'));
      setOwnerEmail(localStorage.getItem('gymOwnerEmail'));
      const dbId = localStorage.getItem('gymDatabaseId');
      setGymDatabaseId(dbId);
    }
  }, []);

  useEffect(() => {
    if (gymDatabaseId) {
      setIsLoadingEarnings(true);
      setEarningsError(null);
      getGymEarningsData(gymDatabaseId)
        .then(response => {
          if (response.error || !response.data) {
            setEarningsError(response.error || 'Failed to load earnings data.');
            setEarningsData(null);
          } else {
            setEarningsData(response.data);
          }
        })
        .catch(err => {
          console.error("ProfilePage earnings fetch error:", err);
          setEarningsError("An unexpected error occurred while fetching earnings.");
          setEarningsData(null);
        })
        .finally(() => {
          setIsLoadingEarnings(false);
        });
    } else if (gymName !== null) { // If gymName is loaded but no dbId, implies an issue
        setIsLoadingEarnings(false);
        setEarningsError("Gym Database ID not found. Cannot load earnings.");
    }
  }, [gymDatabaseId, gymName]);

  const renderEarningsContent = () => {
    if (isLoadingEarnings) {
      return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      );
    }

    if (earningsError) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Earnings</AlertTitle>
          <AlertDescription>{earningsError}</AlertDescription>
        </Alert>
      );
    }

    if (!earningsData) {
      return (
         <Alert variant="default">
            <PackageOpen className="h-4 w-4" />
            <AlertTitle>No Earnings Data</AlertTitle>
            <AlertDescription>No earnings data available for this gym yet, or an error occurred.</AlertDescription>
        </Alert>
      );
    }
    
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="p-4 bg-muted/30 rounded-lg">
          <h3 className="text-sm font-medium text-muted-foreground">Total Value of Active Plans</h3>
          <p className="text-2xl font-bold text-primary">₹{earningsData.totalValueOfActivePlans.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-muted/30 rounded-lg">
          <h3 className="text-sm font-medium text-muted-foreground">Current Monthly Revenue (Est.)</h3>
          <p className="text-2xl font-bold text-primary">₹{earningsData.currentMonthlyRevenue.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-muted/30 rounded-lg">
          <h3 className="text-sm font-medium text-muted-foreground">Avg. Monthly Revenue/Active Member</h3>
          <p className="text-2xl font-bold text-primary">₹{earningsData.averageRevenuePerActiveMember.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-muted/30 rounded-lg">
          <h3 className="text-sm font-medium text-muted-foreground">Top Plan (by Active Members)</h3>
          <p className="text-lg font-semibold text-foreground">{earningsData.topPerformingPlanName || 'N/A'}</p>
           <p className="text-xs text-muted-foreground">Based on {earningsData.activeMemberCount} active member(s)</p>
        </div>
      </div>
    );
  };


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


      {/* Earnings Overview Card */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Earnings Overview</CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <CardDescription>Summary of your gym's current financial standing based on active memberships.</CardDescription>
        </CardHeader>
        <CardContent>
          {renderEarningsContent()}
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
