
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
import Link from 'next/link';
import { MoreHorizontal, Trash2, Edit3, Mail, FileText, PlusCircle, UserCheck, Search as SearchIcon, Users, AlertCircle, RefreshCw, BadgeCent, CalendarClock, Clock } from 'lucide-react';
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
import type { Member, MembershipStatus, AttendanceSummary, EffectiveMembershipStatus } from '@/lib/types';
import { AddMemberDialog } from './add-member-dialog';
import { AttendanceOverviewDialog } from './attendance-overview-dialog';
import { BulkEmailDialog } from './bulk-email-dialog';
import { fetchMembers, deleteMemberAction, updateMemberStatusAction, deleteMembersAction, bulkUpdateMemberStatusAction, sendBulkCustomEmailAction, getMemberAttendanceSummary } from '@/app/actions/member-actions';
import { APP_NAME } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


const getEffectiveDisplayStatus = (member: Member): EffectiveMembershipStatus => {
  if (member.membershipStatus === 'expired') {
    return 'expired';
  }

  if (member.expiryDate) {
    const expiry = parseISO(member.expiryDate);
    if (isValid(expiry)) {
      const daysUntilExpiry = differenceInDays(expiry, new Date());
      if (daysUntilExpiry < 0) return 'expired';
      if (daysUntilExpiry <= 14) return 'expiring soon';
      return 'active';
    }
  }

  // Fallback for active status without a valid date or if status is not 'expired'.
  return 'active';
};


