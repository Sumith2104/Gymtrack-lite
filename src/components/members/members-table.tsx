
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
import { MoreHorizontal, Trash2, Edit3, Mail, FileText, PlusCircle, UserX, UserCheck, MailWarning, UserCog, Search as SearchIcon, Users, AlertCircle, RefreshCw } from 'lucide-react';
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal
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
import type { Member, MembershipStatus, AttendanceSummary } from '@/lib/types';
import { AddMemberDialog } from './add-member-dialog';
import { AttendanceOverviewDialog } from './attendance-overview-dialog';
import { BulkEmailDialog } from './bulk-email-dialog';
import { fetchMembers, deleteMemberAction, updateMemberStatusAction, deleteMembersAction, bulkUpdateMemberStatusAction, sendBulkCustomEmailAction } from '@/app/actions/member-actions';
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
  const [data, setData] = React.useState<Member[]>([]);
  const { toast } = useToast();

  const [currentGymDatabaseId, setCurrentGymDatabaseId] = React.useState<string | null>(null);
  const [isLoadingMembers, setIsLoadingMembers] = React.useState(true);
  const [fetchMembersError, setFetchMembersError] = React.useState<string | null>(null);

  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = React.useState(false);
  const [memberToEdit, setMemberToEdit] = React.useState<Member | null>(null);
  
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = React.useState(false);
  const [memberForAttendance, setMemberForAttendance] = React.useState<Member | null>(null);
  const [mockAttendanceData, setMockAttendanceData] = React.useState<AttendanceSummary | null>(null);

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
      setData(response.data.map(m => ({ ...m, effectiveStatus: getEffectiveMembershipStatus(m) })));
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
    planPrice: false,
    createdAt: false, 
    age: false,
    phoneNumber: false,
  });
  const [rowSelection, setRowSelection] = React.useState({});
  const [statusFilter, setStatusFilter] = React.useState<MembershipStatus | 'all'>('all');


  const handleMemberSaved = (savedMember: Member) => {
    if (currentGymDatabaseId) {
        if (savedMember.gymId === currentGymDatabaseId) {
          const memberExists = data.some(m => m.id === savedMember.id);
          if (memberExists) {
            setData(prevData => prevData.map(m => m.id === savedMember.id ? {...savedMember, effectiveStatus: getEffectiveMembershipStatus(savedMember) } : m));
          } else {
            setData(prevData => [{...savedMember, effectiveStatus: getEffectiveMembershipStatus(savedMember)}, ...prevData]);
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

  const handleManualStatusUpdate = async (member: Member, newStatus: MembershipStatus) => {
     if (newStatus === 'expiring soon') {
        toast({ title: "Invalid Action", description: "'Expiring Soon' is an automatically derived status.", variant: "destructive" });
        return;
    }
    if (!currentGymDatabaseId) return;

    const response = await updateMemberStatusAction(member.id, newStatus);
    if (response.updatedMember) {
        toast({ title: "Status Updated", description: `${member.name}'s status changed to ${newStatus}.` });
        loadMembers(currentGymDatabaseId); 
        console.log(`SIMULATING: Email notification to ${member.email} about status change to ${newStatus}.`);
    } else {
        toast({ variant: "destructive", title: "Error Updating Status", description: response.error });
    }
  };
  
  const handleViewAttendance = (member: Member) => {
    setMemberForAttendance(member);
    const lastCheckin = new Date(Date.now() - Math.random() * 10 * 86400000); 
    const recentCheckins = Array.from({length: Math.floor(Math.random()* 5) +1 }, (_, i) => new Date(lastCheckin.getTime() - i * Math.random() * 3 * 86400000));
    setMockAttendanceData({
        totalCheckIns: Math.floor(Math.random() * 100) + 5,
        lastCheckInTime: recentCheckins.length > 0 ? recentCheckins[0] : null,
        recentCheckIns: recentCheckins.sort((a,b) => b.getTime() - a.getTime()),
    });
    setIsAttendanceDialogOpen(true);
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

  const handleBulkStatusUpdate = async (newStatus: MembershipStatus) => {
    if (newStatus === 'expiring soon') {
        toast({ title: "Invalid Action", description: "'Expiring Soon' is an automatically derived status for bulk actions.", variant: "destructive" });
        return;
    }
    const selectedRows = table.getFilteredSelectedRowModel().rows;
     if (selectedRows.length === 0 || !currentGymDatabaseId) {
      return;
    }
    const memberIdsToUpdate = selectedRows.map(row => row.original.id);
    const response = await bulkUpdateMemberStatusAction(memberIdsToUpdate, newStatus);

    toast({ title: "Bulk Status Update Processed", description: `${response.successCount} member(s) status updated to ${newStatus}. ${response.errorCount > 0 ? `${response.errorCount} failed. Error: ${response.error}`: (response.error ? `Error: ${response.error}` : '')}` });
    
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

  const filterableStatusesForDropdown: (MembershipStatus | 'all')[] = ['all', 'active', 'expiring soon', 'expired', 'inactive', 'pending'];


  const columns: ColumnDef<Member & { effectiveStatus?: MembershipStatus }>[] = [
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
      cell: ({ row }) => <div className="capitalize">{row.original.membershipType || 'N/A'}</div>,
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
      header: 'Actions',
      enableHiding: false,
      cell: ({ row }) => {
        const member = row.original;
        return (
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
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                      <UserCog className="mr-2 h-4 w-4" />
                      <span>Change Status</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                          {(['active', 'inactive', 'pending', 'expired'] as MembershipStatus[]).map(s => (
                              <DropdownMenuItem key={s} onClick={() => handleManualStatusUpdate(member, s)} disabled={s === member.membershipStatus || s === 'expiring soon'}>
                              {s === 'active' && <UserCheck className="mr-2 h-4 w-4 text-green-500" />}
                              {s === 'inactive' && <UserX className="mr-2 h-4 w-4 text-slate-500" />}
                              {s === 'pending' && <UserCog className="mr-2 h-4 w-4 text-yellow-500" />}
                              {s === 'expired' && <MailWarning className="mr-2 h-4 w-4 text-red-500" />}
                              Set to {s.charAt(0).toUpperCase() + s.slice(1)}
                              </DropdownMenuItem>
                          ))}
                      </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
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
    table.getColumn('effectiveStatus')?.setFilterValue(statusFilter === 'all' ? undefined : statusFilter);
  }, [statusFilter, table]);

  const globalFilter = (table.getColumn('name')?.getFilterValue() as string) ?? '';
  const handleGlobalFilterChange = (value: string) => {
    table.getColumn('name')?.setFilterValue(value); 
  }

  const selectedRowCount = table.getFilteredSelectedRowModel().rows.length;

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
                const response = await sendBulkCustomEmailAction(memberDbIds, subject, body, gymName, includeQrCode);

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

      <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
        <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">All Members ({table.getFilteredRowModel().rows.length})</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter by name..."
              value={globalFilter} 
              onChange={(event) => handleGlobalFilterChange(event.target.value)} 
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
                {filterableStatusesForDropdown.map(s => (
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
      
       <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            {currentGymDatabaseId && !isLoadingMembers && (
                 <Button variant="ghost" size="sm" onClick={() => {if(currentGymDatabaseId) loadMembers(currentGymDatabaseId);}}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Refresh List
                </Button>
            )}
          </div>
          <AlertDialog>
            <div className="flex items-center gap-2">
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
                          {column.id.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </DropdownMenuCheckboxItem>
                      ))}
                  </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={selectedRowCount === 0}>
                      Actions for Selected ({selectedRowCount}) <ChevronDownIcon className="ml-2 h-4 w-4" />
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
                  <DropdownMenuSeparator />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                          <UserCog className="mr-2 h-4 w-4" />
                          <span>Set Status To</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                          <DropdownMenuSubContent>
                          {(['active', 'inactive', 'expired', 'pending'] as MembershipStatus[]).map(status => (
                              <DropdownMenuItem key={status} onClick={() => handleBulkStatusUpdate(status)} className="capitalize">
                              {status === 'active' && <UserCheck className="mr-2 h-4 w-4 text-green-500" />}
                              {status === 'inactive' && <UserX className="mr-2 h-4 w-4 text-slate-500" />}
                              {status === 'pending' && <UserCog className="mr-2 h-4 w-4 text-yellow-500" />}
                              {status === 'expired' && <MailWarning className="mr-2 h-4 w-4 text-red-500" />}
                              {status}
                              </DropdownMenuItem>
                          ))}
                          </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                  </DropdownMenuSub>
                  <DropdownMenuItem onClick={handleOpenBulkEmailDialog} disabled={selectedRowCount === 0}>
                      <Mail className="mr-2 h-4 w-4" /> Send Custom Email
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
            {isLoadingMembers ? (
                Array.from({length: 5}).map((_, rowIndex) => (
                    <TableRow key={`skeleton-row-${rowIndex}`}>
                        {columns.map((_colDef, colIndex) => (
                            <TableCell key={`skeleton-cell-row-${rowIndex}-col-${colIndex}`} className="px-3 py-3">
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
                    <TableCell key={cell.id} className="whitespace-nowrap px-3 py-3 text-sm">
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
