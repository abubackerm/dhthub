"use client"

import { useEffect, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Download, FileSpreadsheet, Loader2, Upload } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ApiError } from "@/lib/api/client"
import {
  createCategoryImportJob,
  downloadCategoryImportErrors,
  getCategoryImportResults,
  type CategoryImportResult,
} from "@/lib/api/catalog/categories"
import { getImportJob, type ImportJobView } from "@/lib/api/import"

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.getErrorMessage()
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}

function getStatusVariant(status: string): "default" | "destructive" | "outline" | "secondary" {
  switch (status) {
    case "COMPLETED":
      return "default"
    case "FAILED":
      return "destructive"
    case "CANCELLED":
      return "secondary"
    default:
      return "outline"
  }
}

type ImportMode = 'CREATE' | 'UPDATE'

interface CategoryImportFormProps {
  mode: ImportMode
}

function CategoryImportForm({ mode }: CategoryImportFormProps) {
  const queryClient = useQueryClient()
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importJob, setImportJob] = useState<ImportJobView | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [importResult, setImportResult] = useState<CategoryImportResult | null>(null)

  useEffect(() => {
    if (!isPolling || !importJob) return

    const interval = setInterval(async () => {
      try {
        const updated = await getImportJob(importJob.id)
        setImportJob(updated)

        if (updated.status === "COMPLETED" || updated.status === "FAILED" || updated.status === "CANCELLED") {
          setIsPolling(false)

          // Fetch detailed results when completed
          if (updated.status === "COMPLETED") {
            try {
              const results = await getCategoryImportResults(importJob.id)
              setImportResult(results)
            } catch (error) {
              console.error("Failed to fetch import results:", error)
            }
          }

          // Auto-refresh categories list on completion
          await queryClient.invalidateQueries({ queryKey: ["categories"] })
        }
      } catch (error) {
        console.error("Failed to poll import job", error)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [isPolling, importJob, queryClient])

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      return createCategoryImportJob(file, mode)
    },
    onSuccess: (result) => {
      const job: ImportJobView = {
        id: result.jobId,
        fileUrl: result.fileUrl,
        fileName: result.fileName,
        fileSize: result.fileSize,
        totalRows: result.totalRows,
        processedRows: 0,
        successRows: 0,
        failedRows: 0,
        lastProcessedRow: 0,
        type: mode === 'CREATE' ? 'CATEGORY_CREATE' : 'CATEGORY_UPDATE',
        status: "PENDING",
        lockedAt: null,
        lockedBy: null,
        createdBy: null,
        startedAt: null,
        finishedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        duration: null,
        rowsPerSecond: null,
      }
      setImportJob(job)
      setIsPolling(true)
      toast.success(`Import job created: ${result.jobId}. Processing will begin shortly.`)
    },
    onError: (error) => {
      console.error('Import error:', error)
      toast.error(getErrorMessage(error, "Failed to create import job"))
    },
  })

  const downloadTemplateMutation = useMutation({
    mutationFn: async () => {
      const template = mode === 'CREATE'
        ? `main_branch,branch1,branch2,branch3,branch4,branch5,branch6\nElectronics,Phones,Smartphones,\nElectronics,Phones,Feature Phones,\nElectronics,Computers,Laptops,Gaming`
        : `sku,name,cell\nCG-A1B2C3D4,iPhone 15,x\nCG-A1B2C3D4,Samsung Galaxy,x\nCG-E5F6G7H8,Accessories,`

      const blob = new Blob([template], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = mode === 'CREATE' ? 'categories-create-template.csv' : 'categories-update-template.csv'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    },
    onSuccess: () => {
      toast.success("Template downloaded successfully")
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to download template"))
    },
  })

  const downloadErrorsMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const blob = await downloadCategoryImportErrors(jobId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `category-import-errors-${jobId}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    },
    onSuccess: () => {
      toast.success("Error report downloaded successfully")
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to download error report"))
    },
  })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setImportFile(file)
      setImportResult(null)
    }
  }

  function handleImport() {
    if (importFile) {
      setImportResult(null)
      importMutation.mutate(importFile)
    }
  }

  function handleReset() {
    setImportFile(null)
    setImportJob(null)
    setIsPolling(false)
    setImportResult(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === 'CREATE' ? 'Create Categories' : 'Update Categories'}</CardTitle>
        <CardDescription>
          {mode === 'CREATE'
            ? 'Upload a CSV file to create category hierarchies. Each row represents a path in the category tree.'
            : 'Upload a CSV file to add child categories or cells to existing categories using their SKU.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => downloadTemplateMutation.mutate()}
            disabled={downloadTemplateMutation.isPending}
          >
            {downloadTemplateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download Template
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={!importFile && !importJob && !importResult}>
            Reset
          </Button>
        </div>

        <div className="grid gap-2">
          <Label>Upload CSV File</Label>
          <Input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={importMutation.isPending || !!importJob || !!importResult}
          />
          <p className="text-xs text-muted-foreground">
            {mode === 'CREATE'
              ? 'CSV columns: main_branch, branch1, branch2, branch3, branch4, branch5, branch6'
              : 'CSV columns: sku, name, cell (optional, use "x" for cell)'}
          </p>
        </div>

        {importFile && !importJob && !importResult && (
          <div className="rounded-md border p-3 text-sm">
            <div className="font-medium">{importFile.name}</div>
            <div className="text-muted-foreground">{(importFile.size / 1024).toFixed(2)} KB</div>
          </div>
        )}

        {/* Import Progress */}
        {importJob && (
          <div className="rounded-md border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Import Status</span>
              <Badge variant={getStatusVariant(importJob.status)}>{importJob.status}</Badge>
            </div>

            {(importJob.status === "PROCESSING" || importJob.status === "COMPLETED" || importJob.status === "PENDING") && importJob.totalRows !== null && (
              <div className="space-y-2">
                <Progress
                  value={importJob.totalRows > 0 ? (importJob.processedRows / importJob.totalRows) * 100 : 0}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{importJob.processedRows} of {importJob.totalRows} rows</span>
                  <span>{importJob.totalRows > 0 ? ((importJob.processedRows / importJob.totalRows) * 100).toFixed(0) : 0}%</span>
                </div>
              </div>
            )}

            {(importJob.status === "PENDING" || importJob.status === "PROCESSING") && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {importJob.status === "PENDING" ? "Waiting to start..." : "Processing..."}
              </div>
            )}
          </div>
        )}

        {/* Import Results */}
        {importResult && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Import Status</span>
              <Badge variant="default">COMPLETED</Badge>
            </div>

            {/* Results Summary */}
            <div className="text-sm space-y-2">
              <div className="text-muted-foreground">Total rows: {importResult.totalRows}</div>
              <div className="text-green-600">Success: {importResult.successRows}</div>
              {importResult.createdCategories.length > 0 && (
                <div className="text-blue-600">Categories created: {importResult.createdCategories.length}</div>
              )}
              {importResult.createdCells.length > 0 && (
                <div className="text-blue-600">Cells created: {importResult.createdCells.length}</div>
              )}
              {importResult.failedRows > 0 && (
                <div className="text-red-600">Failed: {importResult.failedRows}</div>
              )}
              {importResult.failedRows === 0 && importResult.successRows > 0 && (
                <div className="text-green-600 font-medium">All items imported successfully!</div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <Progress value={100} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{importResult.successRows + importResult.failedRows} of {importResult.totalRows} rows processed</span>
                <span>100%</span>
              </div>
            </div>

            {/* Created Categories */}
            {importResult.createdCategories.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-blue-600">
                    Categories Created ({importResult.createdCategories.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-48 overflow-y-auto text-xs space-y-1">
                    {importResult.createdCategories.map((category) => (
                      <div key={category.id} className="border-b border-border/30 py-2 last:border-0">
                        <div className="font-medium">{category.name}</div>
                        <div className="text-muted-foreground">SKU: {category.sku} | Path: {category.path}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Created Cells */}
            {importResult.createdCells.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-blue-600">
                    Cells Created ({importResult.createdCells.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-48 overflow-y-auto text-xs space-y-1">
                    {importResult.createdCells.map((cell) => (
                      <div key={cell.id} className="border-b border-border/30 py-2 last:border-0">
                        <div className="font-medium">{cell.name}</div>
                        <div className="text-muted-foreground">SKU: {cell.sku} | Path: {cell.path}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Errors */}
            {importResult.errors.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base text-destructive">
                      {importResult.errors.length} error(s) found
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => importJob && downloadErrorsMutation.mutate(importJob.id)}
                      disabled={downloadErrorsMutation.isPending}
                    >
                      {downloadErrorsMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Download Error Report
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="max-h-48 overflow-y-auto text-xs space-y-1">
                    {importResult.errors.map((error, index) => (
                      <div key={index} className="text-destructive border-b border-destructive/20 py-2 last:border-0">
                        <div className="font-semibold">Row {error.rowNumber}</div>
                        {error.name && <div className="text-muted-foreground">Name: {error.name}</div>}
                        {error.sku && <div className="text-muted-foreground">SKU: {error.sku}</div>}
                        <div className="font-medium text-xs mt-1">{error.errorType}</div>
                        <div>{error.message}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Button
          onClick={handleImport}
          disabled={!importFile || importMutation.isPending || !!importJob || !!importResult}
        >
          {importMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Start Import
        </Button>
      </CardContent>
    </Card>
  )
}

export default function CategoryImportPage() {
  const router = useRouter()

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Import Categories</h1>
          <p className="text-muted-foreground">
            Create category hierarchies or add children to existing categories via CSV import.
          </p>
        </div>
      </div>

      <Tabs defaultValue="create" className="w-full">
        <TabsList>
          <TabsTrigger value="create" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Create Categories
          </TabsTrigger>
          <TabsTrigger value="update" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Update Categories
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="create" className="mt-4">
          <CategoryImportForm mode="CREATE" />
        </TabsContent>
        
        <TabsContent value="update" className="mt-4">
          <CategoryImportForm mode="UPDATE" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
