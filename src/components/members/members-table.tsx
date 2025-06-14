
'use client';

import * as React from 'react';
import {
  CaretSortIcon,
  ChevronDownIcon,
  DotsHorizontalIcon,
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
  FilterFn,
} from '@tanstack/react-table';
import { MoreHorizontal, Trash2, Edit3, Mail, FileText, PlusCircle, UserX, UserCheck, MailWarning, UserCog } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import type { Member, MembershipStatus, AttendanceSummary } from '@/lib/types';
import { AddMemberDialog } from './add-member-dialog';
import { AttendanceOverviewDialog } from './attendance-overview-dialog';
import { BulkEmailDialog } from './bulk-email-dialog';


const initialData: Member[] = [
  { id: 'member_uuid_1', memberId: 'MBR001', name: 'Alice Johnson', email: 'alice@example.com', membershipStatus: 'active', gymId: 'GYM123_default', createdAt: new Date(Date.now() - 86400000 * 10).toISOString(), joinDate: new Date(Date.now() - 86400000 * 10).toISOString(), expiryDate: new Date(Date.now() + 86400000 * 355).toISOString(), phoneNumber: '123-456-7890', membershipType: 'Annual', planPrice: 300, age: 28 },
  { id: 'member_uuid_2', memberId: 'MBR002', name: 'Bob Smith', email: 'bob@example.com', membershipStatus: 'inactive', gymId: 'GYM123_default', createdAt: new Date(Date.now() - 86400000 * 20).toISOString(), joinDate: new Date(Date.now() - 86400000 * 20).toISOString(), phoneNumber: '234-567-8901', membershipType: 'Monthly', planPrice: 30, age: 35 },
  { id: 'member_uuid_3', memberId: 'MBR003', name: 'Carol White', email: 'carol@example.com', membershipStatus: 'expired', gymId: 'GYM123_default', createdAt: new Date(Date.now() - 86400000 * 30).toISOString(), joinDate: new Date(Date.now() - 86400000 * 30).toISOString(), expiryDate: new Date(Date.now() - 86400000 * 5).toISOString(), membershipType: 'Monthly', planPrice: 30, age: 42 },
  { id: 'member_uuid_4', memberId: 'MBR004', name: 'David Brown', email: 'david@example.com', membershipStatus: 'active', gymId: 'GYM123_default', createdAt: new Date(Date.now() - 86400000 * 15).toISOString(), joinDate: new Date(Date.now() - 86400000 * 15).toISOString(), expiryDate: new Date(Date.now() + 86400000 * 10).toISOString(), phoneNumber: '345-678-9012', membershipType: '6-Month', planPrice: 150, age: 22 }, // Expiring soon
  { id: 'member_uuid_5', memberId: 'MBR005', name: 'Sumith Member', email: 'sumith.member@example.com', membershipStatus: 'active', gymId: 'UOFIPOIB', createdAt: new Date().toISOString(), joinDate: new Date().toISOString(), expiryDate: new Date(Date.now() + 86400000 * 30).toISOString(), phoneNumber: '555-555-5555', membershipType: 'Annual', planPrice: 500, age: 30 },
  { id: 'member_uuid_6', memberId: 'MBR006', name: 'Pending Penny', email: 'penny@example.com', membershipStatus: 'pending', gymId: 'GYM123_default', createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), joinDate: new Date(Date.now() - 86400000 * 2).toISOString(), phoneNumber: '456-789-0123', membershipType: 'Monthly', planPrice: 30, age: 25 },
];

const getEffectiveMembershipStatus = (member: Member): MembershipStatus => {
  if (member.membershipStatus === 'active' && member.expiryDate) {
    const expiry = parseISO(member.expiryDate);
    if (isValid(expiry)) {
      const daysUntilExpiry = differenceInDays(expiry, new Date());
      if (daysUntilExpiry <= 14 && daysUntilExpiry >= 0) {
        return 'expiring soon';
      }
      if (daysUntilExpiry < 0) return 'expired'; // Double check if status wasn't updated
    }
  }
  return member.membershipStatus;
};


