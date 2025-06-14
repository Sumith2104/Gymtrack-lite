
'use client';

import * as React from 'react';
import {
  CaretSortIcon,
  ChevronDownIcon,
} from '@radix-ui/react-icons';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { MoreHorizontal, Trash2, Edit3, Mail, FileText, PlusCircle, UserX, UserCheck, MailWarning, UserCog, Search as SearchIcon, Users, Check } from 'lucide-react';
import { format, differenceInDays, parseISO, isValid } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { Member, MembershipStatus, AttendanceSummary, Announcement } from '@/lib/types';
import { AddMemberDialog } from './add-member-dialog';
import { AttendanceOverviewDialog } from './attendance-overview-dialog';
import { BulkEmailDialog } from './bulk-email-dialog';
import { APP_NAME } from '@/lib/constants';


const initialData: Member[] = [
  // Note: Ensure gymId here is the UUID (gymDatabaseId) if you want them to show up for a specific mock gym
  // Example: Replace 'GYM123_default' with the actual UUID of your 'GYM123_default' gym from your Supabase setup
  // For now, I'll assume 'GYM123_default_uuid' and 'UOFIPOIB_uuid' are placeholders for actual UUIDs
  { id: 'member_uuid_1', memberId: 'SUMI0493P', name: 'sumith', email: 'sumithsumith4567890@gmail.com', membershipStatus: 'active', gymId: 'GYM123_default_uuid', createdAt: new Date(Date.now() - 86400000 * 10).toISOString(), joinDate: "2025-06-14T00:00:00.000Z", expiryDate: new Date(Date.now() + 86400000 * 355).toISOString(), phoneNumber: '8310870493', membershipType: 'Premium', planPrice: 2999, age: 21 },
  { id: 'member_uuid_2', memberId: 'MBR002', name: 'Bob Smith', email: 'bob@example.com', membershipStatus: 'inactive', gymId: 'GYM123_default_uuid', createdAt: new Date(Date.now() - 86400000 * 20).toISOString(), joinDate: new Date(Date.now() - 86400000 * 20).toISOString(), phoneNumber: '234-567-8901', membershipType: 'Monthly', planPrice: 599, age: 35 },
  { id: 'member_uuid_3', memberId: 'MBR003', name: 'Carol White', email: 'carol@example.com', membershipStatus: 'expired', gymId: 'GYM123_default_uuid', createdAt: new Date(Date.now() - 86400000 * 30).toISOString(), joinDate: new Date(Date.now() - 86400000 * 30).toISOString(), expiryDate: new Date(Date.now() - 86400000 * 5).toISOString(), membershipType: 'Monthly', planPrice: 599, age: 42 },
  { id: 'member_uuid_4', memberId: 'MBR004', name: 'David Brown', email: 'david@example.com', membershipStatus: 'active', gymId: 'GYM123_default_uuid', createdAt: new Date(Date.now() - 86400000 * 15).toISOString(), joinDate: new Date(Date.now() - 86400000 * 15).toISOString(), expiryDate: new Date(Date.now() + 86400000 * 10).toISOString(), phoneNumber: '345-678-9012', membershipType: '6-Month', planPrice: 2999, age: 22 }, // Expiring soon
  { id: 'member_uuid_5', memberId: 'MBR005', name: 'Sumith Member', email: 'sumith.member@example.com', membershipStatus: 'active', gymId: 'UOFIPOIB_uuid', createdAt: new Date().toISOString(), joinDate: new Date().toISOString(), expiryDate: new Date(Date.now() + 86400000 * 30).toISOString(), phoneNumber: '555-555-5555', membershipType: 'Annual', planPrice: 5999, age: 30 },
  { id: 'member_uuid_6', memberId: 'MBR006', name: 'Pending Penny', email: 'penny@example.com', membershipStatus: 'pending', gymId: 'GYM123_default_uuid', createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), joinDate: new Date(Date.now() - 86400000 * 2).toISOString(), phoneNumber: '456-789-0123', membershipType: 'Monthly', planPrice: 599, age: 25 },
];

const getEffectiveMembershipStatus = (member: Member): MembershipStatus => {
  if (member.membershipStatus === 'active' && member.expiryDate) {
    const expiry = parseISO(member.expiryDate);
    if (isValid(expiry)) {
      const daysUntilExpiry = differenceInDays(expiry, new Date());
      if (daysUntilExpiry <= 14 && daysUntilExpiry >= 0) {
        return 'expiring soon';
      }
      if (daysUntilExpiry < 0) return 'expired';
    }
  }
  return member.membershipStatus;
};


