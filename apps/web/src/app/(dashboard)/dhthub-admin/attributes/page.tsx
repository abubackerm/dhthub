"use client"

import { useState, useMemo } from "react"
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  Check,
  Minus,
} from "lucide-react"
import { toast } from "sonner"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"

import {
  mockCategories,
  mockAttributes,
  getLeafCategories,
  type Category,
  type Attribute,
} from "@/lib/mock-data"

type DataType = "NUMBER" | "SELECT" | "MULTI_SELECT" | "BOOLEAN" | "TEXT"
type FilterType = "RANGE" | "CHECKBOX_LIST" | "TOGGLE" | "NOT_FILTERABLE"

interface AttributeFormData {
  name: string
  slug: string
  helpText: string
  dataType: DataType
  unit: string
  filterType: FilterType
  isRequired: boolean
  isVisibleInTable: boolean
  showInSpecSheet: boolean
  allowedValues: string[]
}

const initialFormData: AttributeFormData = {
  name: "",
  slug: "",
  helpText: "",
  dataType: "TEXT",
  unit: "",
  filterType: "NOT_FILTERABLE",
  isRequired: false,
  isVisibleInTable: true,
  showInSpecSheet: true,
  allowedValues: [],
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "")
}

function getCategoryPath(category: Category, categories: Category[]): string {
  const parts: string[] = [category.name]
  let current = category

  while (current.parentId) {
    const parent = findCategoryById(categories, current.parentId)
    if (parent) {
      parts.unshift(parent.name)
      current = parent
    } else {
      break
    }
  }

  return parts.join(" > ")
}

function findCategoryById(categories: Category[], id: string): Category | undefined {
  for (const cat of categories) {
    if (cat.id === id) return cat
    const found = findCategoryById(cat.children, id)
    if (found) return found
  }
  return undefined
}

function DataTypeBadge({ type }: { type: DataType }) {
  const colors: Record<DataType, string> = {
    NUMBER: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    SELECT: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    MULTI_SELECT: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
    BOOLEAN: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    TEXT: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  }

  return (
    <Badge variant="secondary" className={colors[type]}>
      {type}
    </Badge>
  )
}

interface SortableAttributeRowProps {
  attribute: Attribute
  onEdit: (attr: Attribute) => void
  onDelete: (attr: Attribute) => void
  onToggleVisibility: (attr: Attribute) => void
}

