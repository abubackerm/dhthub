"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, ChevronLeft, ChevronRight, Loader2, Pencil, Plus, Ruler, Search, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ApiError } from "@/lib/api/client"
import {
  createAttribute,
  createAttributeOption,
  deleteAttributeOption,
  deleteAttribute,
  updateAttribute,
  updateAttributeOption,
  getAllAttributes,
  uploadAttributesCsv,
  uploadAttributesZip,
  downloadAttributeTemplate,
  getUnits,
  createUnit,
  deleteUnit,
  type AttributeDataType,
  type AttributeFilterType,
  type AttributeView,
  type ImportJobView,
  type UnitSummary,
} from "@/lib/api/catalog"
import { useConfirmDialog } from "@/providers/confirm-dialog-provider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

type SheetMode = "create" | "edit"
type FilterTypeValue = Exclude<AttributeFilterType, null> | "NONE"

interface AttributeOptionDraft {
  id?: string
  label: string
  value: string
}

interface AttributeFormData {
  name: string
  slug: string
  dataType: AttributeDataType
  group: string
  sortOrder: number
  filterType: FilterTypeValue
  isFilterable: boolean
  options: AttributeOptionDraft[]
}

const initialFormData: AttributeFormData = {
  name: "",
  slug: "",
  dataType: "text",
  group: "",
  sortOrder: 1,
  filterType: "NONE",
  isFilterable: false,
  options: [],
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.getErrorMessage()
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}

function generateSlug(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "") || "attribute"
  )
}

function getDefaultFilterType(dataType: AttributeDataType): FilterTypeValue {
  switch (dataType) {
    case "number":
      return "RANGE"
    case "enum":
      return "CHECKBOX"
    case "boolean":
      return "SELECT"
    default:
      return "NONE"
  }
}

function getDataTypeLabel(dataType: AttributeDataType): string {
  switch (dataType) {
    case "number":
      return "Number"
    case "text":
      return "Text"
    case "enum":
      return "Enum"
    case "boolean":
      return "Boolean"
  }
}

