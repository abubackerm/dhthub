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
import { Info } from "lucide-react"

import {
  mockCategories,
  type Category,
} from "@/lib/mock-data"

interface CategoryFormData {
  name: string
  slug: string
  parentId: string
  type: "BRANCH" | "LEAF"
  description: string
  sortOrder: number
}

const initialFormData: CategoryFormData = {
  name: "",
  slug: "",
  parentId: "none",
  type: "BRANCH",
  description: "",
  sortOrder: 0,
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function getAllCategoriesFlat(categories: Category[]): { id: string; name: string; path: string }[] {
  const result: { id: string; name: string; path: string }[] = []

  function traverse(items: Category[], parentPath: string = "") {
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

interface CategoryTreeItemProps {
  category: Category
  depth: number
  expandedIds: Set<string>
  onToggle: (id: string) => void
  onEdit: (category: Category) => void
  onAddChild: (parentId: string) => void
  onManageSchema: (category: Category) => void
}

function CategoryTreeItem({
  category,
  depth,
  expandedIds,
  onToggle,
  onEdit,
  onAddChild,
  onManageSchema,
}: CategoryTreeItemProps) {
  const hasChildren = category.children.length > 0
  const isExpanded = expandedIds.has(category.id)
  const isLeaf = category.type === "LEAF"

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

        {/* Connecting lines */}
        {depth > 0 && (
          <div className="absolute left-0 w-px bg-border" style={{ height: "100%" }} />
        )}

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
          {category.type}
        </Badge>

        {/* Count info */}
        <span className="text-xs text-muted-foreground min-w-20 text-right">
          {isLeaf
            ? `${category.productCount} products`
            : `${category.childCount} subcategories`}
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
            {!isLeaf && (
              <DropdownMenuItem onClick={() => onAddChild(category.id)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Child
              </DropdownMenuItem>
            )}
            {isLeaf && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onManageSchema(category)}>
                  <Settings2 className="h-4 w-4 mr-2" />
                  Manage Schema
                </DropdownMenuItem>
              </>
            )}
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
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CategoriesPage() {
  const [categories] = useState<Category[]>(mockCategories)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const ids = new Set<string>()
    function addBranchIds(items: Category[]) {
      for (const item of items) {
        if (item.type === "BRANCH") {
          ids.add(item.id)
          if (item.children.length > 0) {
            addBranchIds(item.children)
          }
        }
      }
    }
    addBranchIds(mockCategories)
    return ids
  })

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
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

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      slug: category.slug,
      parentId: category.parentId || "none",
      type: category.type,
      description: "",
      sortOrder: 0,
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

  const handleManageSchema = (category: Category) => {
    toast.info(`Manage schema for "${category.name}" - Navigate to Attributes page`)
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

    if (editingCategory) {
      toast.success(`Category "${formData.name}" updated successfully`)
    } else {
      toast.success(`Category "${formData.name}" created successfully`)
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
            {categories.map((category) => (
              <CategoryTreeItem
                key={category.id}
                category={category}
                depth={0}
                expandedIds={expandedIds}
                onToggle={handleToggle}
                onEdit={handleEditCategory}
                onAddChild={handleAddChild}
                onManageSchema={handleManageSchema}
              />
            ))}
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
                ? "Update the category details below."
                : "Fill in the details to create a new category."}
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
              />
              <p className="text-xs text-muted-foreground">
                Auto-generated from name. You can customize it.
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
              <Label>Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formData.type === "BRANCH" ? "default" : "outline"}
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, type: "BRANCH" }))
                  }
                  className="flex-1"
                >
                  <Folder className="h-4 w-4 mr-2" />
                  BRANCH
                </Button>
                <Button
                  type="button"
                  variant={formData.type === "LEAF" ? "default" : "outline"}
                  onClick={() => setFormData((prev) => ({ ...prev, type: "LEAF" }))}
                  className="flex-1"
                >
                  <Tag className="h-4 w-4 mr-2" />
                  LEAF
                </Button>
              </div>
            </div>

            {formData.type === "LEAF" && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  This category will hold products. You&apos;ll need to set up its attribute schema before uploading products.
                </AlertDescription>
              </Alert>
            )}

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
              />
              <p className="text-xs text-muted-foreground">
                Lower numbers appear first
              </p>
            </div>
          </div>

          <SheetFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingCategory ? "Update Category" : "Save Category"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
