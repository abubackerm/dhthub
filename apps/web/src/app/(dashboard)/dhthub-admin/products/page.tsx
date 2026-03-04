"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  Upload,
  Package,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useAddVariant,
  useCategoryTree,
  type ProductView,
  type ProductStatus,
  type CategoryTreeNode,
  type CreateVariantInput,
} from "@/lib/api/catalog"

function StatusBadge({ status }: { status: ProductStatus }) {
  const styles: Record<ProductStatus, { bg: string; label: string }> = {
    draft: { bg: "bg-gray-100 text-gray-700", label: "Draft" },
    active: { bg: "bg-green-100 text-green-700", label: "Active" },
    archived: { bg: "bg-gray-100 text-gray-500 line-through", label: "Archived" },
  }

  const style = styles[status]
  return (
    <Badge variant="secondary" className={style.bg}>
      {style.label}
    </Badge>
  )
}

function StockBadge({ quantity }: { quantity: number }) {
  return quantity > 0 ? (
    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
      In Stock ({quantity})
    </Badge>
  ) : (
    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
      Out of Stock
    </Badge>
  )
}

interface ProductFormData {
  categoryId: string
  name: string
  description: string
  price: number
  quantity: number
  isFeatured: boolean
}

const initialFormData: ProductFormData = {
  categoryId: "",
  name: "",
  description: "",
  price: 0,
  quantity: 0,
  isFeatured: false,
}

interface VariantFormData {
  sku: string
  name: string
  price: number
  quantity: number
  isDefault: boolean
}

const initialVariantFormData: VariantFormData = {
  sku: "",
  name: "",
  price: 0,
  quantity: 0,
  isDefault: false,
}

