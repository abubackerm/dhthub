"use client"

import { useState, useMemo } from "react"
import {
  Eye,
  Download,
  Loader2,
  RefreshCw,
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
  useImportJobs,
  useImportJobErrors,
  useDownloadErrorReport,
  IMPORT_JOBS_QUERY_KEY,
} from "@/lib/api/import"
import { useQueryClient } from "@tanstack/react-query"

type ImportJobStatus = string

function StatusBadge({ status }: { status: ImportJobStatus }) {
  const styles: Record<string, { bg: string; label: string; icon?: React.ReactNode }> = {
    PENDING: { bg: "bg-gray-100 text-gray-700", label: "Pending" },
    VALIDATING: { bg: "bg-blue-100 text-blue-700", label: "Validating", icon: <Loader2 className="h-3 w-3 animate-spin mr-1" /> },
    VALIDATION_FAILED: { bg: "bg-red-100 text-red-700", label: "Failed" },
    PROCESSING: { bg: "bg-blue-100 text-blue-700", label: "Processing", icon: <Loader2 className="h-3 w-3 animate-spin mr-1" /> },
    COMPLETED: { bg: "bg-green-100 text-green-700", label: "Completed" },
    COMPLETED_WITH_ERRORS: { bg: "bg-amber-100 text-amber-700", label: "Completed with Errors" },
    CANCELLED: { bg: "bg-gray-100 text-gray-700", label: "Cancelled" },
    FAILED: { bg: "bg-red-100 text-red-700", label: "Failed" },
  }

  const style = styles[status] || { bg: "bg-gray-100 text-gray-700", label: status }
  return (
    <Badge variant="secondary" className={style.bg}>
      {style.icon}
      {style.label}
    </Badge>
  )
}