export function MembersTable() {
  const [data, setData] = React.useState<Member[]>(initialData);
  const { toast } = useToast();

  const [currentFormattedGymId, setCurrentFormattedGymId] = React.useState<string | null>(null);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = React.useState(false);
  const [memberToEdit, setMemberToEdit] = React.useState<Member | null>(null);
  
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = React.useState(false);
  const [memberForAttendance, setMemberForAttendance] = React.useState<Member | null>(null);
  const [mockAttendanceData, setMockAttendanceData] = React.useState<AttendanceSummary | null>(null);

  const [isBulkEmailDialogOpen, setIsBulkEmailDialogOpen] = React.useState(false);
  const [bulkEmailRecipients, setBulkEmailRecipients] = React.useState<Member[]>([]);


  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const gymId = localStorage.getItem('gymId'); // This is formatted_gym_id
      setCurrentFormattedGymId(gymId);
    }
  }, []);
  
  const gymMembers = React.useMemo(() => {
    if (!currentFormattedGymId) return [];
    return data
      .filter(member => member.gymId === currentFormattedGymId)
      .map(member => ({ ...member, effectiveStatus: getEffectiveMembershipStatus(member) }));
  }, [data, currentFormattedGymId]);


  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    age: false,
    createdAt: false,
    planPrice: false,
    // gymId: false, // Assuming gymId is not for direct display
  });
  const [rowSelection, setRowSelection] = React.useState({});
  const [statusFilter, setStatusFilter] = React.useState<MembershipStatus | 'all'>('all');


  const handleMemberSaved = (savedMember: Member) => {
    setData(prev => {
      const existingIndex = prev.findIndex(m => m.id === savedMember.id);
      if (existingIndex > -1) {
        const updatedData = [...prev];
        updatedData[existingIndex] = savedMember;
        return updatedData;
      }
      return [savedMember, ...prev];
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
    // Simulate fetching attendance data
    const lastCheckin = new Date(Date.now() - Math.random() * 10 * 86400000); // Random date in last 10 days
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


  const columns: ColumnDef<Member & { effectiveStatus: MembershipStatus }>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'memberId',
      header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>Member ID <CaretSortIcon className="ml-2 h-4 w-4" /></Button>,
      cell: ({ row }) => <div className="font-medium">{row.getValue('memberId')}</div>,
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => <div>{row.getValue('name')}</div>,
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => <div>{row.getValue('email') || 'N/A'}</div>,
    },
    {
      accessorKey: 'phoneNumber',
      header: 'Phone',
      cell: ({ row }) => <div>{row.getValue('phoneNumber') || 'N/A'}</div>,
    },
    {
      accessorKey: 'age',
      header: 'Age',
      cell: ({row}) => row.getValue('age') || 'N/A'
    },
    {
      accessorKey: 'effectiveStatus', // Use effectiveStatus for display and filtering
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.effectiveStatus;
        let badgeClass = '';
        if (status === 'active') badgeClass = 'bg-green-600/80 hover:bg-green-600 text-white border-green-700';
        else if (status === 'inactive') badgeClass = 'bg-slate-500 hover:bg-slate-600 text-slate-100 border-slate-600';
        else if (status === 'expired') badgeClass = 'bg-red-600 hover:bg-red-700 text-white border-red-700';
        else if (status === 'pending') badgeClass = 'bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-600';
        else if (status === 'expiring soon') badgeClass = 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600';
        return <Badge className={`capitalize ${badgeClass}`}>{status}</Badge>;
      },
      filterFn: (row, id, value) => value === 'all' || value.includes(row.original.effectiveStatus),
    },
    {
      accessorKey: 'membershipType',
      header: 'Membership Type',
      cell: ({ row }) => <div>{row.getValue('membershipType') || 'N/A'}</div>,
    },
     {
      accessorKey: 'planPrice',
      header: 'Price',
      cell: ({ row }) => row.getValue('planPrice') ? `$${Number(row.getValue('planPrice')).toFixed(2)}` : 'N/A',
    },
    {
      accessorKey: 'joinDate',
      header: 'Join Date',
      cell: ({ row }) => {
        const joinDateVal = row.getValue('joinDate') as string | null;
        return joinDateVal && isValid(parseISO(joinDateVal)) ? format(parseISO(joinDateVal), 'PP') : 'N/A';
      },
    },
    {
      accessorKey: 'expiryDate',
      header: 'Expiry Date',
      cell: ({ row }) => {
        const expiryDateVal = row.getValue('expiryDate') as string | null;
        return expiryDateVal && isValid(parseISO(expiryDateVal)) ? format(parseISO(expiryDateVal), 'PP') : 'N/A';
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Registered On',
      cell: ({row}) => {
        const createdAtVal = row.getValue('createdAt') as string;
        return isValid(parseISO(createdAtVal)) ? format(parseISO(createdAtVal), 'PPpp') : 'Invalid Date';
      }
    },
    {
      id: 'actions',
      enableHiding: false,
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
  ];

  const table = useReactTable({
    data: gymMembers,
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
      pagination: { pageSize: 5 }
    }
  });
  
  React.useEffect(() => {
    table.getColumn('effectiveStatus')?.setFilterValue(statusFilter === 'all' ? undefined : statusFilter);
  }, [statusFilter, table]);


  return (
    <div className="w-full space-y-4">
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
                setBulkEmailRecipients([]); // Clear after "sending"
            }}
        />
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Input
          placeholder="Filter by name, email or Member ID..."
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) => {
            const val = event.target.value;
            table.getColumn('name')?.setFilterValue(val);
            table.getColumn('email')?.setFilterValue(val);
            table.getColumn('memberId')?.setFilterValue(val);
          }}
          className="max-w-xs grow sm:max-w-sm"
        />
        <div className="flex items-center gap-2 flex-wrap">
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Status: <span className="capitalize ml-1 font-semibold">{statusFilter}</span> <ChevronDownIcon className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={statusFilter} onValueChange={(value) => setStatusFilter(value as MembershipStatus | 'all')}>
                <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                {(['active', 'inactive', 'expired', 'pending', 'expiring soon'] as MembershipStatus[]).map(s => (
                  <DropdownMenuRadioItem key={s} value={s} className="capitalize">{s}</DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
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
                    {column.id.replace(/([A-Z])/g, ' $1').trim()}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={table.getFilteredSelectedRowModel().rows.length === 0}>
                Bulk Actions <ChevronDownIcon className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>For Selected ({table.getFilteredSelectedRowModel().rows.length})</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(['active', 'inactive', 'expired', 'pending'] as MembershipStatus[]).map(status => (
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
          <Button onClick={openAddDialog}>
             <PlusCircle className="mr-2 h-4 w-4" /> Add New Member
          </Button>
        </div>
      </div>
      <ScrollArea className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
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
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {currentFormattedGymId ? `No members found for gym ${currentFormattedGymId} matching current filters.` : 'Loading gym data or select a gym...'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
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
