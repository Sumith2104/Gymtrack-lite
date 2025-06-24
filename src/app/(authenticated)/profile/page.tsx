
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DollarSign, Landmark, AlertCircle, PackageOpen } from 'lucide-react';
import { getGymEarningsData, type EarningsData } from '@/app/actions/profile-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { CreatePlanForm } from '@/components/profile/create-plan-form';
import { MaintenanceSection } from '@/components/profile/maintenance-section';


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

  const fetchEarningsData = useCallback(() => {
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
          
          setEarningsError("An unexpected error occurred while fetching earnings.");
          setEarningsData(null);
        })
        .finally(() => {
          setIsLoadingEarnings(false);
        });
    } else if (gymName !== null) { 
        setIsLoadingEarnings(false);
        setEarningsError("Gym Database ID not found. Cannot load earnings.");
    }
  }, [gymDatabaseId, gymName]);

  useEffect(() => {
    fetchEarningsData();
  }, [fetchEarningsData]);

  useEffect(() => {
    const handleRefetch = () => {
      fetchEarningsData();
    };
    window.addEventListener('clear-cache-and-refetch', handleRefetch);
    return () => {
      window.removeEventListener('clear-cache-and-refetch', handleRefetch);
    };
  }, [fetchEarningsData]);


  const renderEarningsContent = () => {
    if (isLoadingEarnings) {
      return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
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
        <div className="p-4 bg-muted/30 rounded-lg flex flex-col">
          <h3 className="text-sm font-medium text-muted-foreground h-10">Total Value of Active Plans</h3>
          <p className="text-2xl font-bold text-primary mt-2">₹{earningsData.totalValueOfActivePlans.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-muted/30 rounded-lg flex flex-col">
          <h3 className="text-sm font-medium text-muted-foreground h-10">Current Monthly Revenue</h3>
          <p className="text-2xl font-bold text-primary mt-2">₹{earningsData.currentMonthlyRevenue.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-muted/30 rounded-lg flex flex-col">
          <h3 className="text-sm font-medium text-muted-foreground h-10">Avg. Monthly Revenue/Active Member</h3>
          <p className="text-2xl font-bold text-primary mt-2">₹{earningsData.averageRevenuePerActiveMember.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-muted/30 rounded-lg flex flex-col">
          <h3 className="text-sm font-medium text-muted-foreground h-10">Most Bought Plan (Active Members)</h3>
          <p className="text-lg font-semibold text-foreground mt-2">{earningsData.topPerformingPlanName || 'N/A'}</p>
           <p className="text-xs text-muted-foreground mt-1">Based on {earningsData.activeMemberCount} active member(s)</p>
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
          Manage your gym details, plans, view earnings, and get an activity overview.
        </p>
        <div className="mt-3 h-1 w-24 bg-primary rounded-full"></div>
      </div>

      
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold flex items-center">
                <Landmark className="mr-2 h-5 w-5 text-primary" />Gym Information
            </CardTitle>
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

      {/* Manage Plans Section */}
      <CreatePlanForm />
      
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold flex items-center">
                <DollarSign className="mr-2 h-5 w-5 text-primary" />Earnings Overview
            </CardTitle>
          </div>
          <CardDescription>Summary of your gym's current financial standing based on active memberships.</CardDescription>
        </CardHeader>
        <CardContent>
          {renderEarningsContent()}
        </CardContent>
      </Card>

      {/* Maintenance Section */}
      <MaintenanceSection />
    </div>
  );
}
