"use client"

import { useEffect, useRef, useState } from "react"
import {
  Upload as UploadIcon,
  CheckCircle2,
  AlertCircle,
  Download,
  Image as ImageIcon,
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

import {
  uploadImageZip,
  getImageImportStatus,
  type ImageImportResponse,
  type ImageImportStatus,
} from "@/lib/api/image-import"

type UploadState = "idle" | "uploading" | "processing" | "success" | "errors"

export default function UploadImagesPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>("idle")
  const [job, setJob] = useState<ImageImportStatus | null>(null)
  const [isPolling, setIsPolling] = useState(false)

  useEffect(() => {
    if (!isPolling || !job) return

    const interval = setInterval(async () => {
      try {
        const updated = await getImageImportStatus(job.id)
        setJob(updated)

        if (updated.status === "COMPLETED" || updated.status === "FAILED") {
          setIsPolling(false)
          if (updated.status === "COMPLETED") {
            setUploadState(updated.failedFiles > 0 ? "errors" : "success")
          } else {
            setUploadState("errors")
          }
        }
      } catch (error) {
        console.error("Failed to poll import job", error)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [isPolling, job])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.zip')) {
        toast.error("Please upload a ZIP file")
        return
      }
      setSelectedFile(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.name.endsWith('.zip')) {
      setSelectedFile(file)
    } else {
      toast.error("Please upload a ZIP file")
    }
  }

  const handleUpload = () => {
    if (!selectedFile) {
      toast.error("Please select a file to upload")
      return
    }

    setUploadState("uploading")
    uploadImageZip(selectedFile)
      .then((response: ImageImportResponse) => {
        toast.success("Image import job created")
        setJob({
          id: response.jobId,
          status: "PENDING",
          totalFiles: 0,
          processedFiles: 0,
          successFiles: 0,
          failedFiles: 0,
          errors: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          startedAt: null,
          finishedAt: null,
        })
        setIsPolling(true)
        setUploadState("processing")
      })
      .catch((error: unknown) => {
        console.error("Failed to create image import job", error)
        setUploadState("errors")
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to start image import",
        )
      })
  }

  const handleReset = () => {
    setSelectedFile(null)
    setUploadState("idle")
    setJob(null)
    setIsPolling(false)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Upload Product Images</h1>
        <p className="text-muted-foreground">
          Bulk upload product images using a ZIP file
        </p>
      </div>

      <Alert>
        <ImageIcon className="h-4 w-4" />
        <AlertTitle>Image Upload Format</AlertTitle>
        <AlertDescription>
          <div className="mt-2 space-y-2">
            <div>
              <strong className="text-sm font-medium">Filename Format:</strong>
              <p className="text-sm text-muted-foreground">
                Images must be named as SKU-POSITION.ext (e.g., 91578A103-1.jpg or 91578A103(1).jpg)
              </p>
            </div>
            <div>
              <strong className="text-sm font-medium">Supported Formats:</strong>
              <p className="text-sm text-muted-foreground">
                JPG, JPEG, PNG, WEBP, GIF
              </p>
            </div>
            <div>
              <strong className="text-sm font-medium">Position 1:</strong>
              <p className="text-sm text-muted-foreground">
                The image with position 1 will be set as the primary image for the variant
              </p>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Upload State */}
      {(uploadState === "idle" || uploadState === "uploading") && (
        <Card>
          <CardHeader>
            <CardTitle>Upload ZIP File</CardTitle>
            <CardDescription>
              Upload a ZIP file containing product images. We'll process them asynchronously and update your catalog.
            </CardDescription>
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
                accept=".zip"
                onChange={handleFileSelect}
              />
              <UploadIcon className="h-10 w-10 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Drag and drop your ZIP file</p>
                <p className="text-xs text-muted-foreground">or click to browse</p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                ZIP files only. Images will be extracted and processed asynchronously.
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
              <Button variant="outline" asChild>
                <Link href="/dhthub-admin/products">Cancel</Link>
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploadState === "uploading"}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {uploadState === "uploading" ? "Uploading..." : "Start Upload"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing State */}
      {uploadState === "processing" && job && isPolling && (
        <Card>
          <CardContent className="pt-6">
            <Alert>
              <AlertCircle className="h-4 w-4 animate-spin" />
              <AlertTitle>Processing Images...</AlertTitle>
              <AlertDescription>
                {job.status === "PENDING"
                  ? "Waiting for worker to pick up job..."
                  : job.totalFiles > 0
                    ? `${job.processedFiles} of ${job.totalFiles} images processed.`
                    : "Extracting and processing images..."}
              </AlertDescription>
            </Alert>

            <div className="flex gap-8 mt-6 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-2xl font-bold">{job.totalFiles || job.processedFiles}</p>
                <p className="text-sm text-muted-foreground">Total Images</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{job.successFiles}</p>
                <p className="text-sm text-muted-foreground">Uploaded</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{job.failedFiles}</p>
                <p className="text-sm text-muted-foreground">Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {uploadState === "success" && job && job.failedFiles === 0 && (
        <Card>
          <CardContent className="pt-6">
            <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800 dark:text-green-300">
                Upload Complete
              </AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-400">
                {job.successFiles} of {job.totalFiles || job.processedFiles} images uploaded successfully.
              </AlertDescription>
            </Alert>

            <div className="flex gap-8 mt-6 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-2xl font-bold">{job.totalFiles || job.processedFiles}</p>
                <p className="text-sm text-muted-foreground">Total Images</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{job.successFiles}</p>
                <p className="text-sm text-muted-foreground">Uploaded</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{job.failedFiles}</p>
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

      {/* Error State */}
      {uploadState === "errors" && job && job.errors.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800 dark:text-amber-300">
                {job.successFiles > 0 ? "Upload Completed with Errors" : "Upload Failed"}
              </AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                {job.successFiles} of {job.totalFiles || job.processedFiles} images uploaded successfully. {job.failedFiles} images had errors.
              </AlertDescription>
            </Alert>

            <div className="flex gap-8 mt-6 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-2xl font-bold">{job.totalFiles || job.processedFiles}</p>
                <p className="text-sm text-muted-foreground">Total Images</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{job.successFiles}</p>
                <p className="text-sm text-muted-foreground">Uploaded</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{job.failedFiles}</p>
                <p className="text-sm text-muted-foreground">Errors</p>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Error Details</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filename</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {job.errors.map((error, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono">{error.filename}</TableCell>
                      <TableCell className="text-destructive">{error.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between mt-6">
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleReset}>
                  Upload Another
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link href="/dhthub-admin/products">View Products</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
