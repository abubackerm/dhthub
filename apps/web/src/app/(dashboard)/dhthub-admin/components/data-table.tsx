"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns2,
  EllipsisVertical,
  Search,
} from "lucide-react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table"
import { format } from "date-fns"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  useAdminEnquiries,
  type EnquiryStatus,
} from "@/lib/api/enquiry"
import { StatusBadge } from "../orders/components/status-badge"

const formatCurrency = (amount: number | null) => {
  if (amount === null) return "—"
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount)
}

const orderSchema = z.object({
  id: z.string(),
  enquiryNumber: z.string().nullable(),
  customerName: z.string(),
  companyName: z.string().nullable(),
  email: z.string(),
  phone: z.string().nullable(),
  status: z.string(),
  grandTotal: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === 'string' ? parseFloat(val) : val))
    .nullable(),
  itemCount: z.number(),
  createdAt: z.string(),
})

const recentOrdersColumns: ColumnDef<z.infer<typeof orderSchema>>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "enquiryNumber",
    header: "Order #",
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        {row.original.enquiryNumber || "—"}
      </span>
    ),
  },
  {
    accessorKey: "customerName",
    header: "Customer",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.customerName}</span>
    ),
  },
  {
    accessorKey: "companyName",
    header: "Company",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.companyName || "—"}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge status={row.original.status as EnquiryStatus} />
    ),
  },
  {
    accessorKey: "grandTotal",
    header: () => <div className="w-full text-right">Total</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {formatCurrency(row.original.grandTotal)}
      </div>
    ),
  },
  {
    accessorKey: "itemCount",
    header: "Items",
    cell: ({ row }) => (
      <Badge variant="outline" className="text-muted-foreground px-1.5">
        {row.original.itemCount}
      </Badge>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {format(new Date(row.original.createdAt), "MMM dd, yyyy")}
      </span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="data-[state=open]:bg-muted text-muted-foreground flex size-8 cursor-pointer"
            size="icon"
          >
            <EllipsisVertical />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem>View Details</DropdownMenuItem>
          <DropdownMenuItem>Update Status</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">Cancel Order</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]

const statusLabels: Record<EnquiryStatus, string> = {
  SUBMITTED: "Submitted",
  IN_PROGRESS: "In Progress",
  QUOTED: "Quoted",
  AWAITING_CONFIRMATION: "Awaiting Confirmation",
  CONFIRMED: "Confirmed",
  PAYMENT_PENDING: "Payment Pending",
  PAID: "Paid",
  PROCESSING: "Processing",
  IN_TRANSIT: "In Transit",
  DELIVERED: "Delivered",
}

const statusOrder: EnquiryStatus[] = [
  "SUBMITTED",
  "IN_PROGRESS",
  "QUOTED",
  "AWAITING_CONFIRMATION",
  "CONFIRMED",
  "PAYMENT_PENDING",
  "PAID",
  "PROCESSING",
  "IN_TRANSIT",
  "DELIVERED",
]

export function DataTable() {
  const router = useRouter()
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<EnquiryStatus | "all">("all")

  const { data: enquiriesData, isLoading } = useAdminEnquiries({
    search: searchQuery || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    page: String(pagination.pageIndex + 1),
    limit: String(pagination.pageSize),
  })

  const orders = React.useMemo(() => {
    if (!enquiriesData?.enquiries) return []
    return enquiriesData.enquiries.map((e) => orderSchema.parse(e))
  }, [enquiriesData])

  const orderStatusGroups = React.useMemo(() => {
    if (!enquiriesData?.enquiries) return []
    const groups: { status: EnquiryStatus; count: number; orders: z.infer<typeof orderSchema>[] }[] = []
    const grouped = new Map<EnquiryStatus, z.infer<typeof orderSchema>[]>()

    for (const enquiry of enquiriesData.enquiries) {
      const status = enquiry.status as EnquiryStatus
      if (!grouped.has(status)) {
        grouped.set(status, [])
      }
      grouped.get(status)!.push(orderSchema.parse(enquiry))
    }

    for (const status of statusOrder) {
      const statusOrders = grouped.get(status)
      if (statusOrders && statusOrders.length > 0) {
        groups.push({ status, count: statusOrders.length, orders: statusOrders })
      }
    }

    return groups
  }, [enquiriesData])

  const recentOrdersTable = useReactTable({
    data: orders,
    columns: recentOrdersColumns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    manualPagination: true,
    pageCount: Math.ceil((enquiriesData?.total || 0) / pagination.pageSize),
  })

  const handleRowClick = (id: string) => {
    router.push(`/dhthub-admin/orders/${id}`)
  }

  return (
    <Tabs
      defaultValue="recent-orders"
      className="w-full flex-col justify-start gap-6"
    >
      <div className="flex items-center justify-between px-4 lg:px-6 flex-wrap gap-3">
        <Label htmlFor="view-selector" className="sr-only">
          View
        </Label>
        <Select defaultValue="recent-orders">
          <SelectTrigger
            className="flex w-fit sm:hidden cursor-pointer"
            size="sm"
            id="view-selector"
          >
            <SelectValue placeholder="Select a view" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent-orders">Recent Orders</SelectItem>
            <SelectItem value="order-status">Order Status</SelectItem>
          </SelectContent>
        </Select>
        <TabsList className="**:data-[slot=badge]:bg-muted-foreground/30 hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 sm:flex">
          <TabsTrigger value="recent-orders" className="cursor-pointer">
            Recent Orders
            {enquiriesData?.total ? (
              <Badge variant="secondary">{enquiriesData.total}</Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="order-status" className="cursor-pointer">
            Order Status
            {orderStatusGroups.length > 0 ? (
              <Badge variant="secondary">{orderStatusGroups.length}</Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="cursor-pointer">
                <Columns2 />
                <span className="hidden lg:inline">Customize Columns</span>
                <span className="lg:hidden">Columns</span>
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {recentOrdersTable
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" &&
                    column.getCanHide()
                )
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
        </div>
      </div>
      <TabsContent
        value="recent-orders"
        className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
      >
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPagination((prev) => ({ ...prev, pageIndex: 0 }))
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as EnquiryStatus | "all")
              setPagination((prev) => ({ ...prev, pageIndex: 0 }))
            }}
          >
            <SelectTrigger className="w-[180px] cursor-pointer">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statusOrder.map((status) => (
                <SelectItem key={status} value={status}>
                  {statusLabels[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-hidden rounded-lg border">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {searchQuery || statusFilter !== "all"
                ? "No orders found"
                : "No orders yet"}
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted sticky top-0 z-10">
                {recentOrdersTable.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} colSpan={header.colSpan}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="**:data-[slot=table-cell]:first:w-8">
                {recentOrdersTable.getRowModel().rows?.length ? (
                  recentOrdersTable.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(row.original.id)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          onClick={(e) => {
                            if (
                              cell.column.id === "select" ||
                              cell.column.id === "actions"
                            ) {
                              e.stopPropagation()
                            }
                          }}
                        >
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
                      colSpan={recentOrdersColumns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
        <div className="flex items-center justify-between px-4">
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
            {recentOrdersTable.getFilteredSelectedRowModel().rows.length} of{" "}
            {enquiriesData?.total || 0} row(s) selected.
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                Rows per page
              </Label>
              <Select
                value={`${pagination.pageSize}`}
                onValueChange={(value) => {
                  setPagination((prev) => ({
                    ...prev,
                    pageSize: Number(value),
                    pageIndex: 0,
                  }))
                }}
              >
                <SelectTrigger size="sm" className="w-20 cursor-pointer" id="rows-per-page">
                  <SelectValue placeholder={pagination.pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              Page {pagination.pageIndex + 1} of{" "}
              {Math.ceil((enquiriesData?.total || 0) / pagination.pageSize) || 1}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex cursor-pointer"
                onClick={() => setPagination((prev) => ({ ...prev, pageIndex: 0 }))}
                disabled={pagination.pageIndex === 0}
              >
                <span className="sr-only">Go to first page</span>
                <ChevronsLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8 cursor-pointer"
                size="icon"
                onClick={() => setPagination((prev) => ({ ...prev, pageIndex: prev.pageIndex - 1 }))}
                disabled={pagination.pageIndex === 0}
              >
                <span className="sr-only">Go to previous page</span>
                <ChevronLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8 cursor-pointer"
                size="icon"
                onClick={() => setPagination((prev) => ({ ...prev, pageIndex: prev.pageIndex + 1 }))}
                disabled={pagination.pageIndex >= Math.ceil((enquiriesData?.total || 0) / pagination.pageSize) - 1}
              >
                <span className="sr-only">Go to next page</span>
                <ChevronRight />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex cursor-pointer"
                size="icon"
                onClick={() => setPagination((prev) => ({ ...prev, pageIndex: Math.ceil((enquiriesData?.total || 0) / pagination.pageSize) - 1 }))}
                disabled={pagination.pageIndex >= Math.ceil((enquiriesData?.total || 0) / pagination.pageSize) - 1}
              >
                <span className="sr-only">Go to last page</span>
                <ChevronsRight />
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>
      <TabsContent
        value="order-status"
        className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
      >
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            Loading order statuses...
          </div>
        ) : orderStatusGroups.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No orders to display
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {orderStatusGroups.map((group) => (
              <div key={group.status} className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <StatusBadge status={group.status} />
                  <span className="text-sm text-muted-foreground">
                    {group.count} order{group.count !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader className="bg-muted sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="w-32">Order #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead className="w-32">Date</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.orders.map((order) => (
                        <TableRow
                          key={order.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleRowClick(order.id)}
                        >
                          <TableCell className="font-mono text-sm">
                            {order.enquiryNumber || "—"}
                          </TableCell>
                          <TableCell className="font-medium">
                            {order.customerName}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {order.companyName || "—"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(order.grandTotal)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-muted-foreground px-1.5">
                              {order.itemCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(order.createdAt), "MMM dd, yyyy")}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRowClick(order.id)}
                            >
                              <ArrowRight className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
