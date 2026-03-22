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
  Image as ImageIcon,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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
  type AssignAttributeToCellInput,
  type CellsQueryParams,
  type AttributeView,
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
  sku: string
  description: string
  sortOrder: number
  isActive: boolean
  imageUrl?: string
}

const initialCellFormData: CellFormData = {
  name: "",
  slug: "",
  sku: "",
  description: "",
  sortOrder: 0,
  isActive: true,
  imageUrl: undefined,
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

function generateSku(): string {
  const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase()
  return `C-${randomPart}`
}

function SortableCell({ cell, onEdit, onDelete }: { cell: Cell; onEdit: (cell: Cell) => void; onDelete: (cell: Cell) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cell.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Get primary image URL from images array (map storagePath to url)
  const imageUrl = cell.images?.find((img) => img.isPrimary)?.storagePath || cell.imageUrl

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
        <div className="flex items-center gap-3 flex-1">
          {imageUrl ? (
            <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border flex-shrink-0 bg-muted">
              <img
                src={imageUrl}
                alt={cell.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-lg border-2 border-dashed border-border bg-muted flex flex-col items-center justify-center flex-shrink-0">
              <ImageIcon className="h-5 w-5 text-muted-foreground mb-1" />
              <span className="text-[10px] text-muted-foreground">No image</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">{cell.name}</span>
              <Badge variant={cell.isActive ? "default" : "secondary"}>
                {cell.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {cell.description || "No description"}
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              <span>Slug: {cell.slug}</span>
              {cell.sku && <span>SKU: {cell.sku}</span>}
            </div>
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
  const [showAttributeAssign, setShowAttributeAssign] = useState(false)
  const [selectedAttributeId, setSelectedAttributeId] = useState<string>("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")

  const cells = cellsData || []

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    if (open) {
      setShowCreateDialog(false)
      setShowEditDialog(false)
      setEditingCell(null)
      setCellFormData(initialCellFormData)
      setShowAttributeAssign(false)
      setSelectedAttributeId("")
      setImageFile(null)
      setImagePreview("")
    }
  }, [open])

  const handleOpenCreateCell = () => {
    setEditingCell(null)
    setCellFormData({
      ...initialCellFormData,
      sortOrder: cells.length,
      sku: generateSku(),
    })
    setShowCreateDialog(true)
    setShowAttributeAssign(false)
  }

  const handleEditCell = (cell: Cell) => {
    setEditingCell(cell)
    setCellFormData({
      name: cell.name,
      slug: cell.slug,
      sku: cell.sku || "",
      description: cell.description || "",
      sortOrder: cell.sortOrder,
      isActive: cell.isActive,
      // Get primary image from images array, fall back to imageUrl
      imageUrl: cell.images?.find((img) => img.isPrimary)?.storagePath || cell.imageUrl || undefined,
    })
    setShowEditDialog(true)
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

  const handleSaveCell = async () => {
    if (!cellFormData.name.trim()) {
      toast.error("Cell name is required")
      return
    }

    let imageUrl = cellFormData.imageUrl

    if (imageFile) {
      try {
        const formData = new FormData()
        formData.append('file', imageFile)

        const uploadResponse = await fetch('/api/v1/storage/upload', {
          method: 'POST',
          body: formData,
        })

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image')
        }

        const uploadResult = await uploadResponse.json()
        imageUrl = uploadResult.url

        toast.success('Image uploaded successfully')
      } catch (error) {
        toast.error('Failed to upload image')
        console.error(error)
        return
      }
    }

    const data: CreateCellInput | UpdateCellInput = {
      name: cellFormData.name,
      slug: cellFormData.slug || generateSlug(cellFormData.name),
      sku: cellFormData.sku,
      description: cellFormData.description || undefined,
      sortOrder: cellFormData.sortOrder,
      isActive: cellFormData.isActive,
      imageUrl,
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

    setShowCreateDialog(false)
    setShowEditDialog(false)
    setEditingCell(null)
    setCellFormData(initialCellFormData)
    setImageFile(null)
    setImagePreview("")
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error("Image size must be less than 5MB")
      return
    }

    if (!file.type.startsWith("image/")) {
      toast.error("File must be an image")
      return
    }

    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview("")
    setCellFormData((prev) => ({ ...prev, imageUrl: undefined }))
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
      <SheetContent className="w-[800px] sm:max-w-[800px] flex flex-col overflow-hidden h-full">
        <SheetHeader className="shrink-0">
          <SheetTitle>Manage Cells</SheetTitle>
          <SheetDescription>
            Manage cells for category: <strong>{category.name}</strong>
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 h-full min-h-0">
          <div className="space-y-6 pb-6">
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
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </SheetContent>

      {/* Create Cell Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>Create New Cell</DialogTitle>
            <DialogDescription>
              Add a new cell to this category
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
            <div className="space-y-4 py-4 pr-4">
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
                <Label htmlFor="cell-sku">SKU</Label>
                <Input
                  id="cell-sku"
                  value={cellFormData.sku}
                  onChange={(e) => setCellFormData({ ...cellFormData, sku: e.target.value.toUpperCase() })}
                  placeholder="e.g., C-A1B2C3"
                  className="font-mono"
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
              <div className="space-y-2">
                <Label htmlFor="cell-image">Cell Image</Label>
                <div className="flex items-start gap-4">
                  {(imagePreview || cellFormData.imageUrl) ? (
                    <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-border bg-muted flex-shrink-0">
                      <img
                        src={imagePreview || cellFormData.imageUrl}
                        alt="Cell image preview"
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={handleRemoveImage}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-lg border-2 border-dashed border-border bg-muted flex flex-col items-center justify-center flex-shrink-0">
                      <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-xs text-muted-foreground">No image</span>
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <Input
                      id="cell-image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                      Accepts JPG, PNG, GIF, WEBP. Max size: 5MB.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false)
                setCellFormData(initialCellFormData)
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveCell} disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create Cell
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Cell Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>Edit Cell</DialogTitle>
            <DialogDescription>
              Update cell details
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
            <div className="space-y-4 py-4 pr-4">
              <div className="space-y-2">
                <Label htmlFor="edit-cell-name">Cell Name *</Label>
                <Input
                  id="edit-cell-name"
                  value={cellFormData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Standard Hardware"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cell-slug">Slug</Label>
                <Input
                  id="edit-cell-slug"
                  value={cellFormData.slug}
                  onChange={(e) => setCellFormData({ ...cellFormData, slug: e.target.value })}
                  placeholder="e.g., standard-hardware"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cell-sku">SKU</Label>
                <Input
                  id="edit-cell-sku"
                  value={cellFormData.sku}
                  onChange={(e) => setCellFormData({ ...cellFormData, sku: e.target.value.toUpperCase() })}
                  placeholder="e.g., C-A1B2C3"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cell-description">Description</Label>
                <Textarea
                  id="edit-cell-description"
                  value={cellFormData.description}
                  onChange={(e) => setCellFormData({ ...cellFormData, description: e.target.value })}
                  placeholder="Describe this cell..."
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-cell-active">Active Status</Label>
                <Switch
                  id="edit-cell-active"
                  checked={cellFormData.isActive}
                  onCheckedChange={(checked) => setCellFormData({ ...cellFormData, isActive: checked })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cell-image">Cell Image</Label>
                <div className="flex items-start gap-4">
                  {(imagePreview || cellFormData.imageUrl) ? (
                    <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-border bg-muted flex-shrink-0">
                      <img
                        src={imagePreview || cellFormData.imageUrl}
                        alt="Cell image preview"
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={handleRemoveImage}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-lg border-2 border-dashed border-border bg-muted flex flex-col items-center justify-center flex-shrink-0">
                      <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-xs text-muted-foreground">No image</span>
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <Input
                      id="edit-cell-image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                      Accepts JPG, PNG, GIF, WEBP. Max size: 5MB.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowEditDialog(false)
                setEditingCell(null)
                setCellFormData(initialCellFormData)
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveCell} disabled={updateMutation.isPending}>
              {updateMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Update Cell
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  )
}
