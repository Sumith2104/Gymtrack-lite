
import { OccupancyCard } from '@/components/dashboard/occupancy-card';
import { CheckinTrendsChart } from '@/components/dashboard/checkin-trends-chart';
import { AnnouncementsSection } from '@/components/dashboard/announcements-section';

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="mb-2">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">Gym Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of current gym status, activity trends, and important updates.
        </p>
        <div className="mt-3 h-1 w-24 bg-primary rounded-full"></div> {/* Gold underline */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <OccupancyCard className="lg:col-span-1" />
        <CheckinTrendsChart className="lg:col-span-2" />
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <AnnouncementsSection />
      </div>
    </div>
  );
}
