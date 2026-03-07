import { OccupancyCard } from '@/components/dashboard/occupancy-card';
import { CheckinTrendsChart } from '@/components/dashboard/checkin-trends-chart';
import { AnnouncementsSection } from '@/components/dashboard/announcements-section';
import { Separator } from '@/components/ui/separator';
import { getServerSession } from '@/lib/auth-service';
import { getCurrentOccupancy, getDailyCheckInTrends } from '@/app/actions/dashboard-actions';
import { fetchAnnouncementsAction } from '@/app/actions/announcement-actions';
import { getGymSettings } from '@/app/actions/profile-actions';
import { DashboardWarnings } from '@/components/dashboard/dashboard-warnings'; // I'll create this next

export default async function DashboardPage() {
  const session = await getServerSession();

  // Parallel fetching on the server
  const [occupancyRes, trendsRes, announcementsRes, settingsRes] = await Promise.all([
    getCurrentOccupancy(session.gymDatabaseId || ''),
    getDailyCheckInTrends(session.gymDatabaseId || ''),
    fetchAnnouncementsAction(session.gymId || ''),
    getGymSettings(session.gymDatabaseId || '')
  ]);

  return (
    <div className="flex flex-col gap-8">
      <DashboardWarnings />
      <div className="mb-2">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
          {session.gymName ? `Welcome to ${session.gymName}` : 'Gym Dashboard'}
        </h1>
        <p className="text-muted-foreground mt-1">
          Overview of current gym status, activity trends, and important updates.
        </p>
        <div className="mt-3 h-1 w-24 bg-primary rounded-full"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <OccupancyCard
          className="lg:col-span-1"
          initialOccupancy={occupancyRes.currentOccupancy}
          initialMaxCapacity={settingsRes.data?.maxCapacity || 100}
        />
        <CheckinTrendsChart
          className="lg:col-span-2"
          initialTrends={trendsRes.trends}
        />
      </div>

      <Separator className="my-2 bg-border" />

      <div className="grid grid-cols-1 gap-6">
        <AnnouncementsSection initialAnnouncements={announcementsRes.data} />
      </div>
    </div>
  );
}