function SortableAttributeRow({
  attribute,
  onEdit,
  onDelete,
  onToggleVisibility,
}: SortableAttributeRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: attribute.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-10">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </TableCell>
      <TableCell className="w-12 text-center text-muted-foreground">
        {attribute.sortOrder}
      </TableCell>
      <TableCell className="font-medium">{attribute.name}</TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">
        {attribute.slug}
      </TableCell>
      <TableCell>
        <DataTypeBadge type={attribute.dataType} />
      </TableCell>
      <TableCell className="text-muted-foreground">
        {attribute.unit || "-"}
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {attribute.filterType.replace("_", " ")}
      </TableCell>
      <TableCell className="w-16 text-center">
        {attribute.isRequired ? (
          <Check className="h-4 w-4 text-green-500 mx-auto" />
        ) : (
          <Minus className="h-4 w-4 text-muted-foreground mx-auto" />
        )}
      </TableCell>
      <TableCell className="w-16 text-center">
        <button
          onClick={() => onToggleVisibility(attribute)}
          className="hover:bg-muted p-1 rounded transition-colors"
        >
          {attribute.isVisibleInTable ? (
            <Eye className="h-4 w-4 text-green-500" />
          ) : (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </TableCell>
      <TableCell className="w-24">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(attribute)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(attribute)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

export default function AttributesPage() {
  const leafCategories = useMemo(() => getLeafCategories(mockCategories), [])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    leafCategories[0]?.id || ""
  )

  const [attributes, setAttributes] = useState<Attribute[]>(mockAttributes)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingAttribute, setEditingAttribute] = useState<Attribute | null>(null)
  const [formData, setFormData] = useState<AttributeFormData>(initialFormData)
  const [newAllowedValue, setNewAllowedValue] = useState("")

  const selectedCategory = useMemo(() => {
    return findCategoryById(mockCategories, selectedCategoryId)
  }, [selectedCategoryId])

  const selectedCategoryPath = useMemo(() => {
    if (!selectedCategory) return ""
    return getCategoryPath(selectedCategory, mockCategories)
  }, [selectedCategory])

  const categoryAttributes = useMemo(() => {
    return attributes
      .filter((attr) => attr.categoryId === selectedCategoryId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [attributes, selectedCategoryId])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = categoryAttributes.findIndex((attr) => attr.id === active.id)
      const newIndex = categoryAttributes.findIndex((attr) => attr.id === over.id)

      const reordered = arrayMove(categoryAttributes, oldIndex, newIndex).map(
        (attr, index) => ({
          ...attr,
          sortOrder: index + 1,
        })
      )

      setAttributes((prev) => {
        const other = prev.filter((attr) => attr.categoryId !== selectedCategoryId)
        return [...other, ...reordered]
      })

      toast.success("Attribute order updated")
    }
  }

  const handleOpenSheet = () => {
    setEditingAttribute(null)
    setFormData(initialFormData)
    setNewAllowedValue("")
    setSheetOpen(true)
  }

  const handleEditAttribute = (attr: Attribute) => {
    setEditingAttribute(attr)
    setFormData({
      name: attr.name,
      slug: attr.slug,
      helpText: attr.helpText || "",
      dataType: attr.dataType,
      unit: attr.unit || "",
      filterType: attr.filterType,
      isRequired: attr.isRequired,
      isVisibleInTable: attr.isVisibleInTable,
      showInSpecSheet: attr.showInSpecSheet ?? true,
      allowedValues: attr.allowedValues,
    })
    setNewAllowedValue("")
    setSheetOpen(true)
  }

  const handleDeleteAttribute = (attr: Attribute) => {
    setAttributes((prev) => prev.filter((a) => a.id !== attr.id))
    toast.success(`Attribute "${attr.name}" deleted`)
  }

  const handleToggleVisibility = (attr: Attribute) => {
    setAttributes((prev) =>
      prev.map((a) =>
        a.id === attr.id ? { ...a, isVisibleInTable: !a.isVisibleInTable } : a
      )
    )
    toast.success(
      `Attribute "${attr.name}" ${attr.isVisibleInTable ? "hidden from" : "shown in"} table`
    )
  }

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug === "" || prev.slug === generateSlug(prev.name)
        ? generateSlug(name)
        : prev.slug,
    }))
  }

  const handleAddAllowedValue = () => {
    if (newAllowedValue.trim()) {
      setFormData((prev) => ({
        ...prev,
        allowedValues: [...prev.allowedValues, newAllowedValue.trim()],
      }))
      setNewAllowedValue("")
    }
  }

  const handleRemoveAllowedValue = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      allowedValues: prev.allowedValues.filter((_, i) => i !== index),
    }))
  }

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error("Attribute name is required")
      return
    }

    if (editingAttribute) {
      setAttributes((prev) =>
        prev.map((a) =>
          a.id === editingAttribute.id
            ? {
                ...a,
                name: formData.name,
                slug: formData.slug,
                dataType: formData.dataType,
                filterType: formData.filterType,
                unit: formData.unit || null,
                isRequired: formData.isRequired,
                isVisibleInTable: formData.isVisibleInTable,
                showInSpecSheet: formData.showInSpecSheet,
                allowedValues: formData.allowedValues,
                helpText: formData.helpText,
              }
            : a
        )
      )
      toast.success(`Attribute "${formData.name}" updated`)
    } else {
      const newAttr: Attribute = {
        id: `a${Date.now()}`,
        categoryId: selectedCategoryId,
        name: formData.name,
        slug: formData.slug,
        dataType: formData.dataType,
        filterType: formData.filterType,
        unit: formData.unit || null,
        isRequired: formData.isRequired,
        isFilterable: formData.filterType !== "NOT_FILTERABLE",
        isVisibleInTable: formData.isVisibleInTable,
        showInSpecSheet: formData.showInSpecSheet,
        sortOrder: categoryAttributes.length + 1,
        allowedValues: formData.allowedValues,
        helpText: formData.helpText,
      }
      setAttributes((prev) => [...prev, newAttr])
      toast.success(`Attribute "${formData.name}" created`)
    }

    setSheetOpen(false)
    setFormData(initialFormData)
    setEditingAttribute(null)
  }

  const handleCancel = () => {
    setSheetOpen(false)
    setFormData(initialFormData)
    setEditingAttribute(null)
  }

  const getDefaultFilterType = (dataType: DataType): FilterType => {
    switch (dataType) {
      case "NUMBER":
        return "RANGE"
      case "SELECT":
        return "CHECKBOX_LIST"
      case "MULTI_SELECT":
        return "CHECKBOX_LIST"
      case "BOOLEAN":
        return "TOGGLE"
      default:
        return "NOT_FILTERABLE"
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Attributes</h1>
          <p className="text-muted-foreground">
            Manage attribute schemas for each leaf category.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Left Column - Leaf Categories */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Leaf Categories</CardTitle>
            <CardDescription>
              Select a category to manage its attributes
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <div className="divide-y">
                {leafCategories.map((category) => {
                  const path = getCategoryPath(category, mockCategories)
                  const isSelected = category.id === selectedCategoryId

                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategoryId(category.id)}
                      className={`w-full text-left p-4 transition-colors ${
                        isSelected
                          ? "bg-primary/5 border-l-2 border-l-primary"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="font-medium">{category.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {path}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {category.productCount} products
                      </div>
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right Column - Attribute Schema */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-lg">
                {selectedCategory?.name || "Select a Category"}
              </CardTitle>
              <CardDescription>{selectedCategoryPath}</CardDescription>
            </div>
            <Button onClick={handleOpenSheet} disabled={!selectedCategory}>
              <Plus className="h-4 w-4 mr-2" />
              Add Attribute
            </Button>
          </CardHeader>
          <CardContent>
            {categoryAttributes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No attributes yet.</p>
                <p className="text-sm mt-1">
                  Add your first attribute to define what columns products in this
                  category will have.
                </p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead className="w-12">Order</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Filter</TableHead>
                      <TableHead className="w-16 text-center">Req</TableHead>
                      <TableHead className="w-16 text-center">In Table</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SortableContext
                      items={categoryAttributes.map((a) => a.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {categoryAttributes.map((attr) => (
                        <SortableAttributeRow
                          key={attr.id}
                          attribute={attr}
                          onEdit={handleEditAttribute}
                          onDelete={handleDeleteAttribute}
                          onToggleVisibility={handleToggleVisibility}
                        />
                      ))}
                    </SortableContext>
                  </TableBody>
                </Table>
              </DndContext>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Attribute Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingAttribute ? "Edit Attribute" : "Add Attribute"}
            </SheetTitle>
            <SheetDescription>
              Define the attribute properties for products in this category.
            </SheetDescription>
          </SheetHeader>

          <div className="grid gap-4 py-6">
            <div className="grid gap-2">
              <Label htmlFor="name">
                Attribute Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Thread Size"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, slug: e.target.value }))
                }
                placeholder="e.g., thread_size"
                className="font-mono text-sm bg-muted/50"
                readOnly
              />
              <p className="text-xs text-muted-foreground">
                Auto-generated from name
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="helpText">Help Text</Label>
              <Textarea
                id="helpText"
                value={formData.helpText}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, helpText: e.target.value }))
                }
                placeholder="Enter help text shown to data entry users"
                rows={2}
              />
            </div>

            <div className="grid gap-2">
              <Label>Data Type</Label>
              <Select
                value={formData.dataType}
                onValueChange={(value: DataType) =>
                  setFormData((prev) => ({
                    ...prev,
                    dataType: value,
                    filterType: getDefaultFilterType(value),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select data type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NUMBER">Number</SelectItem>
                  <SelectItem value="SELECT">Select</SelectItem>
                  <SelectItem value="MULTI_SELECT">Multi-Select</SelectItem>
                  <SelectItem value="BOOLEAN">Boolean</SelectItem>
                  <SelectItem value="TEXT">Text</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.dataType === "NUMBER" && (
              <div className="grid gap-2">
                <Label htmlFor="unit">Unit (e.g., in, mm, PSI)</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, unit: e.target.value }))
                  }
                  placeholder="e.g., in"
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label>Filter Display</Label>
              <Select
                value={formData.filterType}
                onValueChange={(value: FilterType) =>
                  setFormData((prev) => ({ ...prev, filterType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select filter type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RANGE">Range Slider</SelectItem>
                  <SelectItem value="CHECKBOX_LIST">Checkbox List</SelectItem>
                  <SelectItem value="TOGGLE">Toggle</SelectItem>
                  <SelectItem value="NOT_FILTERABLE">Not Filterable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="required">Required</Label>
              <Switch
                id="required"
                checked={formData.isRequired}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isRequired: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="inTable">Show in Product Table</Label>
              <Switch
                id="inTable"
                checked={formData.isVisibleInTable}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isVisibleInTable: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="inSpec">Show in Product Spec Sheet</Label>
              <Switch
                id="inSpec"
                checked={formData.showInSpecSheet}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, showInSpecSheet: checked }))
                }
              />
            </div>

            {(formData.dataType === "SELECT" ||
              formData.dataType === "MULTI_SELECT") && (
              <>
                <Separator />
                <div className="grid gap-2">
                  <Label>Allowed Values</Label>
                  <p className="text-xs text-muted-foreground">
                    Define the exact values data entry people can choose from
                  </p>

                  <div className="space-y-2">
                    {formData.allowedValues.map((value, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 bg-muted rounded-md"
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        <span className="flex-1 text-sm">{value}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleRemoveAllowedValue(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      value={newAllowedValue}
                      onChange={(e) => setNewAllowedValue(e.target.value)}
                      placeholder="Add new value"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleAddAllowedValue()
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleAddAllowedValue}
                    >
                      Add Value
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

          <SheetFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingAttribute ? "Update Attribute" : "Save Attribute"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
