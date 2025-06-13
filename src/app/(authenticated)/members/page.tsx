import { MembersTable } from '@/components/members/members-table';

export default function MemberManagementPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-headline font-semibold text-primary">Member Management</h1>
      <MembersTable />
    </div>
  );
}
