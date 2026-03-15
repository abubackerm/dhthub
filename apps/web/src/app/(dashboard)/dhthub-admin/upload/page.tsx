"use client"

import { useEffect, useRef, useState } from "react"
import {
  Upload as UploadIcon,
  CheckCircle2,
  AlertCircle,
  Download,
  ChevronRight,
  Check,
  Info,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

import {
  createImportJob,
  downloadErrorCsv,
  downloadTemplate,
  downloadTemplatePack,
  getImportJob,
  getImportJobErrors,
  searchCategories,
  type ImportJobView,
  type ImportMode,
  type ImportJobWithErrorsView,
} from "@/lib/api/import"
import { getCells, getCellAttributes, type Cell } from "@/lib/api/catalog"

type UploadStep = 1 | 2 | 3
type UploadState = "idle" | "uploading" | "success" | "errors"

type CategorySearchResult = {
  id: string
  name: string
  path: string
}

type CellSearchResult = {
  id: string
  name: string
  slug: string
  categoryId: string
  categoryName: string
}

function formatCategoryPath(result: CategorySearchResult): string {
  const segments = result.path.split(".")
  return segments.map((segment) => segment.replace(/-/g, " ")).join(" / ")
}

export default function UploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<UploadStep>(1)
  const [categoryQuery, setCategoryQuery] = useState<string>("")
  const [categoryResults, setCategoryResults] = useState<CategorySearchResult[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("")
  const [selectedCategory, setSelectedCategory] = useState<CategorySearchResult | null>(null)
  const [cells, setCells] = useState<Cell[]>([])
  const [selectedCellId, setSelectedCellId] = useState<string>("")
  const [selectedCell, setSelectedCell] = useState<Cell | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>("idle")
  const [cellAttributes, setCellAttributes] = useState<
    Array<{ id: string; name: string; slug: string; isRequired: boolean }>
  >([])
  const [importMode, setImportMode] = useState<ImportMode>("UPSERT")
  const [job, setJob] = useState<ImportJobView | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [validationErrors, setValidationErrors] = useState<
    ImportJobWithErrorsView["errors"]
  >([])
  const [isValidating, setIsValidating] = useState(false)

  useEffect(() => {
    if (!categoryQuery) {
      setCategoryResults([])
      return
    }

    let cancelled = false
    const handler = setTimeout(async () => {
      try {
        const results = await searchCategories(categoryQuery, 20)
        if (!cancelled) {
          setCategoryResults(results)
        }
      } catch (error) {
        console.error("Failed to search categories", error)
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(handler)
    }
  }, [categoryQuery])

  // Load cells when category is selected
  useEffect(() => {
    if (!selectedCategoryId) {
      setCells([])
      return
    }

    ;(async () => {
      try {
        const cellsData = await getCells({ categoryId: selectedCategoryId })
        setCells(cellsData.data || [])
      } catch (error) {
        console.error("Failed to load cells", error)
        toast.error("Failed to load cells")
      }
    })()
  }, [selectedCategoryId])

  // Load cell attributes when cell is selected
  useEffect(() => {
    if (!selectedCellId) {
      setCellAttributes([])
      return
    }

    ;(async () => {
      try {
        const attrs = await getCellAttributes(selectedCellId)
        setCellAttributes(
          attrs.map((attr) => ({
            id: attr.id,
            name: attr.name,
            slug: attr.slug,
            isRequired: attr.isRequired,
          })),
        )
      } catch (error) {
        console.error("Failed to load cell attributes", error)
        toast.error("Failed to load cell attributes")
      }
    })()
  }, [selectedCellId])

  useEffect(() => {
    if (!isPolling || !job) return

    const interval = setInterval(async () => {
      try {
        const updated = await getImportJob(job.id)
        setJob(updated)

        if (updated.status === "COMPLETED" || updated.status === "FAILED" || updated.status === "CANCELLED") {
          setIsPolling(false)

          if (updated.status === "FAILED" || updated.status === "COMPLETED") {
            try {
              const jobWithErrors = await getImportJobErrors(job.id, { limit: 500 })
              setValidationErrors(jobWithErrors.errors)
            } catch (error) {
              console.error("Failed to load job errors", error)
            }
          }
        }
      } catch (error) {
        console.error("Failed to poll import job", error)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [isPolling, job])

  const handleCategorySelect = (categoryId: string) => {
    const found = categoryResults.find((c) => c.id === categoryId) ?? null
    setSelectedCategoryId(categoryId)
    setSelectedCategory(found)
    setCategoryQuery("")
    setCategoryResults([])
    // Reset cell selection when category changes
    setSelectedCellId("")
    setSelectedCell(null)
  }

  const handleCellSelect = (cellId: string) => {
    const found = cells.find((c) => c.id === cellId) ?? null
    setSelectedCellId(cellId)
    setSelectedCell(found)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && (file.name.endsWith(".csv") || file.name.endsWith(".xlsx") || file.name.endsWith(".zip"))) {
      setSelectedFile(file)
    } else {
      toast.error("Please upload a CSV, Excel, or ZIP file")
    }
  }

  const handleUploadAndValidate = () => {
    if (!selectedFile) {
      toast.error("Please select a file to upload")
      return
    }

    setUploadState("uploading")
    setIsValidating(true)
    setValidationErrors([])

    createImportJob(selectedFile, {
      mode: importMode,
    })
      .then((response) => {
        toast.success("Import job created")
        const nextJob: ImportJobView = {
          id: response.jobId,
          fileUrl: response.fileUrl,
          fileName: response.fileName,
          fileSize: response.fileSize,
          totalRows: response.totalRows,
          processedRows: 0,
          successRows: 0,
          failedRows: 0,
          lastProcessedRow: 0,
          type: selectedFile.name.endsWith('.zip') ? "ZIP" : "CSV",
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

        setJob(nextJob)
        setIsPolling(true)
        setUploadState("success")
        setStep(3)
      })
      .catch((error: unknown) => {
        console.error("Failed to create import job", error)
        setUploadState("errors")
        toast.error(
          error instanceof Error && error.message.includes("CSV file too large")
            ? "CSV file too large"
            : "Failed to start import",
        )
      })
      .finally(() => {
        setIsValidating(false)
      })
  }

  const handleDownloadTemplate = () => {
    downloadTemplate(selectedCellId || undefined)
      .then((template) => {
        const blob = new Blob([template.content], { type: "text/csv" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = template.filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      })
      .catch((error) => {
        console.error("Failed to download template", error)
        toast.error("Failed to download template")
      })
  }

  const handleDownloadTemplatePack = () => {
    downloadTemplatePack()
      .then((templatePack) => {
        const binaryString = atob(templatePack.content)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        const blob = new Blob([bytes], { type: templatePack.contentType })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = templatePack.filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      })
      .catch((error) => {
        console.error("Failed to download template pack", error)
        toast.error("Failed to download template pack")
      })
  }

  const handleDownloadErrorReport = () => {
    if (!job) return

    downloadErrorCsv(job.id)
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${job.fileName ?? "import"}-errors.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      })
      .catch((error) => {
        console.error("Failed to download error report", error)
        toast.error("Failed to download error report")
      })
  }

  const handleReset = () => {
    setStep(1)
    setSelectedCategoryId("")
    setSelectedCategory(null)
    setCells([])
    setSelectedCellId("")
    setSelectedCell(null)
    setCategoryQuery("")
    setCategoryResults([])
    setSelectedFile(null)
    setUploadState("idle")
    setJob(null)
    setIsPolling(false)
    setValidationErrors([])
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Upload Products</h1>
        <p className="text-muted-foreground">
          Bulk upload products into a cell using a CSV file
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Choose Your Import Method</AlertTitle>
        <AlertDescription>
          <div className="mt-2 space-y-2">
            <div>
              <strong className="text-sm font-medium">Single CSV Import:</strong>
              <p className="text-sm text-muted-foreground">
                Download template for one category → Fill → Upload CSV
              </p>
            </div>
            <div>
              <strong className="text-sm font-medium">Multi-CSV Catalog Import:</strong>
              <p className="text-sm text-muted-foreground">
                Download template pack → Fill 5 CSV files → ZIP → Upload
              </p>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Step Indicator */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 1
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {step > 1 ? <Check className="h-4 w-4" /> : "1"}
          </div>
          <span className={step >= 1 ? "text-foreground" : "text-muted-foreground"}>
            Select Cell
          </span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 2
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {step > 2 ? <Check className="h-4 w-4" /> : "2"}
          </div>
          <span className={step >= 2 ? "text-foreground" : "text-muted-foreground"}>
            Upload File
          </span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 3
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {step > 3 ? <Check className="h-4 w-4" /> : "3"}
          </div>
          <span className={step >= 3 ? "text-foreground" : "text-muted-foreground"}>
            Review Results
          </span>
        </div>
      </div>

      {/* Step 1: Select Cell */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select a Cell</CardTitle>
            <CardDescription>
              Choose the cell where you want to upload products. First select a category, then select a cell.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
              <Label>Category</Label>
              <div className="space-y-2">
                <input
                  type="text"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Search for a category..."
                  value={categoryQuery}
                  onChange={(e) => setCategoryQuery(e.target.value)}
                />
                {categoryResults.length > 0 && (
                  <div className="max-h-60 overflow-y-auto rounded-md border bg-popover text-sm shadow">
                    {categoryResults.map((result) => (
                      <button
                        key={result.id}
                        type="button"
                        className={`flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-accent ${
                          selectedCategoryId === result.id ? "bg-accent" : ""
                        }`}
                        onClick={() => handleCategorySelect(result.id)}
                      >
                        <span className="font-medium">{result.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatCategoryPath(result)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {selectedCategory && (
              <div className="grid gap-2">
                <Label>Cell</Label>
                {cells.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-4 border rounded-md">
                    No cells found in this category. Please create cells in the Categories page first.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="max-h-60 overflow-y-auto rounded-md border bg-popover text-sm shadow">
                      {cells.map((cell) => (
                        <button
                          key={cell.id}
                          type="button"
                          className={`flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent ${
                            selectedCellId === cell.id ? "bg-accent" : ""
                          }`}
                          onClick={() => handleCellSelect(cell.id)}
                        >
                          <span className="font-medium">{cell.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {cell.slug}
                          </span>
                          <Badge variant={cell.isActive ? "default" : "secondary"} className="text-xs ml-auto">
                            {cell.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedCell && (
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Selected Cell</Label>
                  <div className="flex items-center justify-between rounded-md border bg-muted px-3 py-2">
                    <div>
                      <div className="font-medium">{selectedCell.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedCell.description || "No description"}
                      </div>
                    </div>
                    <Badge variant={selectedCell.isActive ? "default" : "secondary"}>
                      {selectedCell.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-md border border-dashed p-3">
                  <div>
                    <p className="text-sm font-medium">CSV Template</p>
                    <p className="text-xs text-muted-foreground">
                      Download a pre-formatted template with the correct columns for this cell
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                    <Download className="mr-2 h-4 w-4" />
                    Download CSV Template
                  </Button>
                </div>

                <div className="flex items-center justify-between rounded-md border border-dashed p-3">
                  <div>
                    <p className="text-sm font-medium">Template Pack (ZIP)</p>
                    <p className="text-xs text-muted-foreground">
                      Download all catalog templates (products, variants, images, attributes) for multi-CSV import
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleDownloadTemplatePack}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Template Pack
                  </Button>
                </div>

                {cellAttributes.length > 0 && (
                  <div className="grid gap-4">
                    <div>
                      <Label>Required & Optional Attributes</Label>
                      <p className="text-sm text-muted-foreground">
                        These attributes should be included as columns in your CSV file
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <h3 className="mb-2 text-sm font-medium">Required Attributes</h3>
                        <div className="space-y-1">
                          {cellAttributes
                            .filter((attr) => attr.isRequired)
                            .map((attr) => (
                              <div
                                key={attr.id}
                                className="flex items-center justify-between rounded-md bg-muted/70 px-3 py-1.5"
                              >
                                <span className="text-sm">{attr.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  Required
                                </Badge>
                              </div>
                            ))}
                        </div>
                      </div>
                      <div>
                        <h3 className="mb-2 text-sm font-medium">Optional Attributes</h3>
                        <div className="space-y-1">
                          {cellAttributes
                            .filter((attr) => !attr.isRequired)
                            .map((attr) => (
                              <div
                                key={attr.id}
                                className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-1.5"
                              >
                                <span className="text-sm">{attr.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  Optional
                                </Badge>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" asChild>
                <Link href="/dhthub-admin/products">Cancel</Link>
              </Button>
              <Button onClick={() => setStep(2)} disabled={!selectedCellId}>
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Upload File */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upload CSV File</CardTitle>
                <CardDescription>
                  Upload your product data in CSV format, or use ZIP for multi-CSV catalog imports. We'll validate it before importing.
                </CardDescription>
              </div>
              <Badge variant="outline">Step 2 of 3</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label>Import Mode</Label>
              <Tabs
                value={importMode}
                onValueChange={(value) => setImportMode(value as ImportMode)}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="CREATE_ONLY">Create Only</TabsTrigger>
                  <TabsTrigger value="UPSERT">Upsert (Recommended)</TabsTrigger>
                  <TabsTrigger value="UPDATE_ONLY">Update Only</TabsTrigger>
                </TabsList>
              </Tabs>
              <p className="text-sm text-muted-foreground">
                Choose how existing SKUs should be handled during import.
              </p>
            </div>

            <div
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/40 px-6 py-10 text-center transition-colors hover:border-primary"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".csv,.xlsx,.zip"
                onChange={handleFileSelect}
              />
              <UploadIcon className="h-10 w-10 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Drag and drop your CSV file</p>
                <p className="text-xs text-muted-foreground">or click to browse</p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                CSV up to 200MB and 500k rows, or ZIP with multiple CSV files.
              </p>
            </div>

            {selectedFile && (
              <div className="space-y-2 rounded-md border bg-muted/60 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{selectedFile.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </div>
                  </div>
                  <Badge variant="outline">Ready</Badge>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleUploadAndValidate}
                  disabled={!selectedFile || uploadState === "uploading" || isValidating}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {isValidating ? "Starting Import..." : "Start Import"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review Results */}
      {step === 3 && (
        <div className="space-y-6">
          {isPolling && (
            <Card>
              <CardContent className="pt-6">
                <Alert>
                  <AlertCircle className="h-4 w-4 animate-spin" />
                  <AlertTitle>Processing Import...</AlertTitle>
                  <AlertDescription>
                    {job?.status === "PENDING"
                      ? "Waiting for worker to pick up the job..."
                      : job?.totalRows
                        ? `${job.processedRows} of ${job.totalRows} rows processed.`
                        : "Extracting and processing files..."}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {!isPolling && job && validationErrors.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800 dark:text-green-300">
                    Upload Complete
                  </AlertTitle>
                  <AlertDescription className="text-green-700 dark:text-green-400">
                    {job.successRows} of {job.totalRows || job.processedRows} rows imported successfully.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-8 mt-6 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-2xl font-bold">{job.totalRows || job.processedRows}</p>
                    <p className="text-sm text-muted-foreground">Total Rows</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{job.successRows}</p>
                    <p className="text-sm text-muted-foreground">Imported</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{job.failedRows}</p>
                    <p className="text-sm text-muted-foreground">Errors</p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="outline" onClick={handleReset}>
                    Upload Another
                  </Button>
                  <Button asChild>
                    <Link href="/dhthub-admin/products">View Products</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!isPolling && job && validationErrors.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800 dark:text-amber-300">
                    {job.successRows > 0 ? "Upload Completed with Errors" : "Upload Failed"}
                  </AlertTitle>
                  <AlertDescription className="text-amber-700 dark:text-amber-400">
                    {job.successRows} of {job.totalRows || job.processedRows} rows imported successfully. {job.failedRows} rows had errors.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-8 mt-6 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-2xl font-bold">{job.totalRows || job.processedRows}</p>
                    <p className="text-sm text-muted-foreground">Total Rows</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{job.successRows}</p>
                    <p className="text-sm text-muted-foreground">Imported</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{job.failedRows}</p>
                    <p className="text-sm text-muted-foreground">Errors</p>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">Error Details</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row #</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validationErrors.map((error, i) => (
                        <TableRow key={error.id ?? i}>
                          <TableCell>{error.rowNumber}</TableCell>
                          <TableCell className="font-mono">
                            {error.sku ?? "-"}
                          </TableCell>
                          <TableCell className="text-destructive">
                            {error.message}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={handleDownloadErrorReport}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Error Report
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleReset}>
                      Upload Another
                    </Button>
                    <Button asChild>
                      <Link href="/dhthub-admin/products">View Products</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
