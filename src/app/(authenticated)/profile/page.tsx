import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DollarSign, Landmark, AlertCircle, PackageOpen } from 'lucide-react';
import { getGymEarningsData } from '@/app/actions/profile-actions';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { CreatePlanForm } from '@/components/profile/create-plan-form';
import { MaintenanceSection } from '@/components/profile/maintenance-section';
import { getServerSession } from '@/lib/auth-service';

export default async function ProfilePage() {
  const session = await getServerSession();
  const gymDbId = session.gymDatabaseId || '';

  const earningsRes = await getGymEarningsData(gymDbId);
  const earningsData = earningsRes.data;
  const earningsError = earningsRes.error;

  const renderEarningsContent = () => {
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
          {session.gymName ? `${session.gymName} - Owner Profile` : 'Owner Profile'}
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
            <p className="text-foreground font-semibold">{session.gymName || 'N/A'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Gym ID</h3>
            <p className="text-foreground font-semibold">{session.gymId || 'N/A'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Subscription Tier</h3>
            <p className="text-foreground font-semibold">GymTrack Lite - Standard</p>
          </div>
        </CardContent>
      </Card>

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

      <MaintenanceSection />
    </div>
  );
}
