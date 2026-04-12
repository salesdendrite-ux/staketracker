import { useState, useMemo } from 'react';
import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, getPaginationRowModel, flexRender } from '@tanstack/react-table';
import { ArrowUpDown, ExternalLink, Search, Pencil, UserMinus, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import StatusBadge from './StatusBadge';

export default function StakeholderTable({ data, onEdit, onDelete, statusFilter, onStatusFilter }) {
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo(() => [
    {
      accessorKey: 'full_name',
      header: ({ column }) => (
        <button className="flex items-center gap-1 font-semibold" onClick={() => column.toggleSorting()}>
          Name <ArrowUpDown className="w-3 h-3 text-gray-400" />
        </button>
      ),
      cell: ({ row }) => <span className="font-medium text-gray-900">{row.original.full_name}</span>,
    },
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <button className="flex items-center gap-1 font-semibold" onClick={() => column.toggleSorting()}>
          Title <ArrowUpDown className="w-3 h-3 text-gray-400" />
        </button>
      ),
      cell: ({ row }) => <span className="text-gray-600">{row.original.title || '—'}</span>,
    },
    {
      accessorKey: 'reports_to_name',
      header: 'Reports To',
      cell: ({ row }) => (
        <span className="text-gray-600">{row.original.resolved_reports_to_name || row.original.reports_to_name || '—'}</span>
      ),
    },
    {
      accessorKey: 'linkedin_url',
      header: 'LinkedIn',
      cell: ({ row }) =>
        row.original.linkedin_url ? (
          <a href={row.original.linkedin_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-brand-500 hover:text-brand-600 text-xs font-medium">
            <ExternalLink className="w-3.5 h-3.5" /> Profile
          </a>
        ) : <span className="text-gray-300">—</span>,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <button className="flex items-center gap-1 font-semibold" onClick={() => column.toggleSorting()}>
          Status <ArrowUpDown className="w-3 h-3 text-gray-400" />
        </button>
      ),
      cell: ({ row }) => (
        <StatusBadge status={row.original.status} firstSeenAt={row.original.first_seen_at} markedInactiveAt={row.original.marked_inactive_at} />
      ),
    },
    {
      accessorKey: 'last_seen_at',
      header: 'Last Updated',
      cell: ({ row }) =>
        row.original.last_seen_at ? (
          <span className="text-gray-500 text-xs">{formatDistanceToNow(new Date(row.original.last_seen_at), { addSuffix: true })}</span>
        ) : '—',
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button onClick={() => onEdit?.(row.original)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Edit">
            <Pencil className="w-3.5 h-3.5 text-gray-400" />
          </button>
          {row.original.status !== 'inactive' && (
            <button onClick={() => onDelete?.(row.original)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors" title="Mark inactive">
              <UserMinus className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
            </button>
          )}
        </div>
      ),
    },
  ], [onEdit, onDelete]);

  const filteredData = useMemo(() => {
    if (!statusFilter) return data;
    return data.filter((s) => s.status === statusFilter);
  }, [data, statusFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text" placeholder="Search by name…"
            value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {['', 'active', 'new', 'inactive'].map((s) => (
            <button key={s} onClick={() => onStatusFilter?.(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${statusFilter === s ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-gray-100">
                  {hg.headers.map((h) => (
                    <th key={h.id} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400">
                    No stakeholders found
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 text-sm">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {table.getPageCount() > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}
                className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}
                className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
