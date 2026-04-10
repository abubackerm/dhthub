"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Package,
  ChevronRight,
  Upload,
  Loader2,
  GripVertical,
  AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { restrictToParentElement } from "@dnd-kit/modifiers"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  useCategoryTree,
  useCells,
  useProducts,
  useDeleteProduct,
  useUpdateProduct,
  useRemoveVariant,
  useUpdateVariant,
  useAddVariantImage,
  useUpdateImage,
  useRemoveImage,
  useReorderVariantImages,
  getVariantImages,
  type CategoryTreeNode,
  type Cell,
  type Product,
  type UpdateProductInput,
} from "@/lib/api/catalog"
import { useConfirmDialog } from "@/providers/confirm-dialog-provider"

export default function CellProductsPage() {
  const router = useRouter()
  const params = useParams()
  const leafId = params.leafId as string
  const cellId = params.cellId as string

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<any>(null)
  const [variantDrawerOpen, setVariantDrawerOpen] = useState(false)

  const { data: categoryTree } = useCategoryTree()
  const { data: cells } = useCells({ categoryId: leafId })
  
  // Debug logging
  console.log('CellProductsPage - cellId:', cellId)
  console.log('CellProductsPage - will query with:', cellId ? { cellId, pageSize: 1000 } : undefined)
  
  const { data: productsData, isLoading: productsLoading, isError: productsError } = useProducts(
    cellId ? { cellId, pageSize: 1000 } : undefined
  )

  console.log('CellProductsPage - productsData:', productsData)
  console.log('CellProductsPage - productsLoading:', productsLoading)
  console.log('CellProductsPage - productsError:', productsError)
  const deleteProductMutation = useDeleteProduct()
  const updateProductMutation = useUpdateProduct()
  const removeVariantMutation = useRemoveVariant()
  const updateVariantMutation = useUpdateVariant()
  const addImageMutation = useAddVariantImage()
  const updateImageMutation = useUpdateImage()
  const removeImageMutation = useRemoveImage()
  const reorderImagesMutation = useReorderVariantImages()
  const { confirm } = useConfirmDialog()

  const [editVariantOpen, setEditVariantOpen] = useState(false)
  const [editingVariant, setEditingVariant] = useState<any>(null)
  const [variantImages, setVariantImages] = useState<any[]>([])

  const [editProductOpen, setEditProductOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const cell = cells?.find(c => c.id === cellId)

  const flatCategories = useMemo(() => {
    if (!categoryTree) return []
    
    function flatten(
      nodes: CategoryTreeNode[],
      parentPath = "",
      result: { id: string; path: string }[] = [],
    ): { id: string; path: string }[] {
      for (const node of nodes) {
        const currentPath = parentPath ? `${parentPath} > ${node.name}` : node.name
        result.push({ id: node.id, path: currentPath })
        if (node.children.length > 0) {
          flatten(node.children, currentPath, result)
        }
      }
      return result
    }
    
    return flatten(categoryTree)
  }, [categoryTree])

  const leafCategory = useMemo(() => {
    if (!categoryTree) return null

    function findLeaf(nodes: CategoryTreeNode[]): CategoryTreeNode | null {
      for (const node of nodes) {
        if (node.id === leafId) return node
        if (node.children.length > 0) {
          const found = findLeaf(node.children)
          if (found) return found
        }
      }
      return null
    }

    return findLeaf(categoryTree)
  }, [categoryTree, leafId])

  const getCategoryPath = useMemo(() => {
    return (categoryId: string) => {
      const cat = flatCategories.find(c => c.id === categoryId)
      return cat?.path || "-"
    }
  }, [flatCategories])

  const filteredProducts = useMemo(() => {
    if (!productsData?.data?.length) return []

    const query = searchQuery.toLowerCase().trim()
    if (!query) return productsData.data

    return productsData.data.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.slug?.toLowerCase().includes(query) ||
        product.sku?.toLowerCase().includes(query)
    )
  }, [productsData, searchQuery])

  const handleViewVariants = (product: Product) => {
    setSelectedProduct(product)
    setSelectedVariant(null)
    setVariantDrawerOpen(true)
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setEditProductOpen(true)
  }

  const handleSaveProduct = (data: UpdateProductInput) => {
    if (editingProduct) {
      updateProductMutation.mutate(
        { id: editingProduct.id, data },
        {
          onSuccess: () => {
            setEditProductOpen(false)
            setEditingProduct(null)
            toast.success("Product updated successfully")
          },
        }
      )
    }
  }

  const handleDeleteProduct = async (product: Product) => {
    const hasVariants = product.variants && product.variants.length > 0
    const description = hasVariants
      ? `This will delete "${product.name}" and all its ${product.variants.length} variant(s). This action cannot be undone.`
      : `This will delete "${product.name}". This action cannot be undone.`

    const confirmed = await confirm({
      title: "Delete Product",
      description,
      variant: "destructive",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
    })

    if (confirmed) {
      deleteProductMutation.mutate(product.id)
    }
  }

  const handleDeleteVariant = async (product: Product, variant: any) => {
    const confirmed = await confirm({
      title: "Delete Product Variant",
      description: `Are you sure you want to delete "${product.name}" (${variant.sku || 'No SKU'})? This action cannot be undone.`,
      variant: "destructive",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
    })

    if (confirmed) {
      removeVariantMutation.mutate(
        { productId: product.id, variantId: variant.id },
        {
          onSuccess: () => {
            // Update the selectedProduct state to remove the deleted variant
            if (selectedProduct && selectedProduct.id === product.id) {
              setSelectedProduct({
                ...selectedProduct,
                variants: selectedProduct.variants?.filter(v => v.id !== variant.id) || []
              })
            }
          },
        }
      )
    }
  }

  const handleEditVariant = async (product: Product, variant: any) => {
    setEditingVariant({ ...variant })
    setVariantImages([]) // Clear previous images
    setEditVariantOpen(true)

    // Load variant images
    try {
      const images = await getVariantImages(product.id, variant.id)
      setVariantImages(images)
    } catch (error) {
      console.error('Failed to load variant images:', error)
    }
  }

  const handleSaveVariant = (data: any) => {
    if (selectedProduct && editingVariant) {
      updateVariantMutation.mutate({
        productId: selectedProduct.id,
        variantId: editingVariant.id,
        data,
      })
      setEditVariantOpen(false)
    }
  }

  const handleAddImage = (imageUrl: string, altText?: string) => {
    if (selectedProduct && editingVariant) {
      addImageMutation.mutate(
        {
          productId: selectedProduct.id,
          variantId: editingVariant.id,
          data: { url: imageUrl, altText },
        },
        {
          onSuccess: (image) => {
            setVariantImages(prev => [...prev, image])
          },
        },
      )
    }
  }

  const handleUpdateImage = (imageId: string, data: any) => {
    updateImageMutation.mutate(
      { imageId, data },
      {
        onSuccess: () => {
          setVariantImages(prev =>
            prev.map(img => (img.id === imageId ? { ...img, ...data } : img)),
          )
        },
      },
    )
  }

  const handleRemoveImage = (imageId: string) => {
    const confirmed = confirm({
      title: "Delete Image",
      description: "Are you sure you want to delete this image?",
      variant: "destructive",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
    })

    if (confirmed) {
      removeImageMutation.mutate(imageId, {
        onSuccess: () => {
          setVariantImages(prev => prev.filter(img => img.id !== imageId))
        },
      })
    }
  }

  const handleReorderImages = (imageIds: string[]) => {
    if (!selectedProduct || !editingVariant) return
    reorderImagesMutation.mutate(
      { productId: selectedProduct.id, variantId: editingVariant.id, imageIds },
      {
        onSuccess: () => {
          setVariantImages(prev => {
            const reordered = imageIds
              .map(id => prev.find(img => img.id === id))
              .filter(Boolean)
            return reordered
          })
        },
      },
    )
  }

  const handleGoBack = () => {
    router.push(`/dhthub-admin/products/leaves/${leafId}/cells`)
  }

  const aggregatedStats = useMemo(() => {
    if (!productsData?.data?.length) {
      return { productCount: 0, variantCount: 0, totalStock: 0, minPrice: null, maxPrice: null }
    }

    const allVariants = productsData.data.flatMap(p => p.variants || [])
    const variantCount = allVariants.length
    const totalStock = allVariants.reduce((acc, v) => acc + v.quantity, 0)
    
    const prices = allVariants.map(v => v.price).filter((p): p is number => p !== null)
    const minPrice = prices.length > 0 ? Math.min(...prices) : null
    const maxPrice = prices.length > 0 ? Math.max(...prices) : null

    return { productCount: productsData.data.length, variantCount, totalStock, minPrice, maxPrice }
  }, [productsData])

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handleGoBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {cell?.name || "Cell Products"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {leafCategory ? getCategoryPath(leafCategory.id) : ""} / {cell?.name}
            </p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Products</div>
          <div className="text-2xl font-semibold">{aggregatedStats.productCount}</div>
        </div>
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Variants</div>
          <div className="text-2xl font-semibold">{aggregatedStats.variantCount}</div>
        </div>
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Stock</div>
          <div className="text-2xl font-semibold">{aggregatedStats.totalStock}</div>
        </div>
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Price Range</div>
          <div className="text-lg font-semibold">
            {aggregatedStats.minPrice !== null && aggregatedStats.maxPrice !== null
              ? `SAR ${aggregatedStats.minPrice.toFixed(2)} - SAR ${aggregatedStats.maxPrice.toFixed(2)}`
              : "-"}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="border rounded-lg">
        {productsLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading products...</div>
        ) : productsError ? (
          <div className="p-8 text-center text-destructive">Failed to load products</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {searchQuery ? "No products found" : "No products in this cell yet"}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16"></TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead className="w-32">SKU</TableHead>
                <TableHead className="w-24">Variants</TableHead>
                <TableHead className="w-24">Stock</TableHead>
                <TableHead className="w-28">Price Range</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const variants = product.variants || []
                const totalStock = variants.reduce((acc, v) => acc + v.quantity, 0)
                const prices = variants.map(v => v.price).filter((p): p is number => p !== null)
                const minPrice = prices.length > 0 ? Math.min(...prices) : null
                const maxPrice = prices.length > 0 ? Math.max(...prices) : null
                
                return (
                  <TableRow
                    key={product.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewVariants(product)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center overflow-hidden shrink-0">
                          {product.thumbnailUrl || product.primaryImageUrl ? (
                            <img
                              src={product.thumbnailUrl || product.primaryImageUrl || ''}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                                e.currentTarget.nextElementSibling?.classList.remove('hidden')
                              }}
                            />
                          ) : null}
                          <Package className={`h-5 w-5 text-muted-foreground ${product.thumbnailUrl || product.primaryImageUrl ? 'hidden' : ''}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{product.name}</div>
                          {product.description && (
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {product.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {product.sku || "-"}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{variants.length}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{totalStock}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {minPrice !== null && maxPrice !== null
                          ? `SAR ${minPrice.toFixed(2)} - SAR ${maxPrice.toFixed(2)}`
                          : "-"}
                      </span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteProduct(product)}
                            className="text-destructive focus:text-destructive"
                            disabled={deleteProductMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {filteredProducts.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredProducts.length} product{filteredProducts.length === 1 ? "" : "s"}
        </div>
      )}

      {/* Product Variants Drawer */}
      <ProductVariantsDrawer
        product={selectedProduct}
        open={variantDrawerOpen}
        onOpenChange={setVariantDrawerOpen}
        onDeleteVariant={handleDeleteVariant}
        onEditVariant={handleEditVariant}
        isDeleting={removeVariantMutation.isPending}
        selectedVariant={selectedVariant}
        onVariantSelect={setSelectedVariant}
      />

      {/* Edit Variant Dialog */}
      <EditVariantDialog
        open={editVariantOpen}
        onOpenChange={setEditVariantOpen}
        variant={editingVariant || {}}
        onSave={handleSaveVariant}
        images={variantImages}
        onAddImage={handleAddImage}
        onUpdateImage={handleUpdateImage}
        onRemoveImage={handleRemoveImage}
        onReorderImages={handleReorderImages}
        isUpdating={updateVariantMutation.isPending}
        isAddingImage={addImageMutation.isPending}
        isReordering={reorderImagesMutation.isPending}
        productId={selectedProduct?.id || ''}
        variantId={editingVariant?.id || ''}
      />

      {/* Edit Product Dialog */}
      <EditProductDialog
        open={editProductOpen}
        onOpenChange={setEditProductOpen}
        product={editingProduct}
        onSave={handleSaveProduct}
        isUpdating={updateProductMutation.isPending}
      />
    </div>
  )
}

interface ProductVariantsDrawerProps {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleteVariant: (product: Product, variant: any) => void
  onEditVariant: (product: Product, variant: any) => void
  isDeleting: boolean
  selectedVariant: any
  onVariantSelect: (variant: any) => void
}

function ProductVariantsDrawer({
  product,
  open,
  onOpenChange,
  onDeleteVariant,
  onEditVariant,
  isDeleting,
  selectedVariant,
  onVariantSelect,
}: ProductVariantsDrawerProps) {
  if (!product) return null

  const variants = product.variants || []

  return (
    <div className={`fixed inset-0 z-50 flex justify-end ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={() => onOpenChange(false)}
      />
      
      {/* Drawer */}
      <div className={`fixed right-0 top-0 h-full w-full sm:max-w-[700px] bg-background shadow-lg transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'} overflow-y-auto`}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{product.name}</h2>
              {product.sku && (
                <p className="text-sm text-muted-foreground mt-1">
                  SKU: {product.sku}
                </p>
              )}
            </div>
            <button
              onClick={() => {
                onOpenChange(false)
                onVariantSelect(null)
              }}
              className="rounded-md p-2 hover:bg-accent hover:text-accent-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </div>

          {/* Selected Variant Info */}
          {selectedVariant && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-primary">Selected Variant</h4>
                <button
                  onClick={() => onVariantSelect(null)}
                  className="text-xs text-primary hover:underline"
                >
                  Clear selection
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">SKU:</span>
                  <span className="ml-2 font-mono">{selectedVariant.sku || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Name:</span>
                  <span className="ml-2">{selectedVariant.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Price:</span>
                  <span className="ml-2">
                    {selectedVariant.price != null ? `SAR ${selectedVariant.price.toFixed(2)}` : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Stock:</span>
                  <span className="ml-2">{selectedVariant.quantity}</span>
                </div>
              </div>
            </div>
          )}

          {product.description && (
            <div className="mb-6">
              <p className="text-sm text-muted-foreground">{product.description}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Product Info */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-semibold mb-3">Product Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Slug:</span>
                  <span className="ml-2 font-mono">{product.slug || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <span className="ml-2 capitalize">{product.status}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <span className="ml-2 capitalize">{product.type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Variants:</span>
                  <span className="ml-2">{variants.length}</span>
                </div>
              </div>
            </div>

            {/* Variants */}
            <div>
              <h4 className="text-sm font-semibold mb-3">
                Variants ({variants.length})
              </h4>
              {variants.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No variants found for this product
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-40">SKU</TableHead>
                      <TableHead>Variant Name</TableHead>
                      <TableHead className="w-24">Price</TableHead>
                      <TableHead className="w-24">Stock</TableHead>
                      <TableHead className="w-24">Default</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variants.map((variant) => (
                      <TableRow
                        key={variant.id}
                        className={selectedVariant?.id === variant.id ? "bg-primary/5" : "cursor-pointer hover:bg-muted/50"}
                        onClick={() => onVariantSelect(variant)}
                      >
                        <TableCell className="font-mono text-sm">
                          {variant.sku || "-"}
                        </TableCell>
                        <TableCell>{variant.name}</TableCell>
                        <TableCell>
                          {variant.price != null ? `SAR ${variant.price.toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell>{variant.quantity}</TableCell>
                        <TableCell>
                          {variant.isDefault ? (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                              Default
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onEditVariant(product, variant)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onDeleteVariant(product, variant)}
                                className="text-destructive focus:text-destructive"
                                disabled={isDeleting}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface EditVariantDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  variant: any
  onSave: (data: any) => void
  images: any[]
  onAddImage: (url: string, altText?: string) => void
  onUpdateImage: (imageId: string, data: any) => void
  onRemoveImage: (imageId: string) => void
  onReorderImages: (imageIds: string[]) => void
  isUpdating: boolean
  isAddingImage: boolean
  isReordering: boolean
  productId: string
  variantId: string
}

type UploadState = 'idle' | 'uploading' | 'error';

function EditVariantDialog({
  open,
  onOpenChange,
  variant,
  onSave,
  images,
  onAddImage,
  onUpdateImage,
  onRemoveImage,
  onReorderImages,
  isUpdating,
  isAddingImage,
  isReordering,
  productId,
  variantId,
}: EditVariantDialogProps) {
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    price: 0,
    quantity: 0,
    isDefault: false,
  })

  const [newImageUrl, setNewImageUrl] = useState('')
  const [newImageAlt, setNewImageAlt] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadTimeoutError, setUploadTimeoutError] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageCountRef = useRef(images.length)
  const [localImages, setLocalImages] = useState(images)

  useEffect(() => {
    setLocalImages(images)
    imageCountRef.current = images.length
  }, [images])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setLocalImages((prev) => {
      const oldIndex = prev.findIndex((img) => img.id === active.id)
      const newIndex = prev.findIndex((img) => img.id === over.id)
      const reordered = arrayMove(prev, oldIndex, newIndex)
      const ids = reordered.map((img) => img.id)
      onReorderImages(ids)
      return reordered
    })
  }

  useEffect(() => {
    setFormData({
      sku: variant.sku || '',
      name: variant.name || '',
      price: variant.price || 0,
      quantity: variant.quantity || 0,
      isDefault: variant.isDefault || false,
    })
    setNewImageUrl('')
    setNewImageAlt('')
  }, [variant])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const handleAddImage = () => {
    if (newImageUrl) {
      onAddImage(newImageUrl, newImageAlt)
      setNewImageUrl('')
      setNewImageAlt('')
    }
  }

  const handleFileUpload = useCallback(async (files: FileList) => {
    if (!files.length || !productId || !variantId) return

    setUploadState('uploading')
    setUploadError(null)

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const formData = new FormData()
      formData.append('file', file)
      formData.append('entityType', 'variant')
      formData.append('sku', variant.sku || '')
      formData.append('position', String(imageCountRef.current + i + 1))

      try {
        const response = await fetch(`${apiUrl}/v1/storage/upload`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
          signal: AbortSignal.timeout(60_000),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `Upload failed (${response.status})`)
        }

        const result = await response.json()
        onAddImage(result.url, file.name)
        imageCountRef.current++
        setUploadState('idle')
      } catch (err) {
        if (err instanceof TypeError && err.message === 'Failed to fetch') {
          setUploadTimeoutError(true)
          setUploadState('idle')
          if (fileInputRef.current) fileInputRef.current.value = ''
        } else {
          const message = err instanceof Error ? err.message : 'Upload failed'
          setUploadError(message)
          setUploadState('error')
        }
        return
      }

      if (i < files.length - 1) {
        await new Promise((res) => setTimeout(res, 200))
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [productId, variantId, variant, onAddImage])

  if (!open) return null

  const handleClose = () => {
    onOpenChange(false)
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />
      
      {/* Dialog */}
      <div 
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-background rounded-lg shadow-xl transition-all duration-300 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Edit Variant</h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md p-2 hover:bg-accent hover:text-accent-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Variant Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Variant Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">SKU</label>
                <Input
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="Enter SKU"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter variant name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Price</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Quantity</label>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="h-4 w-4"
              />
              <label htmlFor="isDefault" className="text-sm font-medium">
                Set as default variant
              </label>
            </div>
          </div>

          {/* Images */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Variant Images</h3>
            
            {/* Add New Image */}
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) handleFileUpload(e.target.files)
                }}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadState === 'uploading'}
                  className="flex-1"
                >
                  {uploadState === 'uploading' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Images
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                >
                  {showUrlInput ? 'Hide URL input' : 'From URL'}
                </Button>
              </div>

              {uploadState === 'error' && uploadError && (
                <div className="flex items-center justify-between rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  <span>{uploadError}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Retry
                  </Button>
                </div>
              )}

              {showUrlInput && (
                <div className="flex gap-2">
                  <Input
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="Image URL"
                    className="flex-1"
                  />
                  <Input
                    value={newImageAlt}
                    onChange={(e) => setNewImageAlt(e.target.value)}
                    placeholder="Alt text (optional)"
                    className="w-48"
                  />
                  <Button
                    type="button"
                    onClick={handleAddImage}
                    disabled={!newImageUrl || isAddingImage}
                  >
                    Add
                  </Button>
                </div>
              )}
            </div>

            {/* Existing Images - Drag and Drop */}
            {localImages.length > 0 && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToParentElement]}
              >
                <SortableContext
                  items={localImages.map((img) => img.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-3 gap-4">
                    {localImages.map((image, index) => (
                      <SortableImageItem
                        key={image.id}
                        image={image}
                        index={index}
                        disabled={isReordering}
                        onUpdateImage={onUpdateImage}
                        onRemoveImage={onRemoveImage}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {localImages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No images added yet. Add images above.
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={uploadState === 'uploading' || isUpdating}
            >
              {uploadState === 'uploading' ? 'Uploading...' : isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>

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

interface SortableImageItemProps {
  image: any
  index: number
  disabled: boolean
  onUpdateImage: (imageId: string, data: any) => void
  onRemoveImage: (imageId: string) => void
}

function SortableImageItem({ image, index, disabled, onUpdateImage, onRemoveImage }: SortableImageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id, disabled })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted text-muted-foreground"
          {...attributes}
          {...listeners}
          disabled={disabled}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="text-xs text-muted-foreground font-medium">#{index + 1}</span>
        {image.isPrimary && (
          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
            Primary
          </span>
        )}
      </div>
      <div className="aspect-square bg-muted rounded-md overflow-hidden">
        <img
          src={image.url}
          alt={image.altText || 'Variant image'}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="space-y-2">
        <Input
          value={image.altText || ''}
          onChange={(e) => onUpdateImage(image.id, { altText: e.target.value })}
          placeholder="Alt text"
          className="text-sm"
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onUpdateImage(image.id, { isPrimary: !image.isPrimary })}
            className="flex-1"
          >
            {image.isPrimary ? 'Primary' : 'Set Primary'}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => onRemoveImage(image.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

interface EditProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
  onSave: (data: UpdateProductInput) => void
  isUpdating: boolean
}

function EditProductDialog({
  open,
  onOpenChange,
  product,
  onSave,
  isUpdating,
}: EditProductDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    sku: '',
    description: '',
    status: 'DRAFT' as 'DRAFT' | 'ACTIVE' | 'ARCHIVED',
    isFeatured: false,
    thumbnailUrl: '',
  })

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        slug: product.slug || '',
        sku: product.sku || '',
        description: product.description || '',
        status: product.status || 'DRAFT',
        isFeatured: product.isFeatured || false,
        thumbnailUrl: product.thumbnailUrl || '',
      })
    }
  }, [product])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  if (!open || !product) return null

  const handleClose = () => {
    onOpenChange(false)
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-background rounded-lg shadow-xl transition-all duration-300 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Edit Product</h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md p-2 hover:bg-accent hover:text-accent-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Product name"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Slug</label>
            <Input
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="product-slug"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">SKU</label>
            <Input
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
              placeholder="PRODUCT-SKU"
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Product description"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Thumbnail</label>
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-md bg-muted flex items-center justify-center overflow-hidden shrink-0 border">
                {product.primaryImageUrl || formData.thumbnailUrl ? (
                  <img
                    src={formData.thumbnailUrl || product.primaryImageUrl || ''}
                    alt="Thumbnail preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.nextElementSibling?.classList.remove('hidden')
                    }}
                  />
                ) : null}
                <Package className={`h-8 w-8 text-muted-foreground ${product.primaryImageUrl || formData.thumbnailUrl ? 'hidden' : ''}`} />
              </div>
              <div className="flex-1">
                <Input
                  value={formData.thumbnailUrl}
                  onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                  placeholder={product.primaryImageUrl ? "Using primary image" : "https://example.com/image.jpg"}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {product.primaryImageUrl && !formData.thumbnailUrl
                    ? "Leave empty to use the primary product image"
                    : "Enter a custom thumbnail URL or leave empty to use primary image"}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'DRAFT' | 'ACTIVE' | 'ARCHIVED' })}
            >
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isFeatured"
              checked={formData.isFeatured}
              onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
              className="h-4 w-4"
            />
            <label htmlFor="isFeatured" className="text-sm font-medium">
              Featured product
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUpdating}
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
