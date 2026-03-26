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
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

import {
  createImportJob,
  downloadErrorCsv,
  downloadTemplate,
  downloadVariantsTemplate,
  getImportJob,
  getImportJobErrors,
  type ImportJobView,
  type ImportMode,
  type ImportJobWithErrorsView,
} from "@/lib/api/import"
import { exportProducts } from "@/lib/api/catalog/products"
import { getCategoryTree } from "@/lib/api/catalog/categories"
import type { CategoryTreeNode } from "@/lib/api/catalog/types"

type UploadStep = 1 | 2 | 3
type UploadState = "idle" | "uploading" | "success" | "errors"
type ImportTab = "create" | "edit"

function extractBranchCategories(nodes: CategoryTreeNode[]): CategoryTreeNode[] {
  const branches: CategoryTreeNode[] = [];
  for (const node of nodes) {
    if (node.children.length > 0) {
      branches.push(node);
      branches.push(...extractBranchCategories(node.children));
    }
  }
  return branches;
}

export default function UploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [activeTab, setActiveTab] = useState<ImportTab>("create")
  const [step, setStep] = useState<UploadStep>(1)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>("idle")
  const [job, setJob] = useState<ImportJobView | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [jobRecords, setJobRecords] = useState<
    ImportJobWithErrorsView["errors"]
  >([])
  const [isValidating, setIsValidating] = useState(false)
  const [branchCategories, setBranchCategories] = useState<CategoryTreeNode[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const [categoriesLoaded, setCategoriesLoaded] = useState(false)

  const importedProducts = jobRecords.filter(
    (r) => r.rawData?.type === "success",
  )
  const validationErrors = jobRecords.filter(
    (r) => r.rawData?.type !== "success",
  )

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
              const jobWithErrors = await getImportJobErrors(job.id, { limit: 5000 })
              setJobRecords(jobWithErrors.errors)
            } catch (error) {
              console.error("Failed to load job records", error)
            }
          }
        }
      } catch (error) {
        console.error("Failed to poll import job", error)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [isPolling, job])

  useEffect(() => {
    if (activeTab !== "edit" || categoriesLoaded) return

    getCategoryTree()
      .then((tree) => {
        const branches = extractBranchCategories(tree)
        setBranchCategories(branches)
        setCategoriesLoaded(true)
      })
      .catch((error) => {
        console.error("Failed to load categories", error)
        setCategoriesLoaded(true)
      })
  }, [activeTab, categoriesLoaded])

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    )
  }

  const toggleAllCategories = () => {
    if (selectedCategoryIds.length === branchCategories.length) {
      setSelectedCategoryIds([])
    } else {
      setSelectedCategoryIds(branchCategories.map((c) => c.id))
    }
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
    setJobRecords([])

    // Use CREATE_ONLY for create tab, UPDATE_ONLY for edit tab
    const mode: ImportMode = activeTab === "create" ? "CREATE_ONLY" : "UPDATE_ONLY"

    createImportJob(selectedFile, {
      mode,
      importType: 'CATALOG',
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

  const handleDownloadProductsTemplate = () => {
    downloadTemplate({ mode: 'create' }) // Create mode - no product_sku
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

  const handleDownloadVariantsTemplate = () => {
    downloadVariantsTemplate()
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
        console.error("Failed to download variants template", error)
        toast.error("Failed to download variants template")
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
    setSelectedFile(null)
    setUploadState("idle")
    setJob(null)
    setIsPolling(false)
    setJobRecords([])
  }

  const handleExportEditCsv = async () => {
    try {
      setIsExporting(true)
      toast.loading("Exporting products and variants...", { id: "export-edit" })

      const result = await exportProducts({
        categoryIds:
          selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
      })

      const downloadBlob = (
        content: string,
        filename: string,
        contentType: string,
      ) => {
        const blob = new Blob([content], { type: contentType })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }

      downloadBlob(result.products.content, result.products.filename, result.products.contentType)
      downloadBlob(result.variants.content, result.variants.filename, result.variants.contentType)

      toast.success("Downloaded products-edit.csv and variants-edit.csv", {
        id: "export-edit",
      })
    } catch (error) {
      console.error("Failed to export products", error)
      toast.error("Failed to export products", { id: "export-edit" })
    } finally {
      setIsExporting(false)
    }
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
          Bulk upload products using CSV or ZIP files with auto-SKU generation
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>New Simplified Import Flow</AlertTitle>
        <AlertDescription>
          <div className="mt-2 space-y-2">
            <div>
              <strong className="text-sm font-medium">No Cell Selection Required:</strong>
              <p className="text-sm text-muted-foreground">
                SKUs are auto-generated (format: P-&#123;8 chars&#125;) and user SKU is stored in metadata
              </p>
            </div>
            <div>
              <strong className="text-sm font-medium">Create Mode:</strong>
              <p className="text-sm text-muted-foreground">
                Add new products from scratch. Download template, fill data, upload CSV/ZIP.
              </p>
            </div>
            <div>
              <strong className="text-sm font-medium">Edit Mode:</strong>
              <p className="text-sm text-muted-foreground">
                Update existing products. Search products, export to CSV, edit, re-upload.
              </p>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Create/Edit Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ImportTab)} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Create New Products</TabsTrigger>
          <TabsTrigger value="edit">Edit Existing Products</TabsTrigger>
        </TabsList>

        {/* Create Tab */}
        <TabsContent value="create">
          {/* Step Indicator */}
          <div className="flex items-center gap-4 mb-6">
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
                Download Template
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

          {/* Step 1: Download Template */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Download Import Template</CardTitle>
                <CardDescription>
                  Download the CSV template and fill in your product data. SKUs will be auto-generated on import.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Products Template</h3>
                    <p className="text-sm text-muted-foreground">
                      Defines products with dynamic attribute columns (at_head1-15)
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between rounded-md border border-dashed p-3">
                    <div>
                      <p className="text-sm font-medium">products_template.csv</p>
                      <p className="text-xs text-muted-foreground">
                        Product definitions with attributes configuration
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleDownloadProductsTemplate}>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Required Columns</h3>
                    <div className="grid gap-2 text-sm">
                      <div className="rounded-md bg-muted/70 px-3 py-1.5">
                        <span className="font-medium">product_name</span> - Product name (required)
                      </div>
                      <div className="rounded-md bg-muted/70 px-3 py-1.5">
                        <span className="font-medium">cell_sku</span> - Cell SKU (optional)
                      </div>
                      <div className="rounded-md bg-muted/70 px-3 py-1.5">
                        <span className="font-medium">at_head1-15</span> - Attribute slugs
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Variants Template</h3>
                    <p className="text-sm text-muted-foreground">
                      Product variants with dynamic attribute values. SKU auto-generated from product_sku + attribute values.
                    </p>
                  </div>

                  <div className="flex items-center justify-between rounded-md border border-dashed p-3">
                    <div>
                      <p className="text-sm font-medium">variants_template.csv</p>
                      <p className="text-xs text-muted-foreground">
                        Product variants with attribute values
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleDownloadVariantsTemplate}>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={() => setStep(2)}>
                    Continue to Upload
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
                    <CardTitle>Upload CSV/ZIP File</CardTitle>
                    <CardDescription>
                      Upload your filled CSV or ZIP file. ZIP can contain multiple CSV files (products, variants, images, attributes).
                    </CardDescription>
                  </div>
                  <Badge variant="outline">Step 2 of 3</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
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
                    <p className="text-sm font-medium">Drag and drop your CSV or ZIP file</p>
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
                          ? "Waiting for worker to pick up job..."
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

                    {importedProducts.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-3">Imported Products</h3>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[60px]">Row #</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {importedProducts.slice(0, 100).map((record, i) => (
                                <TableRow key={record.id ?? i}>
                                  <TableCell>{record.rowNumber}</TableCell>
                                  <TableCell className="font-mono">{record.sku ?? "-"}</TableCell>
                                  <TableCell>{record.message.replace("Created: ", "")}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400">
                                      Imported
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        {importedProducts.length > 100 && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Showing first 100 of {importedProducts.length} imported products.
                          </p>
                        )}
                      </div>
                    )}

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

                    {importedProducts.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-3">Imported Products</h3>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[60px]">Row #</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {importedProducts.slice(0, 100).map((record, i) => (
                                <TableRow key={record.id ?? i}>
                                  <TableCell>{record.rowNumber}</TableCell>
                                  <TableCell className="font-mono">{record.sku ?? "-"}</TableCell>
                                  <TableCell>{record.message.replace("Created: ", "")}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400">
                                      Imported
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        {importedProducts.length > 100 && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Showing first 100 of {importedProducts.length} imported products.
                          </p>
                        )}
                      </div>
                    )}

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
        </TabsContent>

        {/* Edit Tab */}
        <TabsContent value="edit">
          {/* Step Indicator */}
          <div className="flex items-center gap-4 mb-6">
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
                Download Edit Templates
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
                Upload Edited Files
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

          {/* Step 1: Download Edit Template */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Download Edit Templates</CardTitle>
                <CardDescription>
                  Select branch categories to filter which products and variants to export. All leaf categories under each branch will be included.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Branch Category Filter */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">
                      Filter by Branch Categories
                    </Label>
                    {branchCategories.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto py-1 text-xs"
                        onClick={toggleAllCategories}
                      >
                        {selectedCategoryIds.length === branchCategories.length
                          ? "Deselect All"
                          : "Select All"}
                      </Button>
                    )}
                  </div>

                  {!categoriesLoaded ? (
                    <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                      Loading categories...
                    </div>
                  ) : branchCategories.length === 0 ? (
                    <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                      No branch categories found.
                    </div>
                  ) : (
                    <ScrollArea className="h-48 rounded-md border">
                      <div className="p-3 space-y-1">
                        {branchCategories.map((cat) => (
                          <label
                            key={cat.id}
                            className="flex items-center gap-3 rounded-sm px-2 py-1.5 hover:bg-muted/50 cursor-pointer"
                          >
                            <Checkbox
                              checked={selectedCategoryIds.includes(cat.id)}
                              onCheckedChange={() => toggleCategory(cat.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {cat.name}
                              </p>
                              {cat.path && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {cat.path}
                                </p>
                              )}
                            </div>
                            {cat.productCount > 0 && (
                              <Badge variant="secondary" className="text-xs shrink-0">
                                {cat.productCount} products
                              </Badge>
                            )}
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                  )}

                  {selectedCategoryIds.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectedCategoryIds.length} of {branchCategories.length} branches selected
                      {selectedCategoryIds.length === branchCategories.length &&
                        " -- exporting all products"}
                    </p>
                  )}
                </div>

                {/* Download Cards */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-md border border-dashed p-3">
                    <div>
                      <p className="text-sm font-medium">products-edit.csv</p>
                      <p className="text-xs text-muted-foreground">
                        Product data: SKU, name, cell, description, attribute headers
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-dashed p-3">
                    <div>
                      <p className="text-sm font-medium">variants-edit.csv</p>
                      <p className="text-xs text-muted-foreground">
                        Variant data: linked by product_sku, price, stock, attribute values
                      </p>
                    </div>
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Editing Tips</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-muted-foreground">
                      <li>Two CSV files are downloaded: <strong>products-edit.csv</strong> and <strong>variants-edit.csv</strong></li>
                      <li>Keep the <strong>product_sku</strong> column unchanged -- it links products to variants</li>
                      <li>Edit only the columns you want to change, delete rows you don&#39;t want to update</li>
                      <li>Re-upload each edited CSV separately, or bundle both in a ZIP file</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <div className="flex items-center justify-between pt-4">
                  <Button
                    onClick={handleExportEditCsv}
                    disabled={isExporting || branchCategories.length === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {isExporting
                      ? "Exporting..."
                      : selectedCategoryIds.length > 0
                        ? `Download ${selectedCategoryIds.length} Branch${selectedCategoryIds.length > 1 ? "es" : ""}`
                        : "Download All Products"}
                  </Button>
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Continue to Upload
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Upload Edited File */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Upload Edited CSV</CardTitle>
                    <CardDescription>
                      Upload your edited CSV file with product updates.
                    </CardDescription>
                  </div>
                  <Badge variant="outline">Step 2 of 3</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
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
                    <p className="text-sm font-medium">Drag and drop your edited CSV file</p>
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
                          ? "Waiting for worker to pick up job..."
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
                        Update Complete
                      </AlertTitle>
                      <AlertDescription className="text-green-700 dark:text-green-400">
                        {job.successRows} of {job.totalRows || job.processedRows} products updated successfully.
                      </AlertDescription>
                    </Alert>

                    <div className="flex gap-8 mt-6 p-4 bg-muted rounded-lg">
                      <div>
                        <p className="text-2xl font-bold">{job.totalRows || job.processedRows}</p>
                        <p className="text-sm text-muted-foreground">Total Rows</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">{job.successRows}</p>
                        <p className="text-sm text-muted-foreground">Updated</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{job.failedRows}</p>
                        <p className="text-sm text-muted-foreground">Errors</p>
                      </div>
                    </div>

                    {importedProducts.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-3">Updated Products</h3>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[60px]">Row #</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {importedProducts.slice(0, 100).map((record, i) => (
                                <TableRow key={record.id ?? i}>
                                  <TableCell>{record.rowNumber}</TableCell>
                                  <TableCell className="font-mono">{record.sku ?? "-"}</TableCell>
                                  <TableCell>{record.message.replace("Created: ", "")}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400">
                                      Updated
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        {importedProducts.length > 100 && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Showing first 100 of {importedProducts.length} updated products.
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex justify-end gap-2 mt-6">
                      <Button variant="outline" onClick={handleReset}>
                        Update More
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
                        {job.successRows > 0 ? "Update Completed with Errors" : "Update Failed"}
                      </AlertTitle>
                      <AlertDescription className="text-amber-700 dark:text-amber-400">
                        {job.successRows} of {job.totalRows || job.processedRows} products updated successfully. {job.failedRows} rows had errors.
                      </AlertDescription>
                    </Alert>

                    <div className="flex gap-8 mt-6 p-4 bg-muted rounded-lg">
                      <div>
                        <p className="text-2xl font-bold">{job.totalRows || job.processedRows}</p>
                        <p className="text-sm text-muted-foreground">Total Rows</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">{job.successRows}</p>
                        <p className="text-sm text-muted-foreground">Updated</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-red-600">{job.failedRows}</p>
                        <p className="text-sm text-muted-foreground">Errors</p>
                      </div>
                    </div>

                    {importedProducts.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-3">Updated Products</h3>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[60px]">Row #</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {importedProducts.slice(0, 100).map((record, i) => (
                                <TableRow key={record.id ?? i}>
                                  <TableCell>{record.rowNumber}</TableCell>
                                  <TableCell className="font-mono">{record.sku ?? "-"}</TableCell>
                                  <TableCell>{record.message.replace("Created: ", "")}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400">
                                      Updated
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        {importedProducts.length > 100 && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Showing first 100 of {importedProducts.length} updated products.
                          </p>
                        )}
                      </div>
                    )}

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
                          Update More
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
