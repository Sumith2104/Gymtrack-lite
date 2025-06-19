
import { MembersTable } from '@/components/members/members-table';

export default function MemberManagementPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="mb-2">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">Manage Members</h1>
        <p className="text-muted-foreground mt-1">
          Browse, filter, sort, and manage registered gym members. Click 'Add Member' to register a new one.
        </p>
        <div className="mt-3 h-1 w-24 bg-primary rounded-full"></div>
      </div>
      <MembersTable />
    </div>
  );
}