function flattenCategories(
  nodes: CategoryTreeNode[],
  parentPath = "",
  result: { id: string; path: string }[] = [],
): { id: string; path: string }[] {
  for (const node of nodes) {
    const currentPath = parentPath ? `${parentPath} > ${node.name}` : node.name
    result.push({ id: node.id, path: currentPath })
    if (node.children.length > 0) {
      flattenCategories(node.children, currentPath, result)
    }
  }
  return result
}

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const [detailSheetOpen, setDetailSheetOpen] = useState(false)
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductView | null>(null)
  const [formData, setFormData] = useState<ProductFormData>(initialFormData)
  const [variantFormData, setVariantFormData] = useState<VariantFormData>(initialVariantFormData)
  const [showVariantForm, setShowVariantForm] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const queryParams = useMemo(() => ({
    page,
    pageSize,
    search: debouncedSearch || undefined,
    categoryId: categoryFilter !== "all" ? categoryFilter : undefined,
    status: statusFilter !== "all" ? (statusFilter as ProductStatus) : undefined,
  }), [page, pageSize, debouncedSearch, categoryFilter, statusFilter])

  const { data: productsData, isLoading, isError } = useProducts(queryParams)
  const { data: categoryTree } = useCategoryTree()

  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()
  const addVariant = useAddVariant()

  const flatCategories = useMemo(() => {
    if (!categoryTree) return []
    return flattenCategories(categoryTree)
  }, [categoryTree])

  const getCategoryPath = useCallback((categoryId: string | null) => {
    if (!categoryId) return "-"
    const cat = flatCategories.find(c => c.id === categoryId)
    return cat?.path || "-"
  }, [flatCategories])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: productsData?.meta.total ?? 0,
      draft: 0,
      active: 0,
      archived: 0,
    }
    return counts
  }, [productsData])

  const totalPages = useMemo(() => {
    if (!productsData?.meta.total) return 1
    return Math.ceil(productsData.meta.total / pageSize)
  }, [productsData?.meta.total, pageSize])

  const handleViewProduct = (product: ProductView) => {
    setSelectedProduct(product)
    setShowVariantForm(false)
    setVariantFormData(initialVariantFormData)
    setDetailSheetOpen(true)
  }

  const handleDeleteProduct = (product: ProductView) => {
    if (confirm(`Are you sure you want to delete "${product.name}"?`)) {
      deleteProduct.mutate(product.id)
    }
  }

  const handleOpenAddSheet = () => {
    setFormData(initialFormData)
    setAddSheetOpen(true)
  }

  const handleSaveProduct = () => {
    if (!formData.name.trim()) {
      return
    }

    createProduct.mutate({
      name: formData.name,
      categoryId: formData.categoryId || undefined,
      description: formData.description || undefined,
      price: formData.price || undefined,
      quantity: formData.quantity || undefined,
      isFeatured: formData.isFeatured,
    }, {
      onSuccess: () => {
        setAddSheetOpen(false)
        setFormData(initialFormData)
      }
    })
  }

  const handleUpdateStatus = (status: ProductStatus) => {
    if (!selectedProduct) return
    updateProduct.mutate({
      id: selectedProduct.id,
      data: { status }
    }, {
      onSuccess: (updated) => {
        setSelectedProduct(updated)
      }
    })
  }

  const handleAddVariant = () => {
    if (!selectedProduct || !variantFormData.sku.trim()) {
      return
    }

    addVariant.mutate({
      productId: selectedProduct.id,
      data: {
        sku: variantFormData.sku,
        name: variantFormData.name || undefined,
        price: variantFormData.price || undefined,
        quantity: variantFormData.quantity || undefined,
        isDefault: variantFormData.isDefault,
      }
    }, {
      onSuccess: () => {
        setVariantFormData(initialVariantFormData)
        setShowVariantForm(false)
      }
    })
  }

  const getDefaultVariant = (product: ProductView) => {
    return product.variants.find(v => v.isDefault) || product.variants[0]
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage your product catalog
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => alert("Bulk upload coming soon")}>
            <Upload className="h-4 w-4 mr-2" />
            Bulk Upload
          </Button>
          <Button onClick={handleOpenAddSheet}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {flatCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.path}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <TabsList>
            <TabsTrigger value="all">All ({statusCounts.all})</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="border rounded-lg">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading products...</div>
        ) : isError ? (
          <div className="p-8 text-center text-destructive">Failed to load products</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Default SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="w-20">Price</TableHead>
                <TableHead className="w-24">Stock</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-20">Variants</TableHead>
                <TableHead className="w-28">Date</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!productsData?.data.length ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-12 w-12 text-muted-foreground" />
                      <p className="text-muted-foreground">No products yet</p>
                      <Button onClick={handleOpenAddSheet} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Product
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                productsData.data.map((product) => {
                  const defaultVariant = getDefaultVariant(product)
                  return (
                    <TableRow
                      key={product.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewProduct(product)}
                    >
                      <TableCell className="font-mono text-sm">
                        {defaultVariant?.sku || "-"}
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {getCategoryPath(product.categoryId)}
                      </TableCell>
                      <TableCell>
                        {product.price != null ? `$${product.price.toFixed(2)}` : "-"}
                      </TableCell>
                      <TableCell>
                        <StockBadge quantity={product.quantity} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={product.status} />
                      </TableCell>
                      <TableCell className="text-center">
                        {product.variants.length}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(product.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleViewProduct(product)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteProduct(product)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {productsData?.data.length ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-16">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages} ({productsData.meta.total} total)
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
        <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto">
          {selectedProduct && (
            <>
              <SheetHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <SheetTitle>{selectedProduct.name}</SheetTitle>
                    <SheetDescription className="text-sm text-muted-foreground mt-1">
                      {getCategoryPath(selectedProduct.categoryId)}
                    </SheetDescription>
                  </div>
                  <StatusBadge status={selectedProduct.status} />
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div>
                  <h4 className="text-sm font-semibold mb-3">Core Info</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Slug:</span>
                      <span className="ml-2 font-mono">{selectedProduct.slug}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Type:</span>
                      <span className="ml-2">{selectedProduct.type}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Price:</span>
                      <span className="ml-2">
                        {selectedProduct.price != null ? `$${selectedProduct.price.toFixed(2)}` : "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Quantity:</span>
                      <span className="ml-2">{selectedProduct.quantity}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Featured:</span>
                      <span className="ml-2">{selectedProduct.isFeatured ? "Yes" : "No"}</span>
                    </div>
                  </div>
                </div>

                {selectedProduct.description && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-semibold mb-3">Description</h4>
                      <p className="text-sm text-muted-foreground">{selectedProduct.description}</p>
                    </div>
                  </>
                )}

                <Separator />

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold">Variants ({selectedProduct.variants.length})</h4>
                    {!showVariantForm && (
                      <Button size="sm" variant="outline" onClick={() => setShowVariantForm(true)}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Variant
                      </Button>
                    )}
                  </div>

                  {showVariantForm && (
                    <div className="mb-4 p-4 border rounded-lg space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="variantSku">SKU *</Label>
                          <Input
                            id="variantSku"
                            value={variantFormData.sku}
                            onChange={(e) => setVariantFormData(prev => ({ ...prev, sku: e.target.value }))}
                            placeholder="SKU-001"
                            className="font-mono"
                          />
                        </div>
                        <div>
                          <Label htmlFor="variantName">Name</Label>
                          <Input
                            id="variantName"
                            value={variantFormData.name}
                            onChange={(e) => setVariantFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Variant name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="variantPrice">Price</Label>
                          <Input
                            id="variantPrice"
                            type="number"
                            step="0.01"
                            value={variantFormData.price}
                            onChange={(e) => setVariantFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="variantQty">Quantity</Label>
                          <Input
                            id="variantQty"
                            type="number"
                            value={variantFormData.quantity}
                            onChange={(e) => setVariantFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="variantDefault"
                          checked={variantFormData.isDefault}
                          onChange={(e) => setVariantFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                          className="rounded"
                        />
                        <Label htmlFor="variantDefault" className="font-normal">Set as default variant</Label>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleAddVariant} disabled={!variantFormData.sku.trim()}>
                          Add Variant
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setShowVariantForm(false); setVariantFormData(initialVariantFormData); }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {selectedProduct.variants.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>SKU</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Default</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedProduct.variants.map((variant) => (
                          <TableRow key={variant.id}>
                            <TableCell className="font-mono text-sm">{variant.sku}</TableCell>
                            <TableCell>{variant.name || "-"}</TableCell>
                            <TableCell>
                              {variant.price != null ? `$${variant.price.toFixed(2)}` : "-"}
                            </TableCell>
                            <TableCell>{variant.quantity}</TableCell>
                            <TableCell>
                              {variant.isDefault && (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-700">Default</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground">No variants yet</p>
                  )}
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-semibold mb-3">Images</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="aspect-square bg-muted rounded-md flex items-center justify-center"
                      >
                        <Package className="h-8 w-8 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <SheetFooter className="mt-6 flex gap-2">
                {selectedProduct.status === "draft" && (
                  <Button onClick={() => handleUpdateStatus("active")} className="flex-1">
                    Activate Product
                  </Button>
                )}
                {selectedProduct.status === "active" && (
                  <Button variant="outline" onClick={() => handleUpdateStatus("archived")} className="flex-1">
                    Archive Product
                  </Button>
                )}
                {selectedProduct.status === "archived" && (
                  <Button onClick={() => handleUpdateStatus("active")} className="flex-1">
                    Reactivate Product
                  </Button>
                )}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={addSheetOpen} onOpenChange={setAddSheetOpen}>
        <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add Product</SheetTitle>
            <SheetDescription>
              Create a new product in your catalog
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Hex Head Screw 1/4-20 x 1in"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, categoryId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {flatCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.path}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Product description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData((prev) => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData((prev) => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isFeatured"
                checked={formData.isFeatured}
                onChange={(e) => setFormData((prev) => ({ ...prev, isFeatured: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="isFeatured" className="font-normal">Featured product</Label>
            </div>
          </div>

          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setAddSheetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProduct} disabled={!formData.name.trim() || createProduct.isPending}>
              {createProduct.isPending ? "Creating..." : "Create Product"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
