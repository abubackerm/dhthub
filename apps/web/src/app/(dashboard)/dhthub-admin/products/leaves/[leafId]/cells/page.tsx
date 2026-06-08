"use client"

import { useState, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Search, Eye, Trash2 } from "lucide-react"

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
  useCategoryTree,
  useCells,
  useProducts,
  useDeleteCell,
  type CategoryTreeNode,
  type Cell,
} from "@/lib/api/catalog"
import { useConfirmDialog } from "@/providers/confirm-dialog-provider"

function flattenCategories(
  nodes: CategoryTreeNode[],
  parentPath = "",
  result: { id: string; path: string }[] = [],
): { id: string; path: string }[] {
  for (const node of nodes) {
    const currentPath = parentPath ? `${parentPath} > ${node.name}` : node.name
    result.push({ id: node.id, path: currentPath })
    if (node.children.length > 0) {
      flattenCategories(node.children, currentPath)
    }
  }
  return result
}

interface CellProductNameProps {
  cell: Cell
}

function CellProductName({ cell }: CellProductNameProps) {
  return <span className="font-medium">{cell.name}</span>
}

interface CellSkuProps {
  cellId: string
}

function CellSku({ cellId }: CellSkuProps) {
  const { data: productsData } = useProducts(
    cellId ? { cellId, pageSize: 1000 } : undefined
  )

  const skuCount = useMemo(() => {
    if (!productsData?.data?.length) return 0
    const allVariants = productsData.data.flatMap(p => p.variants || [])
    if (allVariants.length > 0) return allVariants.length
    return productsData.data.length
  }, [productsData])

  return <span className="text-sm">{skuCount}</span>
}

interface CellStockProps {
  cellId: string
}

function CellStock({ cellId }: CellStockProps) {
  const { data: productsData } = useProducts(
    cellId ? { cellId, pageSize: 1000 } : undefined
  )

  const totalStock = useMemo(() => {
    if (!productsData?.data?.length) return 0
    const allVariants = productsData.data.flatMap(p => p.variants || [])
    if (allVariants.length > 0) return allVariants.reduce((acc, v) => acc + v.quantity, 0)
    return productsData.data.reduce((acc, p) => acc + (p.quantity || 0), 0)
  }, [productsData])

  return <span className="text-sm">{totalStock}</span>
}

interface CellPriceProps {
  cellId: string
}

function CellPrice({ cellId }: CellPriceProps) {
  const { data: productsData } = useProducts(
    cellId ? { cellId, pageSize: 1000 } : undefined
  )

  const priceRange = useMemo(() => {
    if (!productsData?.data?.length) return "-"
    const allVariants = productsData.data.flatMap(p => p.variants || [])
    const prices = allVariants.map(v => v.price).filter((p): p is number => p !== null)

    if (prices.length === 0) {
      const productPrices = productsData.data.map(p => p.price).filter((p): p is number => p !== null)
      if (productPrices.length === 0) return "-"
      const minPrice = Math.min(...productPrices)
      const maxPrice = Math.max(...productPrices)
      if (minPrice === maxPrice) return `SAR ${minPrice.toFixed(2)}`
      return `SAR ${minPrice.toFixed(2)} - SAR ${maxPrice.toFixed(2)}`
    }

    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)

    if (minPrice === maxPrice) return `SAR ${minPrice.toFixed(2)}`
    return `SAR ${minPrice.toFixed(2)} - SAR ${maxPrice.toFixed(2)}`
  }, [productsData])

  return <span className="text-sm">{priceRange}</span>
}

export default function CellsPage() {
  const router = useRouter()
  const params = useParams()
  const leafId = params.leafId as string

  const [searchQuery, setSearchQuery] = useState("")

  const { data: categoryTree } = useCategoryTree()
  const { data: cells, isLoading: cellsLoading, isError: cellsError } = useCells({ categoryId: leafId })
  const deleteMutation = useDeleteCell()
  const { confirm } = useConfirmDialog()

  const flatCategories = useMemo(() => {
    if (!categoryTree) return []
    return flattenCategories(categoryTree)
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

  // Filter cells based on search
  const filteredCells = useMemo(() => {
    if (!cells) return []

    const query = searchQuery.toLowerCase().trim()
    if (!query) return cells

    return cells.filter(
      (cell) =>
        cell.name.toLowerCase().includes(query) ||
        cell.slug.toLowerCase().includes(query)
    )
  }, [cells, searchQuery])

  const handleViewCell = (cell: Cell) => {
    router.push(`/dhthub-admin/products/leaves/${leafId}/cells/${cell.id}`)
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

  const handleGoBack = () => {
    router.push("/dhthub-admin/products")
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handleGoBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {leafCategory?.name || "Leaf Category"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {leafCategory ? getCategoryPath(leafCategory.id) : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search cells..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      <div className="border rounded-lg">
        {cellsLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading cells...</div>
        ) : cellsError ? (
          <div className="p-8 text-center text-destructive">Failed to load cells</div>
        ) : filteredCells.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {searchQuery ? "No cells found" : "No cells in this category yet"}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">No.</TableHead>
                <TableHead>Cell Name</TableHead>
                <TableHead className="w-32">SKU</TableHead>
                <TableHead className="w-24">Stock</TableHead>
                <TableHead className="w-28">Price</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCells.map((cell, index) => (
                <TableRow
                  key={cell.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleViewCell(cell)}
                >
                  <TableCell className="font-mono text-sm">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <CellProductName cell={cell} />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    <CellSku cellId={cell.id} />
                  </TableCell>
                  <TableCell>
                    <CellStock cellId={cell.id} />
                  </TableCell>
                  <TableCell>
                    <CellPrice cellId={cell.id} />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewCell(cell)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteCell(cell)
                        }}
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
      </div>

      {filteredCells.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredCells.length} cell{filteredCells.length === 1 ? "" : "s"}
        </div>
      )}
    </div>
  )
}
