"use client"

import { useState, useMemo, useRef } from "react"
import {
  Upload as UploadIcon,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Download,
  ChevronRight,
  Check,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

import {
  mockCategories,
  mockAttributes,
  getLeafCategories,
  type Category,
  type UploadError,
} from "@/lib/mock-data"

type UploadStep = 1 | 2 | 3
type UploadState = "idle" | "uploading" | "success" | "errors"

function getCategoryPath(category: Category, categories: Category[]): string {
  const parts: string[] = [category.name]
  let current = category

  const findParent = (cats: Category[], id: string): Category | undefined => {
    for (const cat of cats) {
      if (cat.children.some((c) => c.id === id)) return cat
      const found = findParent(cat.children, id)
      if (found) return found
    }
  }

  while (current.parentId) {
    const parent = findParent(categories, current.id)
    if (parent) {
      parts.unshift(parent.name)
      current = parent
    } else {
      break
    }
  }

  return parts.join(" > ")
}

const mockUploadErrors: UploadError[] = [
  {
    rowNumber: 14,
    sku: "91257B001",
    column: "material",
    error: '"Stainless" is not an allowed value. Use: 316 Stainless Steel, 18-8 Stainless Steel',
  },
  {
    rowNumber: 27,
    sku: "91257B002",
    column: "length",
    error: 'Must be a number. Received: "1.5 inches"',
  },
  {
    rowNumber: 45,
    sku: "91257B003",
    column: "sku",
    error: "SKU already exists in the system",
  },
]

const mockPreviewData = [
  { sku: "91257B010", name: "Hex Bolt 1/4-20 x 1in", material: "316 Stainless Steel", length: "1", finish: "Plain" },
  { sku: "91257B011", name: "Hex Bolt 1/4-20 x 1.5in", material: "316 Stainless Steel", length: "1.5", finish: "Plain" },
  { sku: "91257B012", name: "Hex Bolt 1/4-20 x 2in", material: "18-8 Stainless Steel", length: "2", finish: "Passivated" },
  { sku: "91257B013", name: "Hex Bolt 5/16-18 x 1in", material: "316 Stainless Steel", length: "1", finish: "Plain" },
  { sku: "91257B014", name: "Hex Bolt 5/16-18 x 1.5in", material: "304 Stainless Steel", length: "1.5", finish: "Black Oxide" },
]

export default function UploadPage() {
  const leafCategories = useMemo(() => getLeafCategories(mockCategories), [])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<UploadStep>(1)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>("idle")
  const [previewState, setPreviewState] = useState<"success" | "errors">("errors")

  const selectedCategory = useMemo(() => {
    if (!selectedCategoryId) return null
    const findCategory = (cats: Category[], id: string): Category | undefined => {
      for (const cat of cats) {
        if (cat.id === id) return cat
        const found = findCategory(cat.children, id)
        if (found) return found
      }
    }
    return findCategory(mockCategories, selectedCategoryId)
  }, [selectedCategoryId])

  const categoryAttributes = useMemo(() => {
    if (!selectedCategoryId) return []
    return mockAttributes.filter((attr) => attr.categoryId === selectedCategoryId)
  }, [selectedCategoryId])

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategoryId(categoryId)
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
    if (file && (file.name.endsWith(".csv") || file.name.endsWith(".xlsx"))) {
      setSelectedFile(file)
    } else {
      toast.error("Please upload a CSV or Excel file")
    }
  }

  const handleUploadAndValidate = () => {
    if (!selectedFile) return

    setUploadState("uploading")

    // Simulate upload/validation
    setTimeout(() => {
      // Randomly choose success or errors for demo
      setUploadState(previewState === "success" ? "success" : "errors")
      setStep(3)
    }, 2000)
  }

  const handleDownloadTemplate = () => {
    toast.success("Template downloaded")
  }

  const handleDownloadErrorReport = () => {
    toast.success("Error report downloaded")
  }

  const handleReset = () => {
    setStep(1)
    setSelectedCategoryId("")
    setSelectedFile(null)
    setUploadState("idle")
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
          Bulk upload products into a leaf category using a CSV file
        </p>
      </div>

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
            Select Category
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

      {/* Step 1: Select Category */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select a Leaf Category</CardTitle>
            <CardDescription>
              Choose the category where you want to upload products
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={selectedCategoryId} onValueChange={handleCategorySelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Search and select a leaf category" />
                </SelectTrigger>
                <SelectContent>
                  {leafCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {getCategoryPath(cat, mockCategories)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCategory && (
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div>
                  <p className="font-medium">{selectedCategory.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {getCategoryPath(selectedCategory, mockCategories)}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedCategory.productCount} existing products in this category
                </p>

                {categoryAttributes.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Required CSV columns:</p>
                    <div className="flex flex-wrap gap-2">
                      {categoryAttributes.map((attr) => (
                        <Badge key={attr.id} variant={attr.isRequired ? "default" : "secondary"}>
                          {attr.name}
                          {attr.isRequired && " *"}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV Template
                </Button>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" asChild>
                <Link href="/dhthub-admin/products">Cancel</Link>
              </Button>
              <Button onClick={() => setStep(2)} disabled={!selectedCategoryId}>
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
            <CardTitle>Upload File</CardTitle>
            <CardDescription>
              Upload your CSV or Excel file with product data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".csv,.xlsx"
                onChange={handleFileSelect}
              />
              <UploadIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-1">
                Drag your CSV or Excel file here
              </p>
              <p className="text-muted-foreground mb-2">or click to browse</p>
              <p className="text-xs text-muted-foreground">.csv or .xlsx only</p>
            </div>

            {selectedFile && (
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>

                <div className="p-3 bg-background rounded border">
                  <p className="text-sm font-medium mb-2">Detected 150 rows</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Preview of first 5 rows:
                  </p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">SKU</TableHead>
                        <TableHead className="text-xs">Name</TableHead>
                        <TableHead className="text-xs">Material</TableHead>
                        <TableHead className="text-xs">Length</TableHead>
                        <TableHead className="text-xs">Finish</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockPreviewData.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs font-mono">{row.sku}</TableCell>
                          <TableCell className="text-xs">{row.name}</TableCell>
                          <TableCell className="text-xs">{row.material}</TableCell>
                          <TableCell className="text-xs">{row.length}</TableCell>
                          <TableCell className="text-xs">{row.finish}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedFile(null)}>
                  Clear
                </Button>
                <Button
                  onClick={handleUploadAndValidate}
                  disabled={!selectedFile || uploadState === "uploading"}
                >
                  {uploadState === "uploading" ? "Validating..." : "Upload & Validate"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review Results */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Dev Toggle for Preview States */}
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
            <span className="text-sm text-muted-foreground">Preview:</span>
            <Tabs value={previewState} onValueChange={(v) => setPreviewState(v as "success" | "errors")}>
              <TabsList className="h-8">
                <TabsTrigger value="success" className="text-xs h-7">Success</TabsTrigger>
                <TabsTrigger value="errors" className="text-xs h-7">Errors</TabsTrigger>
              </TabsList>
            </Tabs>
            <span className="text-xs text-muted-foreground ml-2">(Remove in Phase 2)</span>
          </div>

          {previewState === "success" ? (
            <Card>
              <CardContent className="pt-6">
                <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800 dark:text-green-300">
                    Upload Complete
                  </AlertTitle>
                  <AlertDescription className="text-green-700 dark:text-green-400">
                    200 of 200 rows imported successfully.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-8 mt-6 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-2xl font-bold">200</p>
                    <p className="text-sm text-muted-foreground">Total Rows</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">200</p>
                    <p className="text-sm text-muted-foreground">Valid</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">0</p>
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
          ) : (
            <Card>
              <CardContent className="pt-6">
                <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800 dark:text-amber-300">
                    Upload Completed with Errors
                  </AlertTitle>
                  <AlertDescription className="text-amber-700 dark:text-amber-400">
                    132 of 150 rows imported successfully. 18 rows had errors.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-8 mt-6 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-2xl font-bold">150</p>
                    <p className="text-sm text-muted-foreground">Total Rows</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">132</p>
                    <p className="text-sm text-muted-foreground">Valid</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">18</p>
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
                        <TableHead>Column</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockUploadErrors.map((error, i) => (
                        <TableRow key={i}>
                          <TableCell>{error.rowNumber}</TableCell>
                          <TableCell className="font-mono">{error.sku}</TableCell>
                          <TableCell>{error.column}</TableCell>
                          <TableCell className="text-destructive">{error.error}</TableCell>
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
                      <Link href="/dhthub-admin/products">View Imported Products</Link>
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
