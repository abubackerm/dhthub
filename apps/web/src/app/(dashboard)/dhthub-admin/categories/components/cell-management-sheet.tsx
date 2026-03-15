"use client"

import { useState, useEffect } from "react"
import {
  ChevronRight,
  Grid3x3,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  PlusCircle,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

import {
  useCells,
  useCreateCell,
  useUpdateCell,
  useDeleteCell,
  useAssignAttributeToCell,
  useRemoveAttributeFromCell,
  type Cell,
  type CreateCellInput,
  type UpdateCellInput,
  type CategoryTreeNode,
} from "@/lib/api/catalog"
import { Loader2 } from "lucide-react"
import { useConfirmDialog } from "@/providers/confirm-dialog-provider"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Switch } from "@/components/ui/switch"

interface CellManagementSheetProps {
  open: boolean
  onClose: () => void
  category: CategoryTreeNode
}

interface CellFormData {
  name: string
  slug: string
  description: string
  sortOrder: number
  isActive: boolean
}

const initialCellFormData: CellFormData = {
  name: "",
  slug: "",
  description: "",
  sortOrder: 0,
  isActive: true,
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'cell'
}

function SortableCell({ cell, onEdit, onDelete }: { cell: Cell; onEdit: (cell: Cell) => void; onDelete: (cell: Cell) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cell.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-center gap-3 flex-1">
        <button
          {...attributes}
          {...listeners}
          className="cursor-move"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{cell.name}</span>
            <Badge variant={cell.isActive ? "default" : "secondary"}>
              {cell.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {cell.description || "No description"}
          </p>
          <div className="text-xs text-muted-foreground mt-1">
            Slug: {cell.slug}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(cell)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(cell)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function CellManagementSheet({ open, onClose, category }: CellManagementSheetProps) {
  const { data: cellsData, isLoading, refetch } = useCells({ categoryId: category.id })
  const createMutation = useCreateCell()
  const updateMutation = useUpdateCell()
  const deleteMutation = useDeleteCell()
  const assignAttributeMutation = useAssignAttributeToCell()
  const removeAttributeMutation = useRemoveAttributeFromCell()
  const { confirm } = useConfirmDialog()

  const [editingCell, setEditingCell] = useState<Cell | null>(null)
  const [cellFormData, setCellFormData] = useState<CellFormData>(initialCellFormData)
  const [isCreatingCell, setIsCreatingCell] = useState(false)
  const [showAttributeAssign, setShowAttributeAssign] = useState(false)
  const [selectedAttributeId, setSelectedAttributeId] = useState<string>("")

  const cells = cellsData || []

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    if (open) {
      setIsCreatingCell(false)
      setEditingCell(null)
      setCellFormData(initialCellFormData)
      setShowAttributeAssign(false)
      setSelectedAttributeId("")
    }
  }, [open])

  const handleOpenCreateCell = () => {
    setEditingCell(null)
    setCellFormData({
      ...initialCellFormData,
      sortOrder: cells.length,
    })
    setIsCreatingCell(true)
    setShowAttributeAssign(false)
  }

  const handleEditCell = (cell: Cell) => {
    setEditingCell(cell)
    setCellFormData({
      name: cell.name,
      slug: cell.slug,
      description: cell.description || "",
      sortOrder: cell.sortOrder,
      isActive: cell.isActive,
    })
    setIsCreatingCell(false)
    setShowAttributeAssign(false)
  }

  const handleDeleteCell = async (cell: Cell) => {
    const confirmed = await confirm({
      title: "Delete Cell",
      description: `Are you sure you want to delete "${cell.name}"? This action cannot be undone.`,
      variant: "destructive",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
    })

    if (confirmed) {
      deleteMutation.mutate(cell.id)
    }
  }

  const handleSaveCell = () => {
    if (!cellFormData.name.trim()) {
      toast.error("Cell name is required")
      return
    }

    const data: CreateCellInput | UpdateCellInput = {
      name: cellFormData.name,
      slug: cellFormData.slug || generateSlug(cellFormData.name),
      description: cellFormData.description || undefined,
      sortOrder: cellFormData.sortOrder,
      isActive: cellFormData.isActive,
      categoryId: category.id,
    }

    if (editingCell) {
      updateMutation.mutate({
        id: editingCell.id,
        data,
      })
    } else {
      createMutation.mutate(data as CreateCellInput)
    }

    setIsCreatingCell(false)
    setEditingCell(null)
    setCellFormData(initialCellFormData)
  }

  const handleAssignAttribute = (cellId: string) => {
    if (!selectedAttributeId) {
      toast.error("Please select an attribute to assign")
      return
    }

    assignAttributeMutation.mutate({
      cellId,
      data: {
        attributeId: selectedAttributeId,
      },
    })

    setShowAttributeAssign(false)
    setSelectedAttributeId("")
  }

  const handleRemoveAttribute = (cellId: string, attributeId: string) => {
    removeAttributeMutation.mutate({
      cellId,
      attributeId,
    })
  }

  const handleNameChange = (name: string) => {
    setCellFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug === "" || prev.slug === generateSlug(prev.name)
        ? generateSlug(name)
        : prev.slug,
    }))
  }

  const handleDragEnd = (event: any) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = cells.findIndex((cell) => cell.id === active.id)
      const newIndex = cells.findIndex((cell) => cell.id === over.id)

      if (oldIndex !== newIndex) {
        const items = Array.from(cells)
        const [reorderedItem] = items.splice(oldIndex, 1)
        items.splice(newIndex, 0, reorderedItem)

        // Update sort orders
        items.forEach((cell, index) => {
          updateMutation.mutate({
            id: cell.id,
            data: { sortOrder: index },
          })
        })
      }
    }
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[800px] sm:max-w-[800px]">
        <SheetHeader>
          <SheetTitle>Manage Cells</SheetTitle>
          <SheetDescription>
            Manage cells for category: <strong>{category.name}</strong>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Cell List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-lg">Cells</CardTitle>
                <CardDescription>
                  {cells.length} cell{cells.length !== 1 ? 's' : ''} in this category
                </CardDescription>
              </div>
              <Button onClick={handleOpenCreateCell} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Cell
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : cells.length === 0 ? (
                <div className="text-center py-8">
                  <Grid3x3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground mb-4">
                    No cells created yet. Add your first cell to get started.
                  </p>
                  <Button onClick={handleOpenCreateCell} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Cell
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={cells.map(c => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {cells.map((cell) => (
                          <SortableCell 
                            key={cell.id} 
                            cell={cell}
                            onEdit={handleEditCell}
                            onDelete={handleDeleteCell}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Create/Edit Cell Form */}
          {(isCreatingCell || editingCell) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {editingCell ? "Edit Cell" : "Create New Cell"}
                </CardTitle>
                <CardDescription>
                  {editingCell ? "Update cell details" : "Add a new cell to this category"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cell-name">Cell Name *</Label>
                  <Input
                    id="cell-name"
                    value={cellFormData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g., Standard Hardware"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cell-slug">Slug</Label>
                  <Input
                    id="cell-slug"
                    value={cellFormData.slug}
                    onChange={(e) => setCellFormData({ ...cellFormData, slug: e.target.value })}
                    placeholder="e.g., standard-hardware"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cell-description">Description</Label>
                  <Textarea
                    id="cell-description"
                    value={cellFormData.description}
                    onChange={(e) => setCellFormData({ ...cellFormData, description: e.target.value })}
                    placeholder="Describe this cell..."
                    rows={3}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="cell-active">Active Status</Label>
                  <Switch
                    id="cell-active"
                    checked={cellFormData.isActive}
                    onCheckedChange={(checked) => setCellFormData({ ...cellFormData, isActive: checked })}
                  />
                </div>
                <SheetFooter className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreatingCell(false)
                      setEditingCell(null)
                      setCellFormData(initialCellFormData)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveCell} disabled={createMutation.isPending || updateMutation.isPending}>
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {editingCell ? "Update Cell" : "Create Cell"}
                  </Button>
                </SheetFooter>
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
