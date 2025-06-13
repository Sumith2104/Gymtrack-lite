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
import type { Member } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { AddMemberDialog } from './add-member-dialog';
import { ScrollArea } from '../ui/scroll-area';

const initialData: Member[] = [
  { id: '1', memberId: 'MBR001', name: 'Alice Johnson', email: 'alice@example.com', status: 'active', lastCheckIn: new Date(Date.now() - 86400000).toISOString(), gymId: 'GYM123', qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=MBR001' },
  { id: '2', memberId: 'MBR002', name: 'Bob Smith', email: 'bob@example.com', status: 'inactive', lastCheckIn: new Date(Date.now() - 86400000 * 5).toISOString(), gymId: 'GYM123', qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=MBR002' },
  { id: '3', memberId: 'MBR003', name: 'Carol White', email: 'carol@example.com', status: 'expired', lastCheckIn: null, gymId: 'GYM123', qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=MBR003' },
  { id: '4', memberId: 'MBR004', name: 'David Brown', email: 'david@example.com', status: 'active', lastCheckIn: new Date(Date.now() - 86400000 * 2).toISOString(), gymId: 'GYM123', qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=MBR004' },
  // Add more mock members if needed
];


export function MembersTable() {
  const [data, setData] = React.useState<Member[]>(initialData);
  const { toast } = useToast();

  const gymId = typeof window !== 'undefined' ? localStorage.getItem('gymId') || 'GYM123' : 'GYM123';
  const gymMembers = data.filter(member => member.gymId === gymId);


  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const handleDeleteMember = (memberId: string) => {
    // Mock delete
    setData(prev => prev.filter(m => m.id !== memberId));
    toast({ title: "Member Deleted", description: `Member ${memberId} has been removed.` });
  };
  
  const handleEditMember = (member: Member) => {
    // Mock edit - in real app, open a dialog with member data
    toast({ title: "Edit Member", description: `Editing ${member.name}. (Not implemented)` });
  };

  const handleSendCustomEmail = (member: Member) => {
    toast({ title: "Send Email", description: `Sending custom email to ${member.name}. (Not implemented)` });
  };

  const handleViewAttendance = (member: Member) => {
    toast({ title: "Attendance Summary", description: `Viewing attendance for ${member.name}. (Not implemented)` });
  };
  
  const handleBulkDelete = () => {
    const selectedIds = table.getFilteredSelectedRowModel().rows.map(row => row.original.id);
    if (selectedIds.length === 0) {
      toast({ title: "No members selected", variant: "destructive" });
      return;
    }
    setData(prev => prev.filter(m => !selectedIds.includes(m.id)));
    toast({ title: "Bulk Delete", description: `${selectedIds.length} members deleted.` });
    setRowSelection({});
  };

  const handleBulkStatusUpdate = (status: Member['status']) => {
    const selectedIds = table.getFilteredSelectedRowModel().rows.map(row => row.original.id);
     if (selectedIds.length === 0) {
      toast({ title: "No members selected", variant: "destructive" });
      return;
    }
    setData(prev => prev.map(m => selectedIds.includes(m.id) ? { ...m, status } : m));
    toast({ title: "Bulk Status Update", description: `${selectedIds.length} members updated to ${status}.` });
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
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        let badgeVariant: 'default' | 'secondary' | 'destructive' = 'default';
        if (status === 'inactive') badgeVariant = 'secondary';
        if (status === 'expired') badgeVariant = 'destructive';
        return <Badge variant={badgeVariant} className="capitalize">{status}</Badge>;
      },
    },
    {
      accessorKey: 'lastCheckIn',
      header: 'Last Check-in',
      cell: ({ row }) => {
        const lastCheckIn = row.getValue('lastCheckIn') as string | null;
        return lastCheckIn ? new Date(lastCheckIn).toLocaleDateString() : 'N/A';
      },
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
  });

  const handleMemberAdded = (newMember: Member) => {
    setData((prev) => [newMember, ...prev]);
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Input
          placeholder="Filter by name or email..."
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) => {
            table.getColumn('name')?.setFilterValue(event.target.value);
            table.getColumn('email')?.setFilterValue(event.target.value);
          }}
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                Bulk Actions <ChevronDownIcon className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleBulkStatusUpdate('active')}>Set Active</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatusUpdate('inactive')}>Set Inactive</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatusUpdate('expired')}>Set Expired</DropdownMenuItem>
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
                  No members found.
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