function getFilterLabel(filterType: AttributeFilterType): string {
  if (!filterType) {
    return "None"
  }

  switch (filterType) {
    case "RANGE":
      return "Range"
    case "CHECKBOX":
      return "Checkbox"
    case "SELECT":
      return "Select"
  }
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

export default function AttributesPage() {
  const queryClient = useQueryClient()
  const { confirm } = useConfirmDialog()
  const router = useRouter()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetMode, setSheetMode] = useState<SheetMode>("create")
  const [activeAttribute, setActiveAttribute] = useState<AttributeView | null>(null)
  const [formData, setFormData] = useState<AttributeFormData>(initialFormData)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [unitsDialogOpen, setUnitsDialogOpen] = useState(false)
  const [newUnitName, setNewUnitName] = useState("")
  const [importFile, setImportFile] = useState<File | null>(null)
  const [validateOnly, setValidateOnly] = useState(false)
  const [importJob, setImportJob] = useState<any>(null)
  const [isPolling, setIsPolling] = useState(false)
  
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 100

  const {
    data: globalAttributesResponse,
    isLoading: globalAttributesLoading,
    error: globalAttributesError,
  } = useQuery({
    queryKey: ["global-attributes", currentPage, searchQuery],
    queryFn: () => getAllAttributes({
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      search: searchQuery || undefined,
    }),
    enabled: true,
  })

  const globalAttributes = globalAttributesResponse?.data ?? []
  const totalAttributes = globalAttributesResponse?.total ?? 0
  const totalPages = Math.ceil(totalAttributes / pageSize)

  const createMutation = useMutation({
    mutationFn: async (payload: { formData: AttributeFormData }) => {
      const attribute = await createAttribute({
        name: payload.formData.name.trim(),
        slug: payload.formData.slug,
        dataType: payload.formData.dataType,
        group: payload.formData.group.trim() || undefined,
        sortOrder: payload.formData.sortOrder,
        filterType:
          payload.formData.isFilterable && payload.formData.filterType !== "NONE"
            ? payload.formData.filterType
            : undefined,
        isFilterable: payload.formData.isFilterable,
      })

      if (payload.formData.dataType === "enum") {
        for (const [index, option] of payload.formData.options.entries()) {
          await createAttributeOption(attribute.id, {
            label: option.label.trim(),
            value: option.value.trim(),
            sortOrder: index + 1,
          })
        }
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["global-attributes"] })
      toast.success("Attribute created successfully")
      handleCloseSheet()
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to create attribute"))
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      record: AttributeView
      formData: AttributeFormData
    }) => {
      await updateAttribute(payload.record.id, {
        name: payload.formData.name.trim(),
        dataType: payload.formData.dataType,
        group: payload.formData.group.trim() || undefined,
        sortOrder: payload.formData.sortOrder,
        filterType:
          payload.formData.isFilterable && payload.formData.filterType !== "NONE"
            ? payload.formData.filterType
            : undefined,
        isFilterable: payload.formData.isFilterable,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["global-attributes"] })
      toast.success("Attribute updated successfully")
      handleCloseSheet()
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to update attribute"))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (attributeId: string) => deleteAttribute(attributeId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["global-attributes"] })
      toast.success("Attribute deleted successfully")
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to delete attribute"))
    },
  })

  const importMutation = useMutation({
    mutationFn: async (payload: { file: File; validateOnly: boolean }) => {
      console.log('[Import] Starting import:', payload.file.name, 'validateOnly:', payload.validateOnly)
      
      if (payload.file.name.endsWith('.zip')) {
        console.log('[Import] Detected ZIP file, calling uploadAttributesZip')
        return uploadAttributesZip(payload.file)
      }
      console.log('[Import] Detected CSV file, calling uploadAttributesCsv')
      return uploadAttributesCsv(payload.file, { validateOnly: payload.validateOnly })
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
        // Don't close dialog - show progress instead
        return
      }
      
      // CSV upload - immediate results
      if (result.errors.length > 0) {
        toast.error(`Import completed with ${result.errors.length} errors`)
      } else {
        toast.success(`Import successful: ${result.successRows} rows processed`)
      }

      await queryClient.invalidateQueries({ queryKey: ["global-attributes"] })

      setImportDialogOpen(false)
      setImportFile(null)
      setValidateOnly(false)
    },
    onError: (error) => {
      console.error('[Import] Error:', error)
      toast.error(getErrorMessage(error, "Failed to import attributes"))
    },
  })

  const downloadTemplateMutation = useMutation({
    mutationFn: async () => {
      const blob = await downloadAttributeTemplate()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'attribute-templates.zip'
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

  const {
    data: units = [],
    isLoading: unitsLoading,
  } = useQuery({
    queryKey: ["units"],
    queryFn: () => getUnits(),
    enabled: unitsDialogOpen,
  })

  const createUnitMutation = useMutation({
    mutationFn: (data: { name: string }) => createUnit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] })
      toast.success("Unit created successfully")
      setNewUnitName("")
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to create unit"))
    },
  })

  const deleteUnitMutation = useMutation({
    mutationFn: (id: string) => deleteUnit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] })
      toast.success("Unit deleted successfully")
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to delete unit"))
    },
  })

  function handleCloseSheet() {
    setSheetOpen(false)
    setSheetMode("create")
    setActiveAttribute(null)
    setFormData(initialFormData)
  }

  function openCreateSheet() {
    setSheetMode("create")
    setActiveAttribute(null)
    setFormData({
      ...initialFormData,
      sortOrder: globalAttributes.length + 1,
    })
    setSheetOpen(true)
  }

  function openEditSheet(attribute: AttributeView) {
    setSheetMode("edit")
    setActiveAttribute(attribute)
    setFormData({
      name: attribute.name,
      slug: attribute.slug,
      dataType: attribute.dataType,
      group: attribute.group ?? "",
      sortOrder: attribute.sortOrder,
      filterType: attribute.filterType ?? "NONE",
      isFilterable: attribute.isFilterable,
      options: [],
    })
    setSheetOpen(true)
  }

  async function handleDeleteGlobal(attribute: AttributeView) {
    const confirmed = await confirm({
      title: "Delete global attribute?",
      description: `Are you sure you want to delete "${attribute.name}"? This will remove it from all categories and cannot be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "destructive",
    })

    if (!confirmed) {
      return
    }

    deleteMutation.mutate(attribute.id)
  }

  function handleNameChange(name: string) {
    setFormData((prev) => ({
      ...prev,
      name,
      slug:
        prev.slug === "" || prev.slug === generateSlug(prev.name)
          ? generateSlug(name)
          : prev.slug,
    }))
  }

  function handleDataTypeChange(dataType: AttributeDataType) {
    setFormData((prev) => ({
      ...prev,
      dataType,
      isFilterable: dataType !== "text" ? prev.isFilterable : false,
      filterType:
        dataType === "text"
          ? "NONE"
          : prev.filterType === "NONE"
            ? getDefaultFilterType(dataType)
            : prev.filterType,
      options: dataType === "enum" ? prev.options : [],
    }))
  }

  function handleAddOption() {
    setFormData((prev) => ({
      ...prev,
      options: [...prev.options, { label: "", value: "" }],
    }))
  }

  function handleOptionChange(
    index: number,
    field: keyof AttributeOptionDraft,
    value: string,
  ) {
    setFormData((prev) => {
      const options = [...prev.options]
      const current = options[index]

      if (!current) {
        return prev
      }

      if (field === "label") {
        options[index] = {
          ...current,
          label: value,
          value:
            current.value === "" || current.value === generateSlug(current.label)
              ? generateSlug(value)
              : current.value,
        }
      } else {
        options[index] = {
          ...current,
          [field]: value,
        }
      }

      return {
        ...prev,
        options,
      }
    })
  }

  function handleRemoveOption(index: number) {
    setFormData((prev) => ({
      ...prev,
      options: prev.options.filter((_, optionIndex) => optionIndex !== index),
    }))
  }

  function validateForm(): string | null {
    if (!formData.name.trim()) {
      return "Attribute name is required"
    }

    if (!formData.slug.trim()) {
      return "Attribute slug is required"
    }

    if (formData.dataType === "enum" && formData.options.length === 0) {
      return "Enum attributes require at least one option"
    }

    for (const option of formData.options) {
      if (!option.label.trim() || !option.value.trim()) {
        return "Each option requires both a label and a value"
      }
    }

    return null
  }

  function handleSave() {
    const validationError = validateForm()

    if (validationError) {
      toast.error(validationError)
      return
    }

    if (sheetMode === "create") {
      createMutation.mutate({ formData })
      return
    }

    if (sheetMode === "edit" && activeAttribute) {
      updateMutation.mutate({
        record: activeAttribute,
        formData,
      })
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Attributes</h1>
          <p className="text-muted-foreground">
            Manage global attribute definitions available across all categories.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setUnitsDialogOpen(true)}>
            <Ruler className="mr-2 h-4 w-4" />
            Manage Units
          </Button>
          <Button variant="outline" onClick={() => router.push("/dhthub-admin/attributes/import")}>
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
        </div>
      </div>

      <div>
          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-lg">Global Attributes</CardTitle>
                <CardDescription>
                  All attribute definitions available for category assignment
                </CardDescription>
              </div>
              <Button onClick={openCreateSheet}>
                <Plus className="mr-2 h-4 w-4" />
                Add Attribute
              </Button>
            </CardHeader>
            <CardContent>
              {/* Search and pagination info */}
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search attributes..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setCurrentPage(1) // Reset to first page on search
                    }}
                    className="pl-9"
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  {totalAttributes} attribute{totalAttributes !== 1 ? 's' : ''}
                </div>
              </div>

              {globalAttributesLoading ? (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading attributes...
                </div>
              ) : globalAttributesError ? (
                <div className="py-4 text-sm text-destructive">
                  {getErrorMessage(globalAttributesError, "Failed to load attributes")}
                </div>
              ) : globalAttributes.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <p>{searchQuery ? "No attributes match your search." : "No global attributes found."}</p>
                  {!searchQuery && <p className="mt-1 text-sm">Import CSV or create your first attribute.</p>}
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Group</TableHead>
                        <TableHead>Filter</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Required</TableHead>
                        <TableHead className="w-[140px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {globalAttributes.map((attribute) => (
                        <TableRow key={attribute.id}>
                          <TableCell className="font-medium">{attribute.name}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {attribute.slug}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{getDataTypeLabel(attribute.dataType)}</Badge>
                          </TableCell>
                          <TableCell>{attribute.group || "-"}</TableCell>
                          <TableCell>{getFilterLabel(attribute.filterType)}</TableCell>
                          <TableCell>{attribute.unitName || "-"}</TableCell>
                          <TableCell>
                            {attribute.isRequired ? (
                              <Check className="h-4 w-4 text-(--dht-green)" />
                            ) : (
                              <span className="text-muted-foreground">No</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditSheet(attribute)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteGlobal(attribute)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination controls */}
                  {totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between border-t pt-4">
                      <div className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="mr-1 h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
      </div>

      <Sheet open={sheetOpen} onOpenChange={(open) => (open ? setSheetOpen(true) : handleCloseSheet())}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              {sheetMode === "create"
                ? "Create Attribute"
                : sheetMode === "edit"
                  ? "Edit Attribute"
                  : "View Attribute"}
            </SheetTitle>
            <SheetDescription>
              Managing global attribute definition.
            </SheetDescription>
          </SheetHeader>

          <div className="grid gap-4 py-6">
            <div className="grid gap-2">
                  <Label htmlFor="attribute-name">
                    Attribute Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="attribute-name"
                    value={formData.name}
                    onChange={(event) => handleNameChange(event.target.value)}
                    placeholder="e.g. Thread Size"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="attribute-slug">Slug</Label>
                  <Input
                    id="attribute-slug"
                    value={formData.slug}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, slug: event.target.value }))
                    }
                    className="font-mono text-sm"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Data Type</Label>
                  <Select
                    value={formData.dataType}
                    onValueChange={(value: AttributeDataType) => handleDataTypeChange(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a data type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="enum">Enum</SelectItem>
                      <SelectItem value="boolean">Boolean</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="attribute-group">Group</Label>
                  <Input
                    id="attribute-group"
                    value={formData.group}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, group: event.target.value }))
                    }
                    placeholder="e.g. Technical Specs"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="attribute-order">Sort Order</Label>
                  <Input
                    id="attribute-order"
                    type="number"
                    min={0}
                    value={formData.sortOrder}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        sortOrder: Number(event.target.value) || 0,
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between rounded-md border px-3 py-3">
                  <div className="grid gap-1">
                    <Label htmlFor="attribute-filterable">Filterable</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable filtering for this attribute on listing pages.
                    </p>
                  </div>
                  <Switch
                    id="attribute-filterable"
                    checked={formData.isFilterable}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        isFilterable: checked,
                        filterType: checked
                          ? prev.filterType === "NONE"
                            ? getDefaultFilterType(prev.dataType)
                            : prev.filterType
                          : "NONE",
                      }))
                    }
                    disabled={formData.dataType === "text"}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Filter Type</Label>
                  <Select
                    value={formData.filterType}
                    onValueChange={(value: FilterTypeValue) =>
                      setFormData((prev) => ({ ...prev, filterType: value }))
                    }
                    disabled={!formData.isFilterable}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a filter type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">None</SelectItem>
                      <SelectItem value="RANGE">Range</SelectItem>
                      <SelectItem value="CHECKBOX">Checkbox</SelectItem>
                      <SelectItem value="SELECT">Select</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.dataType === "enum" && (
                  <>
                    <Separator />
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Allowed Options</Label>
                          <p className="text-xs text-muted-foreground">
                            Define the choices users can select.
                          </p>
                        </div>
                        <Button type="button" variant="secondary" size="sm" onClick={handleAddOption}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Option
                        </Button>
                      </div>

                      {formData.options.length === 0 ? (
                        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                          No options added yet.
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          {formData.options.map((option, index) => (
                            <div key={option.id ?? `new-${index}`} className="rounded-md border p-3">
                              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                                <div className="grid gap-2">
                                  <Label htmlFor={`option-label-${index}`}>Label</Label>
                                  <Input
                                    id={`option-label-${index}`}
                                    value={option.label}
                                    onChange={(event) =>
                                      handleOptionChange(index, "label", event.target.value)
                                    }
                                    placeholder="e.g. Zinc Plated"
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor={`option-value-${index}`}>Value</Label>
                                  <Input
                                    id={`option-value-${index}`}
                                    value={option.value}
                                    onChange={(event) =>
                                      handleOptionChange(index, "value", event.target.value)
                                    }
                                    placeholder="e.g. zinc-plated"
                                    className="font-mono text-sm"
                                  />
                                </div>
                                <div className="flex items-end">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => handleRemoveOption(index)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
          </div>

          <SheetFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCloseSheet}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {sheetMode === "create" ? "Create Attribute" : "Update Attribute"}
              </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={importDialogOpen} onOpenChange={(open) => {
        setImportDialogOpen(open)
        if (!open) {
          setImportFile(null)
          setValidateOnly(false)
          setImportJob(null)
          setIsPolling(false)
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Attributes</DialogTitle>
            <DialogDescription>
              Upload a CSV or ZIP file to bulk import attribute definitions. Use the template below for the correct format.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => downloadTemplateMutation.mutate()}
                disabled={downloadTemplateMutation.isPending}
              >
                {downloadTemplateMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Download Template
              </Button>
            </div>

            <div className="grid gap-2">
              <Label>Upload File</Label>
              <Input
                type="file"
                accept=".csv,.zip"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setImportFile(file)
                    // Auto-disable validateOnly for ZIP files
                    if (file.name.endsWith('.zip')) {
                      setValidateOnly(false)
                    }
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Upload a CSV or ZIP file containing attributes.csv and optionally attribute-options.csv
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="validate-only"
                checked={validateOnly}
                onCheckedChange={setValidateOnly}
                disabled={importFile?.name.endsWith('.zip')}
              />
              <Label htmlFor="validate-only">Validate only (don't import)</Label>
            </div>

            {importFile && !importJob && (
              <div className="rounded-md border p-3 text-sm">
                <div className="font-medium">{importFile.name}</div>
                <div className="text-muted-foreground">{(importFile.size / 1024).toFixed(2)} KB</div>
                {importFile.name.endsWith('.zip') && (
                  <div className="text-xs text-muted-foreground mt-1">
                    ZIP files will be processed asynchronously. Check job status for progress.
                  </div>
                )}
              </div>
            )}

            {importJob && (
              <div className="rounded-md border p-4 space-y-3">
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Import Status</span>
                  <Badge variant={getStatusVariant(importJob.status)}>{importJob.status}</Badge>
                </div>

                {/* Progress Bar */}
                {(importJob.status === "PROCESSING" || importJob.status === "COMPLETED") && importJob.totalRows !== null && (
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
                  <div className="text-sm space-y-1">
                    <div className="text-green-600">Success: {importJob.successRows}</div>
                    {importJob.failedRows > 0 && (
                      <div className="text-red-600">Failed: {importJob.failedRows}</div>
                    )}
                  </div>
                )}

                {/* Error Message */}
                {importJob.status === "FAILED" && (
                  <div className="text-sm text-red-600">Import failed. Please check your file format.</div>
                )}

                {/* Processing indicator */}
                {importJob.status === "PROCESSING" && (
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </div>
                )}
              </div>
            )}

            {importMutation.data?.errors && importMutation.data.errors.length > 0 && (
              <div className="rounded-md border border-destructive p-3">
                <div className="text-sm font-medium text-destructive">
                  {importMutation.data.errors.length} errors found
                </div>
                <div className="mt-2 max-h-48 overflow-y-auto text-xs">
                  {importMutation.data.errors.map((error, i) => (
                    <div key={i} className="text-destructive">
                      Row {error.rowNumber}: {error.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                console.log('[Dialog] Cancel clicked')
                setImportDialogOpen(false)
                setImportFile(null)
                setValidateOnly(false)
                setImportJob(null)
                setIsPolling(false)
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                console.log('[Dialog] Import button clicked, importFile:', importFile)
                if (importFile) {
                  console.log('[Dialog] Calling importMutation.mutate')
                  importMutation.mutate({ file: importFile, validateOnly })
                } else {
                  console.log('[Dialog] No file selected')
                }
              }}
              disabled={!importFile || importMutation.isPending || !!importJob}
            >
              {importMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {validateOnly ? "Validate" : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={unitsDialogOpen} onOpenChange={(open) => {
        setUnitsDialogOpen(open)
        if (!open) {
          setNewUnitName("")
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Units</DialogTitle>
            <DialogDescription>
              Add and manage units used for numeric attributes (e.g., mm, kg, cm).
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto grid gap-4 py-4">
            <div className="grid gap-3 rounded-md border p-4">
              <div className="text-sm font-medium">Add New Unit</div>
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="unit-name">Name</Label>
                  <Input
                    id="unit-name"
                    placeholder="e.g., mm, kg, cm"
                    value={newUnitName}
                    onChange={(e) => setNewUnitName(e.target.value)}
                  />
                </div>
              </div>
              <Button
                onClick={() => {
                  if (!newUnitName.trim()) {
                    toast.error("Unit name is required")
                    return
                  }
                  createUnitMutation.mutate({
                    name: newUnitName.trim(),
                  })
                }}
                disabled={!newUnitName.trim() || createUnitMutation.isPending}
                className="self-start"
              >
                {createUnitMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Plus className="mr-2 h-4 w-4" />
                Add Unit
              </Button>
            </div>

            <div className="grid gap-3">
              <div className="text-sm font-medium">
                Existing Units ({units.length})
              </div>
              {unitsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : units.length === 0 ? (
                <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No units defined yet. Add your first unit above.
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {units.map((unit) => (
                        <TableRow key={unit.id}>
                          <TableCell className="font-medium">{unit.name}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                confirm({
                                  title: "Delete unit?",
                                  description: `Delete "${unit.name}"? This may affect attributes using this unit.`,
                                  confirmLabel: "Delete",
                                  cancelLabel: "Cancel",
                                  variant: "destructive",
                                }).then((ok) => {
                                  if (ok) deleteUnitMutation.mutate(unit.id)
                                })
                              }}
                              disabled={deleteUnitMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUnitsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
