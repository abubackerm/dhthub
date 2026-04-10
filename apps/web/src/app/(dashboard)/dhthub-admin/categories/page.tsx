"use client"

import { useState, useMemo, useRef } from "react"
import {
  ChevronRight,
  Folder,
  Tag,
  Plus,
  Pencil,
  MoreHorizontal,
  Settings2,
  PlusCircle,
  Grid3x3,
  Image as ImageIcon,
  X,
  Upload,
  Copy,
  Check,
  AlertTriangle,
} from "lucide-react"
import Link from "next/link"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"

import {
  useCategoryTree,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  type CategoryTreeNode,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from "@/lib/api/catalog"
import { CellManagementSheet } from "./components/cell-management-sheet"

interface CategoryFormData {
  name: string
  slug: string
  sku: string
  parentId: string
  description: string
  sortOrder: number
  imageUrl?: string
}

const initialFormData: CategoryFormData = {
  name: "",
  slug: "",
  sku: "",
  parentId: "none",
  description: "",
  sortOrder: 0,
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    || 'category' // Fallback if empty
}

function getAllCategoriesFlat(categories: CategoryTreeNode[]): { id: string; name: string; path: string }[] {
  const result: { id: string; name: string; path: string }[] = []

  function traverse(items: CategoryTreeNode[], parentPath: string = "") {
    for (const item of items) {
      const path = parentPath ? `${parentPath} > ${item.name}` : item.name
      result.push({ id: item.id, name: item.name, path })
      if (item.children.length > 0) {
        traverse(item.children, path)
      }
    }
  }

  traverse(categories)
  return result
}

function getCategoryType(category: CategoryTreeNode): "BRANCH" | "LEAF" {
  return category.children.length === 0 ? "LEAF" : "BRANCH"
}

function isMixedBranch(category: CategoryTreeNode): boolean {
  if (category.children.length === 0) return false;
  const hasLeafChild = category.children.some(c => c.children.length === 0);
  const hasBranchChild = category.children.some(c => c.children.length > 0);
  return hasLeafChild && hasBranchChild;
}

function hasMixedDescendant(category: CategoryTreeNode): boolean {
  if (isMixedBranch(category)) return true;
  return category.children.some(child => hasMixedDescendant(child));
}

function countMixedBranches(categories: CategoryTreeNode[]): number {
  let count = 0;
  for (const cat of categories) {
    if (isMixedBranch(cat)) count++;
    count += countMixedBranches(cat.children);
  }
  return count;
}

function countDescendants(category: CategoryTreeNode): {
  totalCategories: number
  totalCells: number
  totalProducts: number
} {
  let totalCategories = 0
  let totalCells = category.cellCount ?? 0
  let totalProducts = category.productCount

  for (const child of category.children) {
    const counts = countDescendants(child)
    totalCategories += 1 + counts.totalCategories
    totalCells += counts.totalCells
    totalProducts += counts.totalProducts
  }

  return { totalCategories, totalCells, totalProducts }
}

interface CategoryTreeItemProps {
  category: CategoryTreeNode
  depth: number
  expandedIds: Set<string>
  onToggle: (id: string) => void
  onEdit: (category: CategoryTreeNode) => void
  onAddChild: (parentId: string) => void
  onManageCells: (category: CategoryTreeNode) => void
  onManageSchema: (category: CategoryTreeNode) => void
  onDelete: (category: CategoryTreeNode) => void
  copiedSku: string | null
  onCopySku: (sku: string) => void
}

function CategoryTreeItem({
  category,
  depth,
  expandedIds,
  onToggle,
  onEdit,
  onAddChild,
  onManageCells,
  onManageSchema,
  onDelete,
  copiedSku,
  onCopySku,
}: CategoryTreeItemProps) {
  const hasChildren = category.children.length > 0
  const isExpanded = expandedIds.has(category.id)
  const isLeaf = getCategoryType(category) === "LEAF"
  const showsMixedWarning = hasMixedDescendant(category)
  const isDirectlyMixed = isMixedBranch(category)
  const childCount = category.children.length

  return (
    <div className="select-none">
      <div
        className="group flex items-center gap-2 py-2 px-2 rounded-md hover:bg-muted/50 transition-colors"
        style={{ paddingLeft: `${depth * 24 + 8}px` }}
      >
        {/* Expand/Collapse arrow */}
        <button
          onClick={() => hasChildren && onToggle(category.id)}
          className={`flex items-center justify-center w-5 h-5 ${
            hasChildren ? "cursor-pointer" : "invisible"
          }`}
        >
          {hasChildren && (
            <ChevronRight
              className={`h-4 w-4 text-muted-foreground transition-transform ${
                isExpanded ? "rotate-90" : ""
              }`}
            />
          )}
        </button>

        {/* Icon */}
        {isLeaf ? (
          <Tag className="h-4 w-4 text-blue-500" />
        ) : (
          <Folder className={`h-4 w-4 ${isDirectlyMixed ? "text-yellow-500" : "text-amber-500"}`} />
        )}

        {showsMixedWarning && (
          <AlertTriangle
            className="h-4 w-4 text-red-500"
            title={isDirectlyMixed
              ? "This branch has both leaf and branch children. The public page will not show consolidated leaf view. Consider restructuring so all children are either all leaves or all branches."
              : "This branch contains mixed subcategories. Expand to see which branches have both leaf and branch children."}
          />
        )}

        {/* Image thumbnail */}
        {category.imageUrl && (
          <div className="ml-2 w-8 h-8 rounded border bg-muted overflow-hidden shrink-0">
            <img
              src={category.imageUrl}
              alt={category.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>
        )}

        {/* Name */}
        <span className={`flex-1 ${depth === 0 ? "font-semibold" : ""}`}>
          {category.name}
        </span>

        {/* SKU */}
        {category.sku && (
          <div className="flex items-center gap-1">
            <span 
              className="text-xs font-mono ml-2 px-2 py-0.5 rounded bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
              onClick={() => handleCopySku(category.sku!)}
              title="Click to copy SKU"
            >
              {category.sku}
            </span>
            {copiedSku === category.sku ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy 
                className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Copy SKU"
              />
            )}
          </div>
        )}

        {/* Type badge */}
        <Badge
          variant={isLeaf ? "default" : isDirectlyMixed ? "outline" : "secondary"}
          className={`text-xs ${isDirectlyMixed ? "border-red-500 text-red-600 bg-red-50" : ""}`}
        >
          {isLeaf ? "LEAF" : isDirectlyMixed ? "MIXED BRANCH" : "BRANCH"}
        </Badge>

        {/* Count info */}
        <span className="text-xs text-muted-foreground min-w-20 text-right">
          {isLeaf
            ? `${category.cellCount ?? 0} cells, ${category.productCount} products`
            : `${childCount} subcategories`}
        </span>

        {/* Status dot */}
        <div
          className={`w-2 h-2 rounded-full ${
            category.isActive ? "bg-green-500" : "bg-gray-300"
          }`}
          title={category.isActive ? "Active" : "Inactive"}
        />

        {/* Actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(category)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddChild(category.id)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Child
            </DropdownMenuItem>
            {isLeaf && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onManageCells(category)}>
                  <Grid3x3 className="h-4 w-4 mr-2" />
                  Manage Cells
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onManageSchema(category)}>
                  <Settings2 className="h-4 w-4 mr-2" />
                  Manage Schema
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete(category)}
              className="text-destructive focus:text-destructive"
            >
              Delete Category
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Children */}
          {hasChildren && isExpanded && (
        <div className="relative">
          {category.children.map((child) => (
            <CategoryTreeItem
              key={child.id}
              category={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onEdit={onEdit}
              onAddChild={onAddChild}
              onManageCells={onManageCells}
              onManageSchema={onManageSchema}
              onDelete={onDelete}
              copiedSku={copiedSku}
              onCopySku={onCopySku}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CategoriesPage() {
  const { data: categories = [], isLoading, error } = useCategoryTree()
  const createMutation = useCreateCategory()
  const updateMutation = useUpdateCategory()
  const deleteMutation = useDeleteCategory()


  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    return new Set<string>()
  })

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryTreeNode | null>(null)
  const [formData, setFormData] = useState<CategoryFormData>(initialFormData)
  const [isAddingChild, setIsAddingChild] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [copiedSku, setCopiedSku] = useState<string | null>(null)
  const [uploadTimeoutError, setUploadTimeoutError] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<CategoryTreeNode | null>(null)

  // Cell management state
  const [cellSheetOpen, setCellSheetOpen] = useState(false)
  const [selectedCategoryForCells, setSelectedCategoryForCells] = useState<CategoryTreeNode | null>(null)

  const allCategoriesFlat = useMemo(() => getAllCategoriesFlat(categories), [categories])
  const mixedBranchCount = useMemo(() => countMixedBranches(categories), [categories])

  const handleToggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleOpenSheet = () => {
    setEditingCategory(null)
    setFormData(initialFormData)
    setIsAddingChild(false)
    setSheetOpen(true)
    setImageFile(null)
    setImagePreview("")
  }

  const handleEditCategory = (category: CategoryTreeNode) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      slug: category.slug,
      sku: category.sku || "",
      parentId: category.parentId || "none",
      description: category.description || "",
      sortOrder: category.sortOrder,
      imageUrl: category.imageUrl || "",
    })
    setIsAddingChild(false)
    setSheetOpen(true)
  }

  const handleAddChild = (parentId: string) => {
    setEditingCategory(null)
    setFormData({
      ...initialFormData,
      parentId,
      sku: "",
    })
    setIsAddingChild(true)
    setSheetOpen(true)
  }

  const handleManageSchema = (category: CategoryTreeNode) => {
    toast.info(`Manage schema for "${category.name}" - Navigate to Attributes page`)
  }

  const handleManageCells = (category: CategoryTreeNode) => {
    setSelectedCategoryForCells(category)
    setCellSheetOpen(true)
  }

  const handleDeleteCategory = (category: CategoryTreeNode) => {
    setDeleteTarget(category)
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

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Category name is required")
      return
    }

    // Validate slug matches API requirements: lowercase letters, numbers, and hyphens only
    const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    if (!slugPattern.test(formData.slug)) {
      toast.error("Slug must contain only lowercase letters, numbers, and hyphens")
      return
    }

    let imageUrl = formData.imageUrl

    // Detect if image was explicitly removed (had image before, now cleared without new upload)
    const imageRemoved = !imageFile && formData.imageUrl === undefined && editingCategory?.imageUrl;

    // Upload image if provided
    if (imageFile) {
      setIsUploading(true)
      try {
        const uploadData = new FormData()
        uploadData.append('file', imageFile)
        uploadData.append('entityType', 'category')
        uploadData.append('sku', formData.sku.trim() || editingCategory?.sku || '')
        uploadData.append('position', '1')

        const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/v1/storage/upload`, {
          method: 'POST',
          body: uploadData,
          credentials: 'include',
        })

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image')
        }

        const uploadResult = await uploadResponse.json()
        imageUrl = uploadResult.url

        toast.success('Image uploaded successfully')
      } catch (error) {
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
          setImageFile(null)
          setImagePreview("")
          if (imageInputRef.current) imageInputRef.current.value = ''
          setUploadTimeoutError(true)
        } else {
          toast.error('Failed to upload image')
        }
        return
      } finally {
        setIsUploading(false)
      }
    }

    const baseCategoryData = {
      name: formData.name,
      slug: formData.slug,
      sortOrder: formData.sortOrder,
      isActive: true,
      ...(formData.sku.trim() ? { sku: formData.sku.toUpperCase() } : {}),
      ...(imageRemoved ? { imageUrl: null } : {}),
      ...(imageUrl && !imageRemoved ? { imageUrl } : {}),
    }

    if (editingCategory) {
      const updateData: UpdateCategoryInput = {
        ...baseCategoryData,
        ...(formData.description.trim()
          ? { description: formData.description }
          : {}),
      }

      updateMutation.mutate({
        id: editingCategory.id,
        data: updateData,
      })
    } else {
      const createData: CreateCategoryInput = {
        ...baseCategoryData,
        ...(formData.description.trim()
          ? { description: formData.description }
          : {}),
        ...(formData.parentId !== "none" ? { parentId: formData.parentId } : {}),
      }

      createMutation.mutate(createData)
    }

    setSheetOpen(false)
    setFormData(initialFormData)
    setEditingCategory(null)
    setIsAddingChild(false)
    setImageFile(null)
    setImagePreview("")
  }

  const handleCancel = () => {
    setSheetOpen(false)
    setFormData(initialFormData)
    setEditingCategory(null)
    setIsAddingChild(false)
    setImageFile(null)
    setImagePreview("")
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
    setFormData((prev) => ({ ...prev, imageUrl: undefined }))
  }

  const handleCopySku = async (sku: string) => {
    try {
      await navigator.clipboard.writeText(sku)
      setCopiedSku(sku)
      toast.success(`SKU ${sku} copied to clipboard`)
      setTimeout(() => setCopiedSku(null), 2000)
    } catch (error) {
      toast.error('Failed to copy SKU')
      console.error(error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
            <p className="text-muted-foreground">
              Build your catalog structure. Branches group items, Leaves hold products.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild disabled>
              <Link href="/dhthub-admin/categories/import">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Link>
            </Button>
            <Button onClick={handleOpenSheet} disabled>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
            <p className="text-muted-foreground">
              Build your catalog structure. Branches group items, Leaves hold products.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/dhthub-admin/categories/import">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Link>
            </Button>
            <Button onClick={handleOpenSheet}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <div className="text-center">
              <p className="text-destructive font-semibold mb-2">Failed to load categories</p>
              <p className="text-muted-foreground text-sm">{(error as Error).message}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">
            Build your catalog structure. Branches group items, Leaves hold products.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/dhthub-admin/categories/import">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Link>
          </Button>
          <Button onClick={handleOpenSheet}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            Category Tree
            {mixedBranchCount > 0 && (
              <Badge variant="outline" className="border-red-500 text-red-600 bg-red-50 text-xs font-normal">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {mixedBranchCount} mixed {mixedBranchCount === 1 ? "branch" : "branches"}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Manage your product categorization hierarchy
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {categories.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-muted-foreground">No categories yet. Create your first category to get started.</p>
              </div>
            ) : (
              categories.map((category) => (
                <CategoryTreeItem
                  key={category.id}
                  category={category}
                  depth={0}
                  expandedIds={expandedIds}
                  onToggle={handleToggle}
                  onEdit={handleEditCategory}
                  onAddChild={handleAddChild}
                  onManageCells={handleManageCells}
                  onManageSchema={handleManageSchema}
                  onDelete={handleDeleteCategory}
                  copiedSku={copiedSku}
                  onCopySku={handleCopySku}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Category Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingCategory ? "Edit Category" : isAddingChild ? "Add Child Category" : "Add Category"}
            </SheetTitle>
            <SheetDescription>
              {editingCategory
                ? "Update category details below."
                : "Fill in details to create a new category."}
            </SheetDescription>
          </SheetHeader>

          <div className="grid gap-4 py-6">
            <div className="grid gap-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Hex Bolts"
                disabled={createMutation.isPending || updateMutation.isPending}
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
                placeholder="e.g., hex-bolts"
                className="font-mono text-sm"
                disabled={createMutation.isPending || updateMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Auto-generated from name. Must contain only lowercase letters, numbers, and hyphens.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, sku: e.target.value.toUpperCase() }))
                }
                placeholder="e.g., CG-A1B2C3"
                className="font-mono text-sm"
                disabled={createMutation.isPending || updateMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Optional. Category SKU for image mapping (CG- prefix recommended).
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="parent">Parent Category</Label>
              <Select
                value={formData.parentId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, parentId: value }))
                }
                disabled={isAddingChild || !!editingCategory}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None - Top Level</SelectItem>
                  {allCategoriesFlat
                    .filter((c) => !editingCategory || c.id !== editingCategory.id)
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.path}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Optional description for this category"
                rows={3}
                disabled={createMutation.isPending || updateMutation.isPending}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    sortOrder: parseInt(e.target.value) || 0,
                  }))
                }
                placeholder="0"
                disabled={createMutation.isPending || updateMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Lower numbers appear first
              </p>
            </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="image">Category Image</Label>
              <div className="flex items-start gap-4">
                {(imagePreview || formData.imageUrl) ? (
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-border shrink-0 bg-muted">
                    <img
                      src={imagePreview || formData.imageUrl}
                      alt="Category image preview"
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
                  <div className="w-24 h-24 rounded-lg border-2 border-dashed border-border bg-muted flex flex-col items-center justify-center shrink-0">
                    <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground">No image</span>
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <Input
                    id="image"
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="cursor-pointer"
                    disabled={isUploading || createMutation.isPending || updateMutation.isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Accepts JPG, PNG, GIF, WEBP. Max size: 5MB.
                  </p>
                </div>
              </div>
            </div>

          <SheetFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={handleCancel}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isUploading || createMutation.isPending || updateMutation.isPending}
            >
              {isUploading || createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {isUploading ? "Uploading..." : editingCategory ? "Update Category" : "Save Category"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Cell Management Sheet */}
      {selectedCategoryForCells && (
        <CellManagementSheet
          open={cellSheetOpen}
          onClose={() => {
            setCellSheetOpen(false)
            setSelectedCategoryForCells(null)
          }}
          category={selectedCategoryForCells}
        />
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="Delete Category"
        description={`Are you sure you want to delete "${deleteTarget?.name ?? ""}"? This action cannot be undone and will permanently remove all associated data.`}
        warningDetails={
          deleteTarget
            ? (() => {
                const counts = countDescendants(deleteTarget)
                const details: string[] = []
                if (counts.totalCategories > 0) {
                  details.push(`${counts.totalCategories} subcategor${counts.totalCategories === 1 ? 'y' : 'ies'}`)
                }
                if (counts.totalCells > 0) {
                  details.push(`${counts.totalCells} cell${counts.totalCells === 1 ? '' : 's'}`)
                }
                if (counts.totalProducts > 0) {
                  details.push(`${counts.totalProducts} product${counts.totalProducts === 1 ? '' : 's'}`)
                }
                if (details.length === 0) {
                  details.push("No subcategories, cells, or products found")
                }
                return details
              })()
            : undefined
        }
        confirmLabel="Delete Category"
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id)
            setDeleteTarget(null)
          }
        }}
        isPending={deleteMutation.isPending}
      />

      <Dialog open={uploadTimeoutError} onOpenChange={setUploadTimeoutError}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Upload Timed Out
            </DialogTitle>
            <DialogDescription>
              The file upload timed out. The file may be corrupted, too large, or in an unsupported format. Please try a different file.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadTimeoutError(false)}>
              Dismiss
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
