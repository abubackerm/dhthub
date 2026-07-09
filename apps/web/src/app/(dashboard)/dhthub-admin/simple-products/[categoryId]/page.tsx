"use client"

import { useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  ListChecks,
  Trash2,
  Package,
  Loader2,
  Copy,
  Check,
} from "lucide-react"
import { toast } from "sonner"

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
  useCategoryTree,
  useSimpleProducts,
  useDeleteSimpleProduct,
  type CategoryTreeNode,
  type SimpleProductView,
} from "@/lib/api/catalog"
import { useConfirmDialog } from "@/providers/confirm-dialog-provider"
import { SimpleProductFormDialog } from "./components/simple-product-form"
import { SimpleProductAttributesDialog } from "./components/simple-product-attributes-dialog"

function findNodeById(nodes: CategoryTreeNode[], id: string): CategoryTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children.length > 0) {
      const found = findNodeById(node.children, id)
      if (found) return found
    }
  }
  return null
}

export default function CategorySimpleProductsPage() {
  const params = useParams()
  const router = useRouter()
  const categoryId = params.categoryId as string
  const { confirm } = useConfirmDialog()

  const { data: categoryTree } = useCategoryTree()
  const { data: products = [], isLoading, isError, error } = useSimpleProducts(categoryId)
  const deleteMutation = useDeleteSimpleProduct(categoryId)

  const [searchQuery, setSearchQuery] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<SimpleProductView | null>(null)
  const [attributesProduct, setAttributesProduct] = useState<SimpleProductView | null>(null)
  const [copiedSku, setCopiedSku] = useState<string | null>(null)

  const handleCopySku = async (sku: string) => {
    try {
      await navigator.clipboard.writeText(sku)
      setCopiedSku(sku)
      toast.success("SKU copied to clipboard")
      setTimeout(() => setCopiedSku(null), 2000)
    } catch {
      toast.error("Failed to copy SKU")
    }
  }

  const category = useMemo(() => {
    if (!categoryTree) return null
    return findNodeById(categoryTree, categoryId)
  }, [categoryTree, categoryId])

  const filteredProducts = useMemo(() => {
    if (!products.length) return []
    const q = searchQuery.toLowerCase().trim()
    if (!q) return products
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q),
    )
  }, [products, searchQuery])

  const handleAdd = () => {
    setEditingProduct(null)
    setFormOpen(true)
  }

  const handleEdit = (product: SimpleProductView) => {
    setEditingProduct(product)
    setFormOpen(true)
  }

  const handleAttributes = (product: SimpleProductView) => {
    setAttributesProduct(product)
  }

  const handleDelete = async (product: SimpleProductView) => {
    const confirmed = await confirm({
      title: "Delete Product",
      description: `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
      variant: "destructive",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
    })

    if (confirmed) {
      deleteMutation.mutate(product.id)
    }
  }

  const handleFormClose = () => {
    setFormOpen(false)
    setEditingProduct(null)
  }

  const handleGoBack = () => {
    router.push("/dhthub-admin/simple-products")
  }

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
              {category?.name || "Simple Products"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {category?.path || ""}
            </p>
          </div>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Simple Product
        </Button>
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
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Loading products...
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-destructive">
            Failed to load products
            {error && <p className="text-sm mt-1">{(error as Error).message}</p>}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {searchQuery
              ? "No products match your search"
              : "No simple products in this category yet."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16"></TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead className="w-36">SKU</TableHead>
                <TableHead className="w-24">Price</TableHead>
                <TableHead className="w-20">Stock</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {product.images?.[0]?.url ? (
                        <img
                          src={product.images[0].url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none"
                            e.currentTarget.nextElementSibling?.classList.remove("hidden")
                          }}
                        />
                      ) : null}
                      <Package
                        className={`h-5 w-5 text-muted-foreground ${
                          product.images?.[0]?.url ? "hidden" : ""
                        }`}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{product.name}</div>
                      {product.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {product.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-sm">{product.sku || "-"}</span>
                      {product.sku && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopySku(product.sku!)
                          }}
                          className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-muted transition-colors"
                          title="Copy SKU"
                        >
                          {copiedSku === product.sku ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {product.price != null ? `SAR ${(product.price / 100).toFixed(2)}` : "-"}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      (product.quantity ?? 0) > 0
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}>
                      {product.quantity ?? 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        product.status === "active"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {product.status === "active" ? "Active" : "Draft"}
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
                        <DropdownMenuItem onClick={() => handleEdit(product)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAttributes(product)}>
                          <ListChecks className="h-4 w-4 mr-2" />
                          Attributes
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(product)}
                          className="text-destructive focus:text-destructive"
                          disabled={deleteMutation.isPending}
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

      {filteredProducts.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredProducts.length} product{filteredProducts.length === 1 ? "" : "s"}
        </div>
      )}

      {/* Simple Product Form Dialog */}
      <SimpleProductFormDialog
        categoryId={categoryId}
        categoryName={category?.name || ""}
        product={editingProduct}
        open={formOpen}
        onClose={handleFormClose}
      />

      {/* Simple Product Attributes Dialog */}
      {attributesProduct && (
        <SimpleProductAttributesDialog
          categoryId={categoryId}
          product={attributesProduct}
          open={!!attributesProduct}
          onClose={() => setAttributesProduct(null)}
        />
      )}
    </div>
  )
}
