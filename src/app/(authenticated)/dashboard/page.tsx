import { OccupancyCard } from '@/components/dashboard/occupancy-card';
import { CheckinTrendsChart } from '@/components/dashboard/checkin-trends-chart';
import { AnnouncementsSection } from '@/components/dashboard/announcements-section';

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-headline font-semibold text-primary">Dashboard</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <OccupancyCard />
        <CheckinTrendsChart />
        <AnnouncementsSection /> 
      </div>
       {/* More sections can be added here */}
    </div>
  );
}
