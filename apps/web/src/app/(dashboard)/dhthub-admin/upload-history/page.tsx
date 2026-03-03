"use client"

import { useState } from "react"
import {
  Eye,
  Download,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"

import {
  mockUploadBatches,
  mockUsers,
  type UploadBatch,
  type UploadBatchStatus,
} from "@/lib/mock-data"

function StatusBadge({ status }: { status: UploadBatchStatus }) {
  const styles: Record<UploadBatchStatus, { bg: string; label: string; icon?: React.ReactNode }> = {
    PENDING: { bg: "bg-gray-100 text-gray-700", label: "Pending" },
    VALIDATING: { bg: "bg-blue-100 text-blue-700", label: "Validating", icon: <Loader2 className="h-3 w-3 animate-spin mr-1" /> },
    VALIDATION_FAILED: { bg: "bg-red-100 text-red-700", label: "Failed" },
    PROCESSING: { bg: "bg-blue-100 text-blue-700", label: "Processing", icon: <Loader2 className="h-3 w-3 animate-spin mr-1" /> },
    COMPLETED: { bg: "bg-green-100 text-green-700", label: "Completed" },
    COMPLETED_WITH_ERRORS: { bg: "bg-amber-100 text-amber-700", label: "Completed with Errors" },
  }

  const style = styles[status]
  return (
    <Badge variant="secondary" className={style.bg}>
      {style.icon}
      {style.label}
    </Badge>
  )
}

export default function UploadHistoryPage() {
  const [batches] = useState<UploadBatch[]>(mockUploadBatches)
  const [selectedBatch, setSelectedBatch] = useState<UploadBatch | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  // Filters
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" })
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [uploadedByFilter, setUploadedByFilter] = useState<string>("all")

  const filteredBatches = batches.filter((batch) => {
    const matchesStatus = statusFilter === "all" || batch.status === statusFilter
    const matchesUploadedBy = uploadedByFilter === "all" || batch.uploadedBy === uploadedByFilter
    return matchesStatus && matchesUploadedBy
  })

  const handleViewDetails = (batch: UploadBatch) => {
    setSelectedBatch(batch)
    setSheetOpen(true)
  }

  const handleDownloadErrorReport = (batch: UploadBatch) => {
    toast.success(`Error report downloaded for ${batch.originalFilename}`)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Upload History</h1>
        <p className="text-muted-foreground">
          All previous bulk upload batches
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="grid gap-2">
              <Label>Date Range</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
                  className="w-40"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
                  className="w-40"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="VALIDATING">Validating</SelectItem>
                  <SelectItem value="VALIDATION_FAILED">Failed</SelectItem>
                  <SelectItem value="PROCESSING">Processing</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="COMPLETED_WITH_ERRORS">Completed with Errors</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Uploaded By</Label>
              <Select value={uploadedByFilter} onValueChange={setUploadedByFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {mockUsers.map((user) => (
                    <SelectItem key={user.id} value={user.name}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batches Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>File Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Valid</TableHead>
                <TableHead className="text-center">Errors</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No upload batches found
                  </TableCell>
                </TableRow>
              ) : (
                filteredBatches.map((batch) => (
                  <TableRow
                    key={batch.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewDetails(batch)}
                  >
                    <TableCell className="text-sm whitespace-nowrap">
                      {batch.createdAt}
                    </TableCell>
                    <TableCell className="max-w-48 truncate">
                      {batch.originalFilename}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-48 truncate">
                      {batch.categoryPath}
                    </TableCell>
                    <TableCell>{batch.uploadedBy}</TableCell>
                    <TableCell className="text-center">{batch.totalRows}</TableCell>
                    <TableCell className="text-center text-green-600">{batch.validRows}</TableCell>
                    <TableCell className="text-center text-red-600">{batch.errorRows}</TableCell>
                    <TableCell>
                      <StatusBadge status={batch.status} />
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleViewDetails(batch)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {batch.errorRows > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDownloadErrorReport(batch)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Batch Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto">
          {selectedBatch && (
            <>
              <SheetHeader>
                <SheetTitle>Batch Details</SheetTitle>
                <SheetDescription>
                  Upload batch {selectedBatch.id}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Batch Info */}
                <div className="grid gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-muted-foreground">File</p>
                      <p className="font-medium">{selectedBatch.originalFilename}</p>
                    </div>
                    <StatusBadge status={selectedBatch.status} />
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <p className="font-medium">{selectedBatch.categoryPath}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Uploaded By</p>
                      <p className="font-medium">{selectedBatch.uploadedBy}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Uploaded At</p>
                      <p className="font-medium">{selectedBatch.createdAt}</p>
                    </div>
                  </div>

                  {selectedBatch.completedAt && (
                    <div>
                      <p className="text-sm text-muted-foreground">Completed At</p>
                      <p className="font-medium">{selectedBatch.completedAt}</p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Stats */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Statistics</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-muted rounded-lg text-center">
                      <p className="text-2xl font-bold">{selectedBatch.totalRows}</p>
                      <p className="text-sm text-muted-foreground">Total Rows</p>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg text-center">
                      <p className="text-2xl font-bold text-green-600">{selectedBatch.validRows}</p>
                      <p className="text-sm text-muted-foreground">Valid</p>
                    </div>
                    <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg text-center">
                      <p className="text-2xl font-bold text-red-600">{selectedBatch.errorRows}</p>
                      <p className="text-sm text-muted-foreground">Errors</p>
                    </div>
                  </div>
                </div>

                {/* Error Log */}
                {selectedBatch.errors && selectedBatch.errors.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold">Error Log</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadErrorReport(selectedBatch)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Report
                        </Button>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-20">Row #</TableHead>
                            <TableHead className="w-32">SKU</TableHead>
                            <TableHead className="w-28">Column</TableHead>
                            <TableHead>Error</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedBatch.errors.map((error, i) => (
                            <TableRow key={i}>
                              <TableCell>{error.rowNumber}</TableCell>
                              <TableCell className="font-mono text-sm">{error.sku}</TableCell>
                              <TableCell>{error.column}</TableCell>
                              <TableCell className="text-destructive text-sm">
                                {error.error}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}

                {/* Products Created */}
                {selectedBatch.validRows > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-semibold mb-3">Products Created</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        {selectedBatch.validRows} products were created from this batch.
                      </p>
                      <Button variant="outline" className="w-full">
                        View Products
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