export function MembersTable() {
  const [data, setData] = React.useState<Member[]>(initialData);
  const { toast } = useToast();

  const [currentGymDatabaseId, setCurrentGymDatabaseId] = React.useState<string | null>(null);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = React.useState(false);
  const [memberToEdit, setMemberToEdit] = React.useState<Member | null>(null);
  
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = React.useState(false);
  const [memberForAttendance, setMemberForAttendance] = React.useState<Member | null>(null);
  const [mockAttendanceData, setMockAttendanceData] = React.useState<AttendanceSummary | null>(null);

  const [isBulkEmailDialogOpen, setIsBulkEmailDialogOpen] = React.useState(false);
  const [bulkEmailRecipients, setBulkEmailRecipients] = React.useState<Member[]>([]);


  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const gymDbId = localStorage.getItem('gymDatabaseId'); // Use the UUID
      setCurrentGymDatabaseId(gymDbId);
      // Update initial data to only show members of the current gym if desired
      // This part is tricky with initialData as it's static.
      // A real app would fetch data based on gymDbId.
      // For now, we'll filter the static initialData.
      if (gymDbId) {
        setData(initialData.filter(m => m.gymId === gymDbId));
      } else {
        setData([]); // No gym selected, show no members
      }
    }
  }, []);
  
  const gymMembers = React.useMemo(() => {
    if (!currentGymDatabaseId) return [];
    // Filter the current `data` state, which might include newly added members
    return data
      .filter(member => member.gymId === currentGymDatabaseId)
      .map(member => ({ ...member, effectiveStatus: getEffectiveMembershipStatus(member) }));
  }, [data, currentGymDatabaseId]);


  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    planPrice: false,
    createdAt: false, 
    age: false,
    phoneNumber: false,
  });
  const [rowSelection, setRowSelection] = React.useState({});
  const [statusFilter, setStatusFilter] = React.useState<MembershipStatus | 'all'>('all');


  const handleMemberSaved = (savedMember: Member) => {
    setData(prev => {
      const existingIndex = prev.findIndex(m => m.id === savedMember.id);
      if (existingIndex > -1) { // Edit
        const updatedData = [...prev];
        updatedData[existingIndex] = savedMember;
        return updatedData;
      } // Add
      // Ensure the new member is only added to the list if it belongs to the current gym
      if (savedMember.gymId === currentGymDatabaseId) {
        return [savedMember, ...prev];
      }
      return prev; // If not current gym, don't add to this view's local state
    });
    setIsAddMemberDialogOpen(false);
    setMemberToEdit(null);
  };

  const openAddDialog = () => {
    setMemberToEdit(null);
    setIsAddMemberDialogOpen(true);
  };

  const openEditDialog = (member: Member) => {
    setMemberToEdit(member);
    setIsAddMemberDialogOpen(true);
  };
  
  const handleDeleteMember = (memberIdToDelete: string) => {
    setData(prev => prev.filter(m => m.id !== memberIdToDelete));
    toast({ title: "Member Deleted", description: `Member has been removed. (Simulated)` });
  };

  const handleManualStatusUpdate = (member: Member, newStatus: MembershipStatus) => {
     if (newStatus === 'expiring soon') {
        toast({ title: "Invalid Action", description: "'Expiring Soon' is an automatically derived status.", variant: "destructive" });
        return;
    }
    setData(prev => prev.map(m => m.id === member.id ? { ...m, membershipStatus: newStatus } : m));
    toast({ title: "Status Updated", description: `${member.name}'s status changed to ${newStatus}. (Simulated email notification)` });
    console.log(`SIMULATING: Email notification to ${member.email} about status change to ${newStatus}.`);
  };
  
  const handleViewAttendance = (member: Member) => {
    setMemberForAttendance(member);
    const lastCheckin = new Date(Date.now() - Math.random() * 10 * 86400000); 
    const recentCheckins = Array.from({length: 5}, (_, i) => new Date(lastCheckin.getTime() - i * Math.random() * 3 * 86400000));
    setMockAttendanceData({
        totalCheckIns: Math.floor(Math.random() * 100) + 5,
        lastCheckInTime: lastCheckin,
        recentCheckIns: recentCheckins.sort((a,b) => b.getTime() - a.getTime()),
    });
    setIsAttendanceDialogOpen(true);
  };
  
  const handleBulkDelete = () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    if (selectedRows.length === 0) {
      toast({ title: "No members selected", variant: "destructive", description: "Please select members to delete." });
      return;
    }
    const selectedIds = selectedRows.map(row => row.original.id);
    setData(prev => prev.filter(m => !selectedIds.includes(m.id)));
    toast({ title: "Bulk Delete", description: `${selectedIds.length} member(s) deleted. (Simulated)` });
    setRowSelection({});
  };

  const handleBulkStatusUpdate = (newStatus: MembershipStatus) => {
    if (newStatus === 'expiring soon') {
        toast({ title: "Invalid Action", description: "'Expiring Soon' is an automatically derived status for bulk actions.", variant: "destructive" });
        return;
    }
    const selectedRows = table.getFilteredSelectedRowModel().rows;
     if (selectedRows.length === 0) {
      toast({ title: "No members selected", variant: "destructive", description: "Please select members to update." });
      return;
    }
    const selectedIds = selectedRows.map(row => row.original.id);
    setData(prev => prev.map(m => selectedIds.includes(m.id) ? { ...m, membershipStatus: newStatus } : m));
    toast({ title: "Bulk Status Update", description: `${selectedIds.length} member(s) updated to ${newStatus}. (Simulated)` });
    setRowSelection({});
  };

  const handleOpenBulkEmailDialog = () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    if (selectedRows.length === 0) {
      toast({ title: "No members selected", variant: "destructive", description: "Please select members to email." });
      return;
    }
    setBulkEmailRecipients(selectedRows.map(row => row.original));
    setIsBulkEmailDialogOpen(true);
  };

  const filterableStatuses: (MembershipStatus | 'all')[] = ['all', 'active', 'expiring soon', 'expired'];


  const columns: ColumnDef<Member & { effectiveStatus: MembershipStatus }>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="border-primary-foreground/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="border-primary-foreground/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>Name <CaretSortIcon className="ml-2 h-4 w-4" /></Button>,
      cell: ({ row }) => <div className="font-semibold">{row.getValue('name')}</div>,
    },
    {
      accessorKey: 'memberId',
      header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>Member ID <CaretSortIcon className="ml-2 h-4 w-4" /></Button>,
      cell: ({ row }) => <div>{row.getValue('memberId')}</div>,
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => <div>{row.getValue('email') || 'N/A'}</div>,
    },
     {
      accessorKey: 'age',
      header: 'Age',
      cell: ({row}) => row.getValue('age') || 'N/A'
    },
    {
      accessorKey: 'phoneNumber',
      header: 'Phone',
      cell: ({ row }) => <div>{row.getValue('phoneNumber') || 'N/A'}</div>,
    },
    {
      accessorKey: 'joinDate',
      header: 'Join Date',
      cell: ({ row }) => {
        const joinDateVal = row.getValue('joinDate') as string | null;
        return joinDateVal && isValid(parseISO(joinDateVal)) ? format(parseISO(joinDateVal), 'd MMM yy') : 'N/A';
      },
    },
    {
      accessorKey: 'membershipType', 
      header: 'Type',
      cell: ({ row }) => <div className="capitalize">{row.getValue('membershipType') || 'N/A'}</div>,
    },
    {
      accessorKey: 'effectiveStatus', 
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.effectiveStatus;
        let badgeClass = '';
        if (status === 'active') badgeClass = 'bg-green-500/20 text-green-700 border-green-500/30 hover:bg-green-500/30 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20 dark:hover:bg-green-500/20';
        else if (status === 'inactive') badgeClass = 'bg-slate-500/20 text-slate-700 border-slate-500/30 hover:bg-slate-500/30 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20 dark:hover:bg-slate-500/20';
        else if (status === 'expired') badgeClass = 'bg-red-500/20 text-red-700 border-red-500/30 hover:bg-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 dark:hover:bg-red-500/20'; 
        else if (status === 'pending') badgeClass = 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30 hover:bg-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20 dark:hover:bg-yellow-500/20';
        else if (status === 'expiring soon') badgeClass = 'bg-orange-500/20 text-orange-700 border-orange-500/30 hover:bg-orange-500/30 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20 dark:hover:bg-orange-500/20';
        return <Badge variant="outline" className={`capitalize ${badgeClass}`}>{status}</Badge>;
      },
      filterFn: (row, id, value) => value === 'all' || value.includes(row.original.effectiveStatus),
    },
    {
      id: 'actions', 
      header: 'Overview', // Header text matching image
      enableHiding: true, // Keep as true to allow hiding via Columns dropdown
      cell: ({ row }) => {
        const member = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Member Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => openEditDialog(member)}>
                <Edit3 className="mr-2 h-4 w-4" /> Edit Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleViewAttendance(member)}>
                <FileText className="mr-2 h-4 w-4" /> Attendance Summary
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Change Status</DropdownMenuLabel>
              {(['active', 'inactive', 'pending', 'expired'] as MembershipStatus[]).map(s => (
                <DropdownMenuItem key={s} onClick={() => handleManualStatusUpdate(member, s)} disabled={s === member.membershipStatus || s === 'expiring soon'}>
                  {s === 'active' && <UserCheck className="mr-2 h-4 w-4" />}
                  {s === 'inactive' && <UserX className="mr-2 h-4 w-4" />}
                  {s === 'pending' && <UserCog className="mr-2 h-4 w-4" />}
                  {s === 'expired' && <MailWarning className="mr-2 h-4 w-4" />}
                  Set to {s.charAt(0).toUpperCase() + s.slice(1)}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDeleteMember(member.id)}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete Member
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
    {
      accessorKey: 'planPrice',
      header: 'Price',
      cell: ({ row }) => row.getValue('planPrice') ? `₹${Number(row.getValue('planPrice')).toFixed(2)}` : 'N/A',
      enableHiding: true,
    },
    {
      accessorKey: 'createdAt',
      header: 'Registered On',
      cell: ({row}) => {
        const createdAtVal = row.getValue('createdAt') as string;
        return isValid(parseISO(createdAtVal)) ? format(parseISO(createdAtVal), 'PPpp') : 'Invalid Date';
      },
      enableHiding: true,
    },
  ];

  const table = useReactTable({
    data: gymMembers, // Use the filtered gymMembers
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: { pageSize: 8 } 
    }
  });
  
  React.useEffect(() => {
    table.getColumn('effectiveStatus')?.setFilterValue(statusFilter === 'all' ? undefined : statusFilter);
  }, [statusFilter, table]);


  return (
    <div className="w-full space-y-4 p-4 md:p-6 bg-card rounded-lg border border-border shadow-sm">
      <AddMemberDialog
        isOpen={isAddMemberDialogOpen}
        onOpenChange={setIsAddMemberDialogOpen}
        onMemberSaved={handleMemberSaved}
        memberToEdit={memberToEdit}
      />
       {memberForAttendance && mockAttendanceData && (
        <AttendanceOverviewDialog
          isOpen={isAttendanceDialogOpen}
          onOpenChange={setIsAttendanceDialogOpen}
          member={memberForAttendance}
          attendanceSummary={mockAttendanceData}
        />
      )}
      {bulkEmailRecipients.length > 0 && (
        <BulkEmailDialog
            isOpen={isBulkEmailDialogOpen}
            onOpenChange={setIsBulkEmailDialogOpen}
            recipients={bulkEmailRecipients}
            onSend={(subject, body) => {
                toast({ title: "Bulk Email Sent (Simulated)", description: `Email with subject "${subject}" sent to ${bulkEmailRecipients.length} members.`});
                console.log("SIMULATING Bulk Email:", {subject, body, recipients: bulkEmailRecipients.map(r => r.email)});
                if (bulkEmailRecipients.length === 1) {
                    console.log(`SIMULATING: QR Code for ${bulkEmailRecipients[0].memberId} would be included.`);
                }
                setBulkEmailRecipients([]); 
            }}
        />
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
        <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">All Members ({table.getFilteredRowModel().rows.length})</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter by name, ID, email..."
              value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
              onChange={(event) => {
                const val = event.target.value;
                table.getColumn('name')?.setFilterValue(val); 
                table.getColumn('email')?.setFilterValue(val); 
                table.getColumn('memberId')?.setFilterValue(val); 
              }}
              className="max-w-xs pl-9 h-10" 
            />
          </div>
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10">
                {statusFilter === 'all' ? 'All Statuses' : <span className="capitalize">{statusFilter}</span>}
                <ChevronDownIcon className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={statusFilter} onValueChange={(value) => setStatusFilter(value as MembershipStatus | 'all')}>
                {filterableStatuses.map(s => (
                  <DropdownMenuRadioItem key={s} value={s} className="capitalize">
                    {s === 'all' ? 'All Statuses' : s}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={openAddDialog} className="h-10 bg-primary hover:bg-primary/90 text-primary-foreground">
             <PlusCircle className="mr-2 h-4 w-4" /> Add Member
          </Button>
        </div>
      </div>
      
       <div className="flex items-center justify-end gap-2 mb-4">
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Columns <ChevronDownIcon className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table.getAllColumns().filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {/* Simple way to format ID for display, can be improved */}
                    {column.id.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={table.getFilteredSelectedRowModel().rows.length === 0}>
                Bulk Actions <ChevronDownIcon className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>For Selected ({table.getFilteredSelectedRowModel().rows.length})</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(['active', 'inactive', 'expired', 'pending'] as MembershipStatus[]).filter(s => s !== 'expiring soon').map(status => (
                 <DropdownMenuItem key={status} onClick={() => handleBulkStatusUpdate(status)} className="capitalize">Set Status to {status}</DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleOpenBulkEmailDialog}>
                  <Mail className="mr-2 h-4 w-4" /> Send Custom Email
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleBulkDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete Selected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
      </div>

      <div className="rounded-md border overflow-x-auto"> 
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap px-3 py-3 text-sm">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="whitespace-nowrap px-3 py-3 text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {currentGymDatabaseId ? `No members found for this gym matching current filters.` : 'Loading gym data or select a gym...'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