export function MembersTable() {
  const [data, setData] = React.useState<Member[]>([]);
  const { toast } = useToast();

  const [currentGymDatabaseId, setCurrentGymDatabaseId] = React.useState<string | null>(null);
  const [isLoadingMembers, setIsLoadingMembers] = React.useState(true);
  const [fetchMembersError, setFetchMembersError] = React.useState<string | null>(null);

  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = React.useState(false);
  const [memberToEdit, setMemberToEdit] = React.useState<Member | null>(null);
  
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = React.useState(false);
  const [memberForAttendance, setMemberForAttendance] = React.useState<Member | null>(null);
  const [attendanceData, setAttendanceData] = React.useState<AttendanceSummary | null>(null);

  const [isBulkEmailDialogOpen, setIsBulkEmailDialogOpen] = React.useState(false);
  const [bulkEmailRecipients, setBulkEmailRecipients] = React.useState<Member[]>([]);
  
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = React.useState(false);


  const loadMembers = React.useCallback(async (gymId: string) => {
    setIsLoadingMembers(true);
    setFetchMembersError(null);
    const response = await fetchMembers(gymId);
    if (response.error || !response.data) {
      setFetchMembersError(response.error || "Failed to load members.");
      setData([]);
    } else {
      // Effective status for display will be calculated on the fly by getEffectiveDisplayStatus
      setData(response.data);
    }
    setIsLoadingMembers(false);
    setRowSelection({}); 
  }, []);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const gymDbId = localStorage.getItem('gymDatabaseId');
      setCurrentGymDatabaseId(gymDbId);
      if (gymDbId) {
        loadMembers(gymDbId);
      } else {
        setIsLoadingMembers(false);
        setData([]); 
        setFetchMembersError("Gym ID not found in local storage. Please log in again.");
      }
    }
  }, [loadMembers]);
  
  const gymMembers = React.useMemo(() => {
    if (!currentGymDatabaseId) return []; 
    return data.filter(member => member.gymId === currentGymDatabaseId);
  }, [data, currentGymDatabaseId]);


  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    email: false,
    age: false,
    phoneNumber: false,
    joinDate: false,
    membershipType: false,
    planPrice: false,
    createdAt: false,
  });
  const [rowSelection, setRowSelection] = React.useState({});
  const [statusFilter, setStatusFilter] = React.useState<EffectiveMembershipStatus | 'all'>('all');


  const handleMemberSaved = (savedMember: Member) => {
    if (currentGymDatabaseId) {
        if (savedMember.gymId === currentGymDatabaseId) {
          const memberExists = data.some(m => m.id === savedMember.id);
          if (memberExists) {
            setData(prevData => prevData.map(m => m.id === savedMember.id ? savedMember : m));
          } else {
            setData(prevData => [savedMember, ...prevData]);
          }
        }
    }
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
  
  const executeDeleteMember = async (memberToDeleteNow: Member) => {
    if (!memberToDeleteNow || !currentGymDatabaseId) return;
    const response = await deleteMemberAction(memberToDeleteNow.id);
    if (response.success) {
      toast({ title: "Member Deleted", description: `${memberToDeleteNow.name} has been removed.` });
      loadMembers(currentGymDatabaseId); 
    } else {
      toast({ variant: "destructive", title: "Error Deleting Member", description: response.error });
    }
  };

  const handleManualStatusUpdate = async (member: Member, newDbStatus: MembershipStatus) => {
    if (!currentGymDatabaseId) return;

    const response = await updateMemberStatusAction(member.id, newDbStatus);
    if (response.updatedMember) {
        toast({ title: "Status Updated", description: `${member.name}'s DB status changed to ${newDbStatus}.` });
        loadMembers(currentGymDatabaseId); 
    } else {
        toast({ variant: "destructive", title: "Error Updating Status", description: response.error });
    }
  };
  
  const handleViewAttendance = async (member: Member) => {
    setMemberForAttendance(member);
    setAttendanceData(null); // Clear previous data to show loading skeleton
    setIsAttendanceDialogOpen(true);

    const response = await getMemberAttendanceSummary(member.id);

    if (response.error || !response.data) {
      toast({
        variant: "destructive",
        title: "Error fetching attendance",
        description: response.error || "Could not load attendance summary."
      });
      setAttendanceData({ totalCheckIns: 0, lastCheckInTime: null, recentCheckIns: [] });
    } else {
      setAttendanceData(response.data);
    }
  };
  
  const handleBulkDelete = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    if (selectedRows.length === 0 || !currentGymDatabaseId) {
      setIsBulkDeleteConfirmOpen(false); 
      return;
    }
    const memberIdsToDelete = selectedRows.map(row => row.original.id);
    const response = await deleteMembersAction(memberIdsToDelete);
    
    toast({ title: "Bulk Delete Processed", description: `${response.successCount} member(s) deleted. ${response.errorCount > 0 ? `${response.errorCount} failed. Error: ${response.error}` : (response.error ? `Error: ${response.error}` : '')}` });
    
    if (response.successCount > 0) {
        loadMembers(currentGymDatabaseId); 
    }
    setRowSelection({}); 
    setIsBulkDeleteConfirmOpen(false);
  };

  const handleBulkStatusUpdate = async (newDbStatus: MembershipStatus) => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    if (selectedRows.length === 0 || !currentGymDatabaseId) {
      return;
    }
    const memberIdsToUpdate = selectedRows.map(row => row.original.id);
    const response = await bulkUpdateMemberStatusAction(memberIdsToUpdate, newDbStatus);

    const description = `${response.successCount} member(s) updated to ${newDbStatus}. ` +
                        `Emails sent: ${response.emailSentCount}. ` +
                        (response.errorCount > 0 ? `${response.errorCount} failed. ` : '') +
                        (response.error ? `Error: ${response.error}` : '');
    
    toast({ 
        title: "Bulk Status Update Processed", 
        description: description.trim()
    });
    
    if (response.successCount > 0) {
        loadMembers(currentGymDatabaseId);
    }
    setRowSelection({});
  };

  const handleOpenBulkEmailDialog = () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    if (selectedRows.length === 0) {
      return;
    }
    setBulkEmailRecipients(selectedRows.map(row => row.original));
    setIsBulkEmailDialogOpen(true);
  };
  
  const filterableDisplayStatuses: (EffectiveMembershipStatus | 'all')[] = ['all', 'active', 'expiring soon', 'expired'];


  const columns: ColumnDef<Member>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="border-primary"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="border-primary"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>Name <CaretSortIcon className="ml-2 h-4 w-4" /></Button>,
      cell: ({ row }) => <div className="font-semibold pl-[5px]">{row.getValue('name')}</div>,
    },
    {
      accessorKey: 'memberId',
      header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>Member ID <CaretSortIcon className="ml-2 h-4 w-4" /></Button>,
      cell: ({ row }) => {
        const memberId = row.getValue('memberId') as string;
        return (
          <div className="text-center relative -left-[20px]">
            <Link href={`/members/${row.original.id}`} className="hover:underline text-primary">
                {memberId}
            </Link>
          </div>
        )
      },
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
      cell: ({ row }) => <div className="capitalize">{row.original.membershipType || 'N/A'}</div>,
    },
    {
      id: 'effectiveDisplayStatus', // New ID for the derived status column
      header: 'Status',
      accessorFn: (row) => getEffectiveDisplayStatus(row), // Use accessorFn to get derived status
      cell: ({ row }) => {
        const status = getEffectiveDisplayStatus(row.original);
        let badgeClass = '';
        if (status === 'active') badgeClass = 'bg-green-500/20 text-green-700 border-green-500/30 hover:bg-green-500/30 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20 dark:hover:bg-green-500/20';
        else if (status === 'expired') badgeClass = 'bg-red-500/20 text-red-700 border-red-500/30 hover:bg-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 dark:hover:bg-red-500/20'; 
        else if (status === 'expiring soon') badgeClass = 'bg-orange-500/20 text-orange-700 border-orange-500/30 hover:bg-orange-500/30 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20 dark:hover:bg-orange-500/20';
        return <div className="text-center relative -left-[10px]"><Badge variant="outline" className={`capitalize ${badgeClass}`}>{status}</Badge></div>;
      },
      filterFn: (row, id, value) => value === 'all' || value.includes(getEffectiveDisplayStatus(row.original)),
    },
    {
      id: 'actions', 
      header: () => <div className="text-center">Actions</div>,
      enableHiding: false,
      cell: ({ row }) => {
        const member = row.original;
        return (
          <div className="text-center">
            <AlertDialog>
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
                  <DropdownMenuLabel>Manual Status</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleManualStatusUpdate(member, 'active')} disabled={member.membershipStatus === 'active'}>
                      <UserCheck className="mr-2 h-4 w-4 text-green-500" />
                      <span>Set to Active</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleManualStatusUpdate(member, 'expired')} disabled={member.membershipStatus === 'expired'} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                      <CalendarClock className="mr-2 h-4 w-4" />
                      <span>Set to Expired</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem 
                        onSelect={(e) => e.preventDefault()} 
                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete Member
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                </DropdownMenuContent>
              </DropdownMenu>
              <AlertDialogContent>
                  <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete {member.name}.
                  </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => executeDeleteMember(member)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      },
    },
    {
      accessorKey: 'planPrice',
      header: 'Price',
      cell: ({ row }) => row.original.planPrice ? `₹${Number(row.original.planPrice).toFixed(2)}` : 'N/A',
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
      pagination: { pageSize: 8 } 
    }
  });
  
  React.useEffect(() => {
    table.getColumn('effectiveDisplayStatus')?.setFilterValue(statusFilter === 'all' ? undefined : statusFilter);
  }, [statusFilter, table]);

  const globalFilter = (table.getColumn('name')?.getFilterValue() as string) ?? '';
  const handleGlobalFilterChange = (value: string) => {
    table.getColumn('name')?.setFilterValue(value); 
  }

  const selectedRowCount = table.getFilteredSelectedRowModel().rows.length;

  return (
    <div className="w-full space-y-4 p-4 md:p-6 bg-card rounded-lg shadow-sm">
      <AddMemberDialog
        isOpen={isAddMemberDialogOpen}
        onOpenChange={setIsAddMemberDialogOpen}
        onMemberSaved={handleMemberSaved}
        memberToEdit={memberToEdit}
      />
       {memberForAttendance && (
        <AttendanceOverviewDialog
          isOpen={isAttendanceDialogOpen}
          onOpenChange={setIsAttendanceDialogOpen}
          member={memberForAttendance}
          attendanceSummary={attendanceData}
        />
      )}
      {isBulkEmailDialogOpen && (
        <BulkEmailDialog
            isOpen={isBulkEmailDialogOpen}
            onOpenChange={setIsBulkEmailDialogOpen}
            recipients={bulkEmailRecipients}
            onSend={async (subject, body, includeQrCode) => {
                if (bulkEmailRecipients.length === 0 || !currentGymDatabaseId) {
                    toast({ variant: "destructive", title: "Error", description: "No recipients or gym context."});
                    return;
                }
                const gymName = localStorage.getItem('gymName') || APP_NAME;
                const memberDbIds = bulkEmailRecipients.map(r => r.id);
                const response = await sendBulkCustomEmailAction(memberDbIds, subject, body, gymName, includeQrCode, currentGymDatabaseId);

                if (response.error) {
                    toast({ variant: "destructive", title: "Email Sending Error", description: response.error });
                } else {
                    toast({
                        title: "Bulk Email Processed",
                        description: `Emails attempted: ${response.attempted}. Successful: ${response.successful}. No email address: ${response.noEmailAddress}. Failed: ${response.failed}.`
                    });
                }
                setBulkEmailRecipients([]);
                setRowSelection({});
            }}
        />
      )}

      {/* Main Controls Header */}
      <div className="flex flex-col gap-4">
        {/* Top row: Title and primary filters */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">All Members ({table.getFilteredRowModel().rows.length})</h2>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
            <div className="relative w-full sm:w-auto sm:flex-grow">
              <SearchIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filter by name..."
                value={globalFilter} 
                onChange={(event) => handleGlobalFilterChange(event.target.value)} 
                className="w-full pl-9 h-10"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-10 w-full justify-between sm:w-auto">
                    {statusFilter === 'all' ? 'All Statuses' : <span className="capitalize">{statusFilter}</span>}
                    <ChevronDownIcon className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={statusFilter} onValueChange={(value) => setStatusFilter(value as EffectiveMembershipStatus | 'all')}>
                    {filterableDisplayStatuses.map(s => (
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
        </div>

        {/* Second row: Secondary actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              {currentGymDatabaseId && !isLoadingMembers && (
                   <Button variant="ghost" size="sm" onClick={() => {if(currentGymDatabaseId) loadMembers(currentGymDatabaseId);}}>
                      <RefreshCw className="mr-2 h-4 w-4" /> Refresh List
                  </Button>
              )}
            </div>
            <AlertDialog>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
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
                            {column.id.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={selectedRowCount === 0} className="w-full sm:w-auto">
                        Actions ({selectedRowCount}) <ChevronDownIcon className="ml-2 h-4 w-4" />
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Bulk Actions</DropdownMenuLabel>
                    <DropdownMenuItem 
                        onClick={() => {
                            const selectedMember = table.getFilteredSelectedRowModel().rows[0]?.original;
                            if (selectedMember) openEditDialog(selectedMember);
                        }}
                        disabled={selectedRowCount !== 1}
                    >
                        <Edit3 className="mr-2 h-4 w-4" /> Edit Member
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleOpenBulkEmailDialog} disabled={selectedRowCount === 0}>
                        <Mail className="mr-2 h-4 w-4" /> Send Custom Email
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleBulkStatusUpdate('active')} disabled={selectedRowCount === 0}>
                        <UserCheck className="mr-2 h-4 w-4 text-green-500" />
                        Set selected to Active
                    </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => handleBulkStatusUpdate('expired')} disabled={selectedRowCount === 0} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                        <CalendarClock className="mr-2 h-4 w-4" />
                        Set selected to Expired
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <AlertDialogTrigger asChild>
                          <DropdownMenuItem 
                            onSelect={(e) => { e.preventDefault(); if (selectedRowCount > 0) setIsBulkDeleteConfirmOpen(true); }}
                            className="text-destructive focus:text-destructive"
                            disabled={selectedRowCount === 0}
                        >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Selected ({selectedRowCount})
                        </DropdownMenuItem>
                    </AlertDialogTrigger>
                    </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <AlertDialogContent>
                  <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Bulk Deletion</AlertDialogTitle>
                  <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete {selectedRowCount} selected member(s).
                  </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setIsBulkDeleteConfirmOpen(false)}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90">Delete Selected</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>
      </div>

      <div className="rounded-md overflow-x-auto"> 
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
            {isLoadingMembers ? (
                Array.from({length: 5}).map((_, rowIndex) => (
                    <TableRow key={`skeleton-row-${rowIndex}`}>
                        {columns.map((_colDef, colIndex) => (
                            <TableCell key={`skeleton-cell-row-${rowIndex}-col-${colIndex}`}>
                                <Skeleton className="h-5 w-full" />
                            </TableCell>
                        ))}
                    </TableRow>
                ))
            ) : fetchMembersError ? (
                <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center text-destructive">
                       <AlertCircle className="mx-auto h-8 w-8 mb-2"/> Error: {fetchMembersError}
                    </TableCell>
                </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} style={{verticalAlign: 'middle', padding: '12px 16px', lineHeight: 1.5}}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {currentGymDatabaseId ? `No members found for this gym.` : 'Login to view members or add a new one.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {selectedRowCount} of{' '}
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
