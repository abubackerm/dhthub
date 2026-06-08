"use client"

import { useEffect, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Loader2, Upload } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { ApiError } from "@/lib/api/client"
import {
  uploadAttributesCsv,
  uploadAttributesZip,
  downloadAttributeTemplate,
  type AttributeImportResult,
} from "@/lib/api/catalog"
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

export default function AttributesImportPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [importFile, setImportFile] = useState<File | null>(null)
  const [validateOnly, setValidateOnly] = useState(false)
  const [conflictMode, setConflictMode] = useState<'skip' | 'replace' | 'add_anyway'>('skip')
  const [importJob, setImportJob] = useState<ImportJobView | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [csvImportResult, setCsvImportResult] = useState<AttributeImportResult | null>(null)

  useEffect(() => {
    if (!isPolling || !importJob) return

    const interval = setInterval(async () => {
      try {
        const updated = await getImportJob(importJob.id)
        setImportJob(updated)

        if (updated.status === "COMPLETED" || updated.status === "FAILED" || updated.status === "CANCELLED") {
          setIsPolling(false)

          // Auto-refresh attributes list on completion
          await queryClient.invalidateQueries({ queryKey: ["global-attributes"] })
        }
      } catch (error) {
        console.error("Failed to poll import job", error)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [isPolling, importJob, queryClient])

  const importMutation = useMutation({
    mutationFn: async (payload: { file: File; validateOnly: boolean; conflictMode: 'skip' | 'replace' | 'add_anyway' }) => {
      console.log('[Import] Starting import:', payload.file.name, 'validateOnly:', payload.validateOnly, 'conflictMode:', payload.conflictMode)
      
      if (payload.file.name.endsWith('.zip')) {
        console.log('[Import] Detected ZIP file, calling uploadAttributesZip')
        return uploadAttributesZip(payload.file, { conflictMode: payload.conflictMode })
      }
      console.log('[Import] Detected CSV file, calling uploadAttributesCsv')
      return uploadAttributesCsv(payload.file, { validateOnly: payload.validateOnly, conflictMode: payload.conflictMode })
    },
    onSuccess: async (result, variables) => {
      console.log('[Import] Success:', result)
      
      if ('jobId' in result) {
        // ZIP upload - async processing - start polling
        toast.success(`Import job created: ${result.jobId}. Processing will begin shortly.`)
        
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
          type: "ZIP",
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
        return
      }
      
      // CSV upload - immediate results
      console.log('[Import] CSV Result:', JSON.stringify(result))
      setCsvImportResult(result)
      
      if (result.errors && result.errors.length > 0) {
        toast.error(`Import completed with ${result.errors.length} errors`)
      } else {
        toast.success(`Import successful: ${result.successRows} rows processed`)
      }

      await queryClient.invalidateQueries({ queryKey: ["global-attributes"] })
    },
    onError: (error) => {
      console.error('[Import] Error:', error)
      console.error('[Import] Error details:', JSON.stringify(error))
      toast.error(getErrorMessage(error, "Failed to import attributes"))
    },
  })

  const downloadTemplateMutation = useMutation({
    mutationFn: async () => {
      const blob = await downloadAttributeTemplate()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'attributes-template.csv'
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      // Reset previous results when selecting new file
      setCsvImportResult(null)
      setImportFile(file)
    }
  }

  function handleImport() {
    if (importFile) {
      console.log('[Import] Calling importMutation.mutate')
      // Reset previous results
      setCsvImportResult(null)
      importMutation.mutate({ file: importFile, validateOnly, conflictMode })
    }
  }

  function handleReset() {
    setImportFile(null)
    setValidateOnly(false)
    setConflictMode('skip')
    setImportJob(null)
    setIsPolling(false)
    setCsvImportResult(null)
  }

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Import Attributes</h1>
          <p className="text-muted-foreground">
            Upload a CSV file to bulk import attribute definitions. Use template below for correct format.
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Import Attributes</CardTitle>
          <CardDescription>
            Upload a CSV or ZIP file containing attribute definitions. Slug and sort order are auto-generated.
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
                <Upload className="mr-2 h-4 w-4" />
              )}
              Download Template
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={!importFile && !importJob && !csvImportResult}>
              Reset
            </Button>
          </div>

          <div className="grid gap-2">
            <Label>Upload File</Label>
            <Input
              type="file"
              accept=".csv,.zip"
              onChange={handleFileChange}
              disabled={importMutation.isPending || !!importJob || !!csvImportResult}
            />
            <p className="text-xs text-muted-foreground">
              Upload a CSV or ZIP file containing attribute definitions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="validate-only"
              checked={validateOnly}
              onCheckedChange={setValidateOnly}
              disabled={!!importJob || !!csvImportResult}
            />
            <Label htmlFor="validate-only">Validate only (don't import)</Label>
          </div>

          <div className="space-y-2">
            <Label>Conflict Mode</Label>
            <RadioGroup
              value={conflictMode}
              onValueChange={(value) => setConflictMode(value as 'skip' | 'replace' | 'add_anyway')}
              disabled={!!importJob || !!csvImportResult}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="skip" id="skip" />
                <Label htmlFor="skip" className="font-normal cursor-pointer">
                  <span className="font-medium">Skip duplicates</span>
                  <span className="text-muted-foreground ml-2">- Keep existing attributes unchanged</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="replace" id="replace" />
                <Label htmlFor="replace" className="font-normal cursor-pointer">
                  <span className="font-medium">Replace existing</span>
                  <span className="text-muted-foreground ml-2">- Update existing attributes with new data</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="add_anyway" id="add_anyway" />
                <Label htmlFor="add_anyway" className="font-normal cursor-pointer">
                  <span className="font-medium">Add as new</span>
                  <span className="text-muted-foreground ml-2">- Always create new, even if name exists</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {importFile && !importJob && !csvImportResult && (
            <div className="rounded-md border p-3 text-sm">
              <div className="font-medium">{importFile.name}</div>
              <div className="text-muted-foreground">{(importFile.size / 1024).toFixed(2)} KB</div>
            </div>
          )}

          {/* CSV Import Loading State */}
          {importMutation.isPending && !importJob && !csvImportResult && (
            <div className="rounded-md border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Importing...</span>
                <Badge variant="outline">PROCESSING</Badge>
              </div>
              <div className="space-y-2">
                <Progress value={50} className="animate-pulse" />
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing file...
                </div>
              </div>
            </div>
          )}

          {/* ZIP Import Progress */}
          {importJob && (
            <div className="rounded-md border p-4 space-y-3">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Import Status</span>
                <Badge variant={getStatusVariant(importJob.status)}>{importJob.status}</Badge>
              </div>

              {/* Progress Bar */}
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

              {/* Results Summary */}
              {importJob.status === "COMPLETED" && (
                <div className="text-sm space-y-2">
                  <div className="text-muted-foreground">Total rows: {importJob.totalRows}</div>
                  <div className="text-green-600">Success: {importJob.successRows}</div>
                  {importJob.failedRows > 0 && (
                    <div className="text-red-600">Failed: {importJob.failedRows}</div>
                  )}
                  {importJob.failedRows === 0 && importJob.successRows > 0 && (
                    <div className="text-blue-600">All attributes imported successfully!</div>
                  )}
                </div>
              )}

              {/* Error Message */}
              {importJob.status === "FAILED" && (
                <div className="text-sm text-red-600">Import failed. Please check your file format and try again.</div>
              )}

              {/* Processing indicator */}
              {(importJob.status === "PENDING" || importJob.status === "PROCESSING") && (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {importJob.status === "PENDING" ? "Waiting to start..." : "Processing..."}
                </div>
              )}
            </div>
          )}

          {/* CSV Import Results */}
          {csvImportResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Import Status</span>
                <Badge variant="default">COMPLETED</Badge>
              </div>

              {/* Results Summary */}
              <div className="text-sm space-y-2">
                <div className="text-muted-foreground">Total rows: {csvImportResult.totalRows}</div>
                <div className="text-green-600">Success: {csvImportResult.successRows}</div>
                {csvImportResult.skippedAttributes.length > 0 && (
                  <div className="text-amber-600">Skipped: {csvImportResult.skippedAttributes.length}</div>
                )}
                {csvImportResult.failedRows > 0 && (
                  <div className="text-red-600">Failed: {csvImportResult.failedRows}</div>
                )}
                {csvImportResult.createdAttributes.length > 0 && (
                  <div className="text-blue-600">Created: {csvImportResult.createdAttributes.length}</div>
                )}
                {csvImportResult.updatedAttributes.length > 0 && (
                  <div className="text-amber-600">Updated: {csvImportResult.updatedAttributes.length}</div>
                )}
                {csvImportResult.createdOptions > 0 && (
                  <div className="text-blue-600">Options created: {csvImportResult.createdOptions}</div>
                )}
                {csvImportResult.updatedOptions > 0 && (
                  <div className="text-amber-600">Options updated: {csvImportResult.updatedOptions}</div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <Progress value={100} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{csvImportResult.successRows + csvImportResult.failedRows} of {csvImportResult.totalRows} rows processed</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Skipped Attributes Card */}
              {csvImportResult.skippedAttributes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base text-amber-600">
                      Skipped ({csvImportResult.skippedAttributes.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-48 overflow-y-auto text-sm text-muted-foreground space-y-1">
                      {csvImportResult.skippedAttributes.map((attr, i) => (
                        <div key={i} className="border-b border-border/30 py-2 last:border-0">
                          {attr}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Created Attributes Card */}
              {csvImportResult.createdAttributes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base text-blue-600">
                      Created ({csvImportResult.createdAttributes.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-48 overflow-y-auto text-sm text-muted-foreground space-y-1">
                      {csvImportResult.createdAttributes.map((attr, i) => (
                        <div key={i} className="border-b border-border/30 py-2 last:border-0">
                          {attr}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Updated Attributes Card */}
              {csvImportResult.updatedAttributes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base text-amber-600">
                      Updated ({csvImportResult.updatedAttributes.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-48 overflow-y-auto text-sm text-muted-foreground space-y-1">
                      {csvImportResult.updatedAttributes.map((attr, i) => (
                        <div key={i} className="border-b border-border/30 py-2 last:border-0">
                          {attr}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Error Message */}
              {csvImportResult.failedRows > 0 && (
                <div className="text-sm text-red-600">Some rows failed to import. See errors below for details.</div>
              )}
            </div>
          )}

          {csvImportResult && csvImportResult.errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-destructive">
                  {csvImportResult.errors.length} error(s) found
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-48 overflow-y-auto text-xs space-y-1">
                  {csvImportResult.errors.map((error, i) => (
                    <div key={i} className="text-destructive border-b border-destructive/20 py-2 last:border-0">
                      <div className="font-semibold">Row {error.rowNumber}</div>
                      {error.slug && <div className="text-muted-foreground">Slug: {error.slug}</div>}
                      <div>{error.message}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleImport}
              disabled={!importFile || importMutation.isPending || !!csvImportResult || !!importJob}
            >
              {importMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {validateOnly ? "Validate" : "Import"}
            </Button>
            {csvImportResult && (
              <Button variant="outline" onClick={() => router.back()}>
                Back to Attributes
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