export default function UploadHistoryPage() {
  const queryClient = useQueryClient()
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [uploadedByFilter, setUploadedByFilter] = useState<string>("all")

  // Build query params based on filters
  const queryParams = useMemo(() => {
    const params: { status?: string; createdBy?: string } = {}
    if (statusFilter !== "all") {
      params.status = statusFilter
    }
    if (uploadedByFilter !== "all") {
      params.createdBy = uploadedByFilter
    }
    return params
  }, [statusFilter, uploadedByFilter])

  // Fetch import jobs
  const { data: jobsData, isLoading, error, refetch } = useImportJobs({
    ...queryParams,
    enabled: true,
    refetchInterval: 10000, // Refresh every 10 seconds
  })

  const jobs = jobsData?.data || []
  const total = jobsData?.pagination.total || 0

  // Get unique uploaders from jobs for filter
  const uniqueUploaders = useMemo(() => {
    const uploaders = new Set<string>()
    jobs.forEach((job) => {
      if (job.createdBy) {
        uploaders.add(job.createdBy)
      }
    })
    return Array.from(uploaders).sort()
  }, [jobs])

  // Fetch job details including errors when a job is selected
  const { data: jobErrors, isLoading: errorsLoading } = useImportJobErrors(
    selectedJobId || "",
    { enabled: !!selectedJobId && sheetOpen, limit: 100 }
  )

  const downloadErrorReport = useDownloadErrorReport()

  const handleViewDetails = (jobId: string) => {
    setSelectedJobId(jobId)
    setSheetOpen(true)
  }

  const handleDownloadErrorReport = (jobId: string, fileName: string | null) => {
    const filename = fileName ? `${fileName}-errors.csv` : `import-errors-${jobId}.csv`
    downloadErrorReport.mutate({ id: jobId, filename })
  }

  const handleRefresh = () => {
    refetch()
    toast.success("Upload history refreshed")
  }

  // Find selected job details
  const selectedJob = jobs.find((job) => job.id === selectedJobId)
  const selectedJobWithErrors = selectedJob && jobErrors
    ? { ...selectedJob, errors: jobErrors.errors, errorCount: jobErrors.errorCount }
    : null

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Upload History</h1>
          <p className="text-muted-foreground">
            {total} import job{total !== 1 ? 's' : ''} found
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
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
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Uploaded By</Label>
              <Select value={uploadedByFilter} onValueChange={setUploadedByFilter} disabled={uniqueUploaders.length === 0}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {uniqueUploaders.map((user) => (
                    <SelectItem key={user} value={user}>
                      {user}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jobs Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>File Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Valid</TableHead>
                <TableHead className="text-center">Errors</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading import jobs...</p>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-destructive">
                    Failed to load import jobs: {error.message}
                  </TableCell>
                </TableRow>
              ) : jobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No import jobs found
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map((job) => (
                  <TableRow
                    key={job.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewDetails(job.id)}
                  >
                    <TableCell className="text-sm whitespace-nowrap">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="max-w-48 truncate">
                      {job.fileName || "Unknown file"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-48 truncate">
                      {job.type}
                    </TableCell>
                    <TableCell>{job.createdBy || "System"}</TableCell>
                    <TableCell className="text-center">{job.totalRows ?? 0}</TableCell>
                    <TableCell className="text-center text-green-600">{job.successRows}</TableCell>
                    <TableCell className="text-center text-red-600">{job.failedRows}</TableCell>
                    <TableCell>
                      <StatusBadge status={job.status} />
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleViewDetails(job.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(job.failedRows > 0 || job.status === "FAILED" || job.status === "COMPLETED_WITH_ERRORS") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDownloadErrorReport(job.id, job.fileName)}
                            disabled={downloadErrorReport.isPending}
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

      {/* Job Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto">
          {selectedJobWithErrors ? (
            <>
              <SheetHeader>
                <SheetTitle>Import Job Details</SheetTitle>
                <SheetDescription>
                  Import job {selectedJob.id}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Job Info */}
                <div className="grid gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-muted-foreground">File</p>
                      <p className="font-medium">{selectedJob.fileName || "Unknown file"}</p>
                    </div>
                    <StatusBadge status={selectedJob.status} />
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium">{selectedJob.type}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Uploaded By</p>
                      <p className="font-medium">{selectedJob.createdBy || "System"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Created At</p>
                      <p className="font-medium">{new Date(selectedJob.createdAt).toLocaleString()}</p>
                    </div>
                  </div>

                  {selectedJob.startedAt && (
                    <div>
                      <p className="text-sm text-muted-foreground">Started At</p>
                      <p className="font-medium">{new Date(selectedJob.startedAt).toLocaleString()}</p>
                    </div>
                  )}

                  {selectedJob.finishedAt && (
                    <div>
                      <p className="text-sm text-muted-foreground">Completed At</p>
                      <p className="font-medium">{new Date(selectedJob.finishedAt).toLocaleString()}</p>
                    </div>
                  )}

                  {selectedJob.duration && (
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="font-medium">
                        {Math.floor(selectedJob.duration / 60)}m {Math.floor(selectedJob.duration % 60)}s
                      </p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Stats */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Statistics</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-muted rounded-lg text-center">
                      <p className="text-2xl font-bold">{selectedJob.totalRows ?? 0}</p>
                      <p className="text-sm text-muted-foreground">Total Rows</p>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg text-center">
                      <p className="text-2xl font-bold text-green-600">{selectedJob.successRows}</p>
                      <p className="text-sm text-muted-foreground">Success</p>
                    </div>
                    <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg text-center">
                      <p className="text-2xl font-bold text-red-600">{selectedJob.failedRows}</p>
                      <p className="text-sm text-muted-foreground">Errors</p>
                    </div>
                  </div>
                </div>

                {/* Error Log */}
                {selectedJobWithErrors.errors && selectedJobWithErrors.errors.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold">Error Log</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadErrorReport(selectedJob.id, selectedJob.fileName)}
                          disabled={downloadErrorReport.isPending}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Report
                        </Button>
                      </div>
                      {errorsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mr-2" />
                          <span className="text-muted-foreground">Loading errors...</span>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-20">Row #</TableHead>
                              <TableHead className="w-32">SKU</TableHead>
                              <TableHead>Error</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedJobWithErrors.errors.slice(0, 50).map((error, i) => (
                              <TableRow key={i}>
                                <TableCell>{error.rowNumber}</TableCell>
                                <TableCell className="font-mono text-sm">{error.sku || "-"}</TableCell>
                                <TableCell className="text-destructive text-sm">
                                  {error.message}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                      {selectedJobWithErrors.errorCount > 50 && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Showing first 50 of {selectedJobWithErrors.errorCount} errors
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* Success Summary */}
                {selectedJob.successRows > 0 && (selectedJob.status === "COMPLETED" || selectedJob.status === "COMPLETED_WITH_ERRORS") && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-semibold mb-3">Import Summary</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        {selectedJob.successRows} row{selectedJob.successRows !== 1 ? 's' : ''} processed successfully from this import.
                      </p>
                      {selectedJob.rowsPerSecond && (
                        <p className="text-sm text-muted-foreground">
                          Processing speed: {selectedJob.rowsPerSecond.toFixed(2)} rows/second
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          ) : errorsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span className="text-muted-foreground">Loading job details...</span>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
