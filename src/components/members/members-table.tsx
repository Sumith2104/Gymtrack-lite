
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
import { MoreHorizontal, Trash2, Edit3, Mail, FileText } from 'lucide-react';

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
import type { Member, MembershipStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { AddMemberDialog } from './add-member-dialog';
import { ScrollArea } from '../ui/scroll-area';
import { format } from 'date-fns';

const initialData: Member[] = [
  { id: 'member_uuid_1', memberId: 'MBR001', name: 'Alice Johnson', email: 'alice@example.com', membershipStatus: 'active', gymId: 'GYM123_default', createdAt: new Date(Date.now() - 86400000 * 10).toISOString(), joinDate: new Date(Date.now() - 86400000 * 10).toISOString(), expiryDate: new Date(Date.now() + 86400000 * 355).toISOString(), phoneNumber: '123-456-7890', membershipType: 'Annual' },
  { id: 'member_uuid_2', memberId: 'MBR002', name: 'Bob Smith', email: 'bob@example.com', membershipStatus: 'inactive', gymId: 'GYM123_default', createdAt: new Date(Date.now() - 86400000 * 20).toISOString(), joinDate: new Date(Date.now() - 86400000 * 20).toISOString(), phoneNumber: '234-567-8901', membershipType: 'Monthly' },
  { id: 'member_uuid_3', memberId: 'MBR003', name: 'Carol White', email: 'carol@example.com', membershipStatus: 'expired', gymId: 'GYM123_default', createdAt: new Date(Date.now() - 86400000 * 30).toISOString(), joinDate: new Date(Date.now() - 86400000 * 30).toISOString(), expiryDate: new Date(Date.now() - 86400000 * 5).toISOString(), membershipType: 'Monthly'},
  { id: 'member_uuid_4', memberId: 'MBR004', name: 'David Brown', email: 'david@example.com', membershipStatus: 'active', gymId: 'GYM123_default', createdAt: new Date(Date.now() - 86400000 * 15).toISOString(), joinDate: new Date(Date.now() - 86400000 * 15).toISOString(), phoneNumber: '345-678-9012', membershipType: '6-Month'},
  { id: 'member_uuid_5', memberId: 'MBR005', name: 'Sumith Member', email: 'sumith.member@example.com', membershipStatus: 'active', gymId: 'UOFIPOIB', createdAt: new Date().toISOString(), joinDate: new Date().toISOString(), expiryDate: new Date(Date.now() + 86400000 * 30).toISOString(), phoneNumber: '555-555-5555', membershipType: 'Annual' },
];


export function MembersTable() {
  const [data, setData] = React.useState<Member[]>(initialData);
  const { toast } = useToast();

  const [currentFormattedGymId, setCurrentFormattedGymId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentFormattedGymId(localStorage.getItem('gymId'));
    }
  }, []);
  
  const gymMembers = React.useMemo(() => {
    if (!currentFormattedGymId) return [];
    return data.filter(member => member.gymId === currentFormattedGymId);
  }, [data, currentFormattedGymId]);


  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
     // Default hidden columns
    'age': false,
    'createdAt': false,
  });
  const [rowSelection, setRowSelection] = React.useState({});

  const handleDeleteMember = (memberIdToDelete: string) => {
    setData(prev => prev.filter(m => m.id !== memberIdToDelete));
    toast({ title: "Member Deleted", description: `Member has been removed. (Simulated)` });
  };
  
  const handleEditMember = (member: Member) => {
    // In real app, open a dialog with member data for editing
    // For now, this could be AddMemberDialog pre-filled, or a new EditMemberDialog
    toast({ title: "Edit Member", description: `Editing ${member.name}. (UI for editing not fully implemented here)` });
  };

  const handleSendCustomEmail = (member: Member) => {
    toast({ title: "Send Email", description: `Simulating sending email to ${member.name}.` });
  };

  const handleViewAttendance = (member: Member) => {
    toast({ title: "Attendance Summary", description: `Simulating viewing attendance for ${member.name}.` });
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

  const handleBulkStatusUpdate = (status: MembershipStatus) => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
     if (selectedRows.length === 0) {
      toast({ title: "No members selected", variant: "destructive", description: "Please select members to update." });
      return;
    }
    const selectedIds = selectedRows.map(row => row.original.id);
    setData(prev => prev.map(m => selectedIds.includes(m.id) ? { ...m, membershipStatus: status } : m));
    toast({ title: "Bulk Status Update", description: `${selectedIds.length} member(s) updated to ${status}. (Simulated)` });
    setRowSelection({});
  };

  const columns: ColumnDef<Member>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
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
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Member ID
          <CaretSortIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
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
      cell: ({ row }) => <div>{row.getValue('email')}</div>,
    },
    {
      accessorKey: 'phoneNumber',
      header: 'Phone',
      cell: ({ row }) => <div>{row.getValue('phoneNumber') || 'N/A'}</div>,
    },
    {
      accessorKey: 'membershipStatus',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('membershipStatus') as MembershipStatus;
        let badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default'; // active
        if (status === 'inactive') badgeVariant = 'secondary';
        if (status === 'expired') badgeVariant = 'destructive';
        if (status === 'pending') badgeVariant = 'outline';
        return <Badge variant={badgeVariant} className="capitalize">{status}</Badge>;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      }
    },
    {
      accessorKey: 'membershipType',
      header: 'Membership Type',
      cell: ({ row }) => <div>{row.getValue('membershipType') || 'N/A'}</div>,
    },
    {
      accessorKey: 'joinDate',
      header: 'Join Date',
      cell: ({ row }) => {
        const joinDate = row.getValue('joinDate') as string | null;
        return joinDate ? format(new Date(joinDate), 'PP') : 'N/A';
      },
    },
    {
      accessorKey: 'expiryDate',
      header: 'Expiry Date',
      cell: ({ row }) => {
        const expiryDate = row.getValue('expiryDate') as string | null;
        return expiryDate ? format(new Date(expiryDate), 'PP') : 'N/A';
      },
    },
    {
      accessorKey: 'age', // For filtering and potential display
      header: 'Age',
      cell: ({row}) => row.getValue('age') || 'N/A'
    },
    {
      accessorKey: 'createdAt', // For filtering and potential display
      header: 'Registered On',
      cell: ({row}) => format(new Date(row.getValue('createdAt')), 'PPpp')
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
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleEditMember(member)}>
                <Edit3 className="mr-2 h-4 w-4" /> Edit Member
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSendCustomEmail(member)}>
                <Mail className="mr-2 h-4 w-4" /> Send Email
              </DropdownMenuItem>
               <DropdownMenuItem onClick={() => handleViewAttendance(member)}>
                <FileText className="mr-2 h-4 w-4" /> Attendance Summary
              </DropdownMenuItem>
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

  const handleMemberAdded = (newMember: Member) => {
    // Ensure new member gets the current gym's ID if not already set (it should be by AddMemberDialog)
    const gymIdForNewMember = newMember.gymId || currentFormattedGymId || 'GYM123_default';
    setData((prev) => [{ ...newMember, gymId: gymIdForNewMember }, ...prev]);
    if (gymIdForNewMember === currentFormattedGymId) {
      // Only re-render if it matches current gym, this logic is covered by useMemo for gymMembers
    }
  };
  
  const globalFilter = (table.getColumn('name')?.getFilterValue() as string) ?? '';
  React.useEffect(() => {
    const nameFilter = globalFilter;
    table.getColumn('name')?.setFilterValue(nameFilter);
    table.getColumn('email')?.setFilterValue(nameFilter); // Assuming you want to filter email by the same global input
    table.getColumn('memberId')?.setFilterValue(nameFilter); // And memberId
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalFilter]); // Only re-run if globalFilter string changes

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Input
          placeholder="Filter by name, email or Member ID..."
          value={globalFilter}
          onChange={(event) => {
            const value = event.target.value;
            // This will trigger the useEffect above to apply filter to multiple columns
             table.getColumn('name')?.setFilterValue(value);
             // To make filtering work on multiple columns at once you might need a custom global filter function or apply to each column you want
             // For simplicity here, we will filter on name, and you can expand if needed
          }}
          className="max-w-sm grow"
        />
        <div className="flex items-center gap-2 flex-wrap">
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Columns <ChevronDownIcon className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Bulk Actions <ChevronDownIcon className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(['active', 'inactive', 'expired', 'pending'] as MembershipStatus[]).map(status => (
                 <DropdownMenuItem key={status} onClick={() => handleBulkStatusUpdate(status)} className="capitalize">Set Selected to {status}</DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleBulkDelete} className="text-destructive focus:text-destructive">Delete Selected</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <AddMemberDialog onMemberAdded={handleMemberAdded} />
        </div>
      </div>
      <ScrollArea className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {currentFormattedGymId ? 'No members found for this gym.' : 'Loading gym data...'}
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

