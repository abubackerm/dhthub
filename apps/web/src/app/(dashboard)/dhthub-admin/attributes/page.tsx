"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, Eye, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  assignAttributeToCategory,
  createAttribute,
  createAttributeOption,
  deleteAttributeOption,
  getCategoryAttributes,
  removeAttributeFromCategory,
  updateAttribute,
  updateAttributeOption,
  useCategoryTree,
  type AttributeDataType,
  type AttributeFilterType,
  type CategoryAttributeView,
  type CategoryTreeNode,
} from "@/lib/api/catalog"
import { useConfirmDialog } from "@/providers/confirm-dialog-provider"

type SheetMode = "create" | "edit" | "view"
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
  isRequired: boolean
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
  isRequired: false,
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

function flattenLeafCategories(categories: CategoryTreeNode[]) {
  const result: Array<{
    id: string
    name: string
    path: string
    productCount: number
  }> = []

  const walk = (items: CategoryTreeNode[], parentPath = "") => {
    for (const item of items) {
      const path = parentPath ? `${parentPath} > ${item.name}` : item.name

      if (item.children.length === 0) {
        result.push({
          id: item.id,
          name: item.name,
          path,
          productCount: item.productCount,
        })
        continue
      }

      walk(item.children, path)
    }
  }

  walk(categories)
  return result
}

function formDataFromAttribute(record: CategoryAttributeView): AttributeFormData {
  return {
    name: record.attribute.name,
    slug: record.attribute.slug,
    dataType: record.attribute.dataType,
    group: record.attribute.group ?? "",
    sortOrder: record.attribute.sortOrder,
    filterType: record.attribute.filterType ?? "NONE",
    isFilterable: record.attribute.isFilterable,
    isRequired: record.attribute.isRequired,
    options: record.options.map((option) => ({
      id: option.id,
      label: option.label,
      value: option.value,
    })),
  }
}

