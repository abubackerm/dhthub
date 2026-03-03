"use client"

import { useState, useMemo } from "react"
import {
  ChevronRight,
  Folder,
  Tag,
  Plus,
  Pencil,
  MoreHorizontal,
  Settings2,
  PlusCircle,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info, Loader2 } from "lucide-react"
import { useConfirmDialog } from "@/providers/confirm-dialog-provider"

import {
  useCategoryTree,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  type CategoryTreeNode,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from "@/lib/api/catalog"

interface CategoryFormData {
  name: string
  slug: string
  parentId: string
  description: string
  sortOrder: number
}

const initialFormData: CategoryFormData = {
  name: "",
  slug: "",
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

function getDisplayCounts(category: CategoryTreeNode): { productCount: number; childCount: number } {
  const childCount = category.children.length
  const productCount = childCount === 0 ? 0 : category.children.reduce((sum, child) => sum + getDisplayCounts(child).productCount, 0)
  return { productCount, childCount }
}

interface CategoryTreeItemProps {
  category: CategoryTreeNode
  depth: number
  expandedIds: Set<string>
  onToggle: (id: string) => void
  onEdit: (category: CategoryTreeNode) => void
  onAddChild: (parentId: string) => void
  onManageSchema: (category: CategoryTreeNode) => void
  onDelete: (category: CategoryTreeNode) => void
}

function CategoryTreeItem({
  category,
  depth,
  expandedIds,
  onToggle,
  onEdit,
  onAddChild,
  onManageSchema,
  onDelete,
}: CategoryTreeItemProps) {
  const hasChildren = category.children.length > 0
  const isExpanded = expandedIds.has(category.id)
  const isLeaf = getCategoryType(category) === "LEAF"
  const { productCount, childCount } = getDisplayCounts(category)

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
          <Folder className="h-4 w-4 text-amber-500" />
        )}

        {/* Name */}
        <span className={`flex-1 ${depth === 0 ? "font-semibold" : ""}`}>
          {category.name}
        </span>

        {/* Type badge */}
        <Badge variant={isLeaf ? "default" : "secondary"} className="text-xs">
          {isLeaf ? "LEAF" : "BRANCH"}
        </Badge>

        {/* Count info */}
        <span className="text-xs text-muted-foreground min-w-20 text-right">
          {isLeaf
            ? `${productCount} products`
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
              onManageSchema={onManageSchema}
              onDelete={onDelete}
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
  const { confirm } = useConfirmDialog()

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    return new Set<string>()
  })

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryTreeNode | null>(null)
  const [formData, setFormData] = useState<CategoryFormData>(initialFormData)
  const [isAddingChild, setIsAddingChild] = useState(false)

  const allCategoriesFlat = useMemo(() => getAllCategoriesFlat(categories), [categories])

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
  }

  const handleEditCategory = (category: CategoryTreeNode) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      slug: category.slug,
      parentId: category.parentId || "none",
      description: category.description || "",
      sortOrder: category.sortOrder,
    })
    setIsAddingChild(false)
    setSheetOpen(true)
  }

  const handleAddChild = (parentId: string) => {
    setEditingCategory(null)
    setFormData({
      ...initialFormData,
      parentId,
    })
    setIsAddingChild(true)
    setSheetOpen(true)
  }

  const handleManageSchema = (category: CategoryTreeNode) => {
    toast.info(`Manage schema for "${category.name}" - Navigate to Attributes page`)
  }

  const handleDeleteCategory = async (category: CategoryTreeNode) => {
    const children = category.children || [];  // Safety fallback
    if (children.length > 0) {
      toast.error(`Cannot delete "${category.name}" because it has ${children.length} subcategories. Delete or move subcategories first.`)
      return
    }

    const confirmed = await confirm({
      title: "Delete Category",
      description: `Are you sure you want to delete "${category.name}"? This action cannot be undone.`,
      variant: "destructive",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
    })

    if (confirmed) {
      console.log('Deleting category:', { id: category.id, name: category.name })
      deleteMutation.mutate(category.id)
    }
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

  const handleSave = () => {
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

    // Build category data, only including defined values
    const categoryData: Record<string, unknown> = {
      name: formData.name,
      slug: formData.slug,
    }

    // For description, only include if not empty
    if (formData.description.trim()) {
      categoryData.description = formData.description
    }

    // Note: parentId can only be set on create, not update
    // To change a category's parent, you would need to use a move operation
    if (!editingCategory && formData.parentId !== "none") {
      categoryData.parentId = formData.parentId
    }

    categoryData.sortOrder = formData.sortOrder
    categoryData.isActive = true

    if (editingCategory) {
      updateMutation.mutate({
        id: editingCategory.id,
        data: categoryData as UpdateCategoryInput,
      })
    } else {
      createMutation.mutate(categoryData as CreateCategoryInput)
    }

    setSheetOpen(false)
    setFormData(initialFormData)
    setEditingCategory(null)
    setIsAddingChild(false)
  }

  const handleCancel = () => {
    setSheetOpen(false)
    setFormData(initialFormData)
    setEditingCategory(null)
    setIsAddingChild(false)
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
          <Button onClick={handleOpenSheet} disabled>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
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
          <Button onClick={handleOpenSheet}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
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
        <Button onClick={handleOpenSheet}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Category Tree</CardTitle>
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
                  onManageSchema={handleManageSchema}
                  onDelete={handleDeleteCategory}
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
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {editingCategory ? "Update Category" : "Save Category"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
