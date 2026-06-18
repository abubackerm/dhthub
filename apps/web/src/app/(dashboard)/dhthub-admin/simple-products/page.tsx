"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, ArrowRight, LayoutGrid, Tag } from "lucide-react"

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
import { Badge } from "@/components/ui/badge"
import {
  useCategoryTree,
  type CategoryTreeNode,
} from "@/lib/api/catalog"

function flattenAndFilterSimpleGridCategories(
  nodes: CategoryTreeNode[],
): { id: string; name: string; slug: string; path: string; isLeaf: boolean; displayMode: string }[] {
  const result: { id: string; name: string; slug: string; path: string; isLeaf: boolean; displayMode: string }[] = []

  function traverse(items: CategoryTreeNode[], parentPath = "") {
    for (const item of items) {
      const currentPath = parentPath ? `${parentPath} > ${item.name}` : item.name
      const isLeaf = item.children.length === 0
      if (item.displayMode === "SIMPLE_GRID" && isLeaf) {
        result.push({
          id: item.id,
          name: item.name,
          slug: item.slug,
          path: currentPath,
          isLeaf,
          displayMode: item.displayMode,
        })
      }
      if (item.children.length > 0) {
        traverse(item.children, currentPath)
      }
    }
  }

  traverse(nodes)
  return result
}

export default function SimpleProductsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const { data: categoryTree, isLoading, isError } = useCategoryTree()

  const simpleGridCategories = useMemo(() => {
    if (!categoryTree) return []
    return flattenAndFilterSimpleGridCategories(categoryTree)
  }, [categoryTree])

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return simpleGridCategories
    const q = searchQuery.toLowerCase()
    return simpleGridCategories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(q) ||
        cat.slug.toLowerCase().includes(q) ||
        cat.path.toLowerCase().includes(q),
    )
  }, [simpleGridCategories, searchQuery])

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Simple Products</h1>
          <p className="text-muted-foreground">
            Manage products in SIMPLE_GRID categories
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="border rounded-lg">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading categories...</div>
        ) : isError ? (
          <div className="p-8 text-center text-destructive">Failed to load categories</div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {searchQuery
              ? "No SIMPLE_GRID categories match your search"
              : "No categories are set to SIMPLE_GRID mode yet. Edit a leaf category and set its Display Mode to 'Simple Product Grid'."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Category Name</TableHead>
                <TableHead className="w-20">Type</TableHead>
                <TableHead className="w-36">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.map((category, index) => (
                <TableRow
                  key={category.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/dhthub-admin/simple-products/${category.id}`)}
                >
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">{category.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      <LayoutGrid className="h-3 w-3 mr-1" />
                      SIMPLE
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dhthub-admin/simple-products/${category.id}`)}
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Manage Products
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {filteredCategories.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredCategories.length} categor{filteredCategories.length === 1 ? "y" : "ies"}
        </div>
      )}
    </div>
  )
}