function AttributeDetails({
  record,
}: {
  record: CategoryAttributeView
}) {
  return (
    <div className="rounded-md border p-4">
      <div className="grid gap-4 text-sm">
        <div className="grid gap-1">
          <span className="text-muted-foreground">Slug</span>
          <span className="font-mono">{record.attribute.slug}</span>
        </div>
        <div className="grid gap-1">
          <span className="text-muted-foreground">Type</span>
          <span>{getDataTypeLabel(record.attribute.dataType)}</span>
        </div>
        <div className="grid gap-1">
          <span className="text-muted-foreground">Group</span>
          <span>{record.attribute.group || "-"}</span>
        </div>
        <div className="grid gap-1">
          <span className="text-muted-foreground">Filter</span>
          <span>{getFilterLabel(record.attribute.filterType)}</span>
        </div>
        <div className="grid gap-1">
          <span className="text-muted-foreground">Required</span>
          <span>{record.attribute.isRequired ? "Yes" : "No"}</span>
        </div>
      </div>

      {record.options.length > 0 && (
        <>
          <Separator className="my-4" />
          <div className="grid gap-3">
            <div className="text-sm font-medium">Options</div>
            <div className="grid gap-2">
              {record.options.map((option) => (
                <div
                  key={option.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span>{option.label}</span>
                  <span className="font-mono text-muted-foreground">{option.value}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function AttributesPage() {
  const queryClient = useQueryClient()
  const { confirm } = useConfirmDialog()
  const {
    data: categoryTree = [],
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useCategoryTree()

  const leafCategories = useMemo(
    () => flattenLeafCategories(categoryTree),
    [categoryTree],
  )

  const [selectedCategoryId, setSelectedCategoryId] = useState("")
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetMode, setSheetMode] = useState<SheetMode>("create")
  const [activeAttribute, setActiveAttribute] = useState<CategoryAttributeView | null>(null)
  const [formData, setFormData] = useState<AttributeFormData>(initialFormData)

  useEffect(() => {
    if (!selectedCategoryId && leafCategories.length > 0) {
      setSelectedCategoryId(leafCategories[0].id)
    }
  }, [leafCategories, selectedCategoryId])

  const selectedCategory = useMemo(
    () => leafCategories.find((category) => category.id === selectedCategoryId) ?? null,
    [leafCategories, selectedCategoryId],
  )

  const {
    data: categoryAttributes = [],
    isLoading: attributesLoading,
    error: attributesError,
  } = useQuery({
    queryKey: ["category-attributes", selectedCategoryId],
    queryFn: () => getCategoryAttributes(selectedCategoryId),
    enabled: Boolean(selectedCategoryId),
  })

  const createMutation = useMutation({
    mutationFn: async (payload: { categoryId: string; formData: AttributeFormData }) => {
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
        isRequired: payload.formData.isRequired,
      })

      await assignAttributeToCategory(payload.categoryId, {
        attributeId: attribute.id,
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
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["category-attributes", variables.categoryId],
      })
      toast.success("Attribute created successfully")
      handleCloseSheet()
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to create attribute"))
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      categoryId: string
      record: CategoryAttributeView
      formData: AttributeFormData
    }) => {
      await updateAttribute(payload.record.attribute.id, {
        name: payload.formData.name.trim(),
        dataType: payload.formData.dataType,
        group: payload.formData.group.trim() || undefined,
        sortOrder: payload.formData.sortOrder,
        filterType:
          payload.formData.isFilterable && payload.formData.filterType !== "NONE"
            ? payload.formData.filterType
            : undefined,
        isFilterable: payload.formData.isFilterable,
        isRequired: payload.formData.isRequired,
      })

      const existingOptionIds = new Set(payload.record.options.map((option) => option.id))
      const nextOptionIds = new Set(
        payload.formData.options
          .map((option) => option.id)
          .filter((optionId): optionId is string => Boolean(optionId)),
      )

      for (const option of payload.record.options) {
        if (!nextOptionIds.has(option.id)) {
          await deleteAttributeOption(payload.record.attribute.id, option.id)
        }
      }

      if (payload.formData.dataType === "enum") {
        for (const [index, option] of payload.formData.options.entries()) {
          const optionPayload = {
            label: option.label.trim(),
            value: option.value.trim(),
            sortOrder: index + 1,
          }

          if (option.id && existingOptionIds.has(option.id)) {
            await updateAttributeOption(
              payload.record.attribute.id,
              option.id,
              optionPayload,
            )
          } else {
            await createAttributeOption(payload.record.attribute.id, optionPayload)
          }
        }
      }
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["category-attributes", variables.categoryId],
      })
      toast.success("Attribute updated successfully")
      handleCloseSheet()
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to update attribute"))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (payload: { categoryId: string; assignmentId: string }) =>
      removeAttributeFromCategory(payload.categoryId, payload.assignmentId),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["category-attributes", variables.categoryId],
      })
      toast.success("Attribute removed from category")
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to delete attribute"))
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
      sortOrder: categoryAttributes.length + 1,
    })
    setSheetOpen(true)
  }

  function openEditSheet(record: CategoryAttributeView) {
    setSheetMode("edit")
    setActiveAttribute(record)
    setFormData(formDataFromAttribute(record))
    setSheetOpen(true)
  }

  function openViewSheet(record: CategoryAttributeView) {
    setSheetMode("view")
    setActiveAttribute(record)
    setFormData(formDataFromAttribute(record))
    setSheetOpen(true)
  }

  async function handleDelete(record: CategoryAttributeView) {
    if (!selectedCategoryId) {
      return
    }

    const confirmed = await confirm({
      title: "Delete attribute?",
      description: `Remove "${record.attribute.name}" from this category schema?`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "destructive",
    })

    if (!confirmed) {
      return
    }

    deleteMutation.mutate({
      categoryId: selectedCategoryId,
      assignmentId: record.assignmentId,
    })
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

    if (!selectedCategoryId) {
      toast.error("Select a category first")
      return
    }

    if (sheetMode === "create") {
      createMutation.mutate({
        categoryId: selectedCategoryId,
        formData,
      })
      return
    }

    if (sheetMode === "edit" && activeAttribute) {
      updateMutation.mutate({
        categoryId: selectedCategoryId,
        record: activeAttribute,
        formData,
      })
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending
  const isReadOnly = sheetMode === "view"

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Attributes</h1>
          <p className="text-muted-foreground">
            Manage the live attribute schema for each leaf category.
          </p>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Leaf Categories</CardTitle>
            <CardDescription>Select a category to manage its attributes.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[560px]">
              {categoriesLoading ? (
                <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading categories...
                </div>
              ) : categoriesError ? (
                <div className="p-4 text-sm text-destructive">
                  {getErrorMessage(categoriesError, "Failed to load categories")}
                </div>
              ) : (
                <div className="divide-y">
                  {leafCategories.map((category) => {
                    const isSelected = category.id === selectedCategoryId

                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategoryId(category.id)}
                        className={`w-full p-4 text-left transition-colors ${
                          isSelected
                            ? "border-l-2 border-l-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="font-medium">{category.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{category.path}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {category.productCount} products
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-lg">
                {selectedCategory?.name ?? "Select a category"}
              </CardTitle>
              <CardDescription>{selectedCategory?.path ?? "No category selected"}</CardDescription>
            </div>
            <Button onClick={openCreateSheet} disabled={!selectedCategory}>
              <Plus className="mr-2 h-4 w-4" />
              Add Attribute
            </Button>
          </CardHeader>
          <CardContent>
            {attributesLoading ? (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading attributes...
              </div>
            ) : attributesError ? (
              <div className="py-4 text-sm text-destructive">
                {getErrorMessage(attributesError, "Failed to load attributes")}
              </div>
            ) : categoryAttributes.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <p>No attributes found for this category.</p>
                <p className="mt-1 text-sm">Create the first attribute to start defining its schema.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Filter</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Options</TableHead>
                    <TableHead className="w-[140px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryAttributes.map((record) => (
                    <TableRow key={record.assignmentId}>
                      <TableCell className="font-medium">{record.attribute.name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {record.attribute.slug}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {getDataTypeLabel(record.attribute.dataType)}
                        </Badge>
                      </TableCell>
                      <TableCell>{getFilterLabel(record.attribute.filterType)}</TableCell>
                      <TableCell>
                        {record.attribute.isRequired ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </TableCell>
                      <TableCell>{record.options.length}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openViewSheet(record)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditSheet(record)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(record)}
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
              {selectedCategory
                ? `Category: ${selectedCategory.path}`
                : "Select a category to manage attributes."}
            </SheetDescription>
          </SheetHeader>

          <div className="grid gap-4 py-6">
            {sheetMode === "view" && activeAttribute ? (
              <AttributeDetails record={activeAttribute} />
            ) : (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="attribute-name">
                    Attribute Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="attribute-name"
                    value={formData.name}
                    onChange={(event) => handleNameChange(event.target.value)}
                    placeholder="e.g. Thread Size"
                    disabled={isReadOnly}
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
                    disabled
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Data Type</Label>
                  <Select
                    value={formData.dataType}
                    onValueChange={(value: AttributeDataType) => handleDataTypeChange(value)}
                    disabled={isReadOnly}
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
                    disabled={isReadOnly}
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
                    disabled={isReadOnly}
                  />
                </div>

                <div className="flex items-center justify-between rounded-md border px-3 py-3">
                  <div className="grid gap-1">
                    <Label htmlFor="attribute-required">Required</Label>
                    <p className="text-xs text-muted-foreground">
                      Mark this attribute as mandatory for products.
                    </p>
                  </div>
                  <Switch
                    id="attribute-required"
                    checked={formData.isRequired}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isRequired: checked }))
                    }
                    disabled={isReadOnly}
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
                    disabled={isReadOnly || formData.dataType === "text"}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Filter Type</Label>
                  <Select
                    value={formData.filterType}
                    onValueChange={(value: FilterTypeValue) =>
                      setFormData((prev) => ({ ...prev, filterType: value }))
                    }
                    disabled={isReadOnly || !formData.isFilterable}
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
                                    disabled={isReadOnly}
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
                                    disabled={isReadOnly}
                                  />
                                </div>
                                <div className="flex items-end">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => handleRemoveOption(index)}
                                    disabled={isReadOnly}
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
              </>
            )}
          </div>

          <SheetFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCloseSheet}>
              {sheetMode === "view" ? "Close" : "Cancel"}
            </Button>
            {!isReadOnly && (
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {sheetMode === "create" ? "Create Attribute" : "Update Attribute"}
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
