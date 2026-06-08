"use client"

import { useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Package,
  ArrowRight,
} from "lucide-react"

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
  type CategoryTreeNode,
} from "@/lib/api/catalog"

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

function getLeafCategories(
  nodes: CategoryTreeNode[],
): CategoryTreeNode[] {
  const leaves: CategoryTreeNode[] = []

  function traverse(items: CategoryTreeNode[]) {
    for (const item of items) {
      if (item.children.length === 0) {
        leaves.push(item)
      } else {
        traverse(item.children)
      }
    }
  }

  traverse(nodes)
  return leaves
}

export default function ProductsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")

  const { data: categoryTree, isLoading, isError } = useCategoryTree()

  const flatCategories = useMemo(() => {
    if (!categoryTree) return []
    return flattenCategories(categoryTree)
  }, [categoryTree])

  const leafCategories = useMemo(() => {
    if (!categoryTree) return []
    return getLeafCategories(categoryTree)
  }, [categoryTree])

  const getParentCategory = useCallback((leafId: string) => {
    const cat = flatCategories.find(c => c.id === leafId)
    if (!cat?.path) return { name: "-", id: "" }
    const parts = cat.path.split(" > ")
    if (parts.length === 1) return { name: "Root", id: "" }
    // Find the parent category by name in the path
    const parentName = parts[parts.length - 2]
    const parentCat = flatCategories.find(c => c.name === parentName)
    return { name: parentName, id: parentCat?.id || "" }
  }, [flatCategories])

  // Group leafs by their parent category (one level above)
  const categoriesWithLeafs = useMemo(() => {
    const grouped = new Map<string, { leafs: CategoryTreeNode[]; parentId: string }>()

    function findAndGroupLeafs(nodes: CategoryTreeNode[], parentName = "") {
      for (const category of nodes) {
        const isLeaf = category.children.length === 0

        if (isLeaf) {
          // This is a leaf, group it by its parent name
          const key = parentName || "Root"
          if (!grouped.has(key)) {
            grouped.set(key, { leafs: [], parentId: category.parentId || "" })
          }
          grouped.get(key)?.leafs.push(category)
        } else {
          // This is a branch, check if any of its children are leafs
          const hasLeafChildren = category.children.some(child => child.children.length === 0)
          if (hasLeafChildren) {
            const key = category.name
            if (!grouped.has(key)) {
              grouped.set(key, { leafs: [], parentId: category.id })
            }
            // Add only leaf children
            category.children.forEach(child => {
              if (child.children.length === 0) {
                grouped.get(key)?.leafs.push(child)
              }
            })
          }
          // Recursively process children to find nested leafs
          findAndGroupLeafs(category.children, category.name)
        }
      }
    }

    if (categoryTree) {
      findAndGroupLeafs(categoryTree)
    }

    return Array.from(grouped.entries()).map(([parentName, data]) => ({
      parentName,
      leafs: data.leafs,
      id: data.parentId,
      key: parentName,
    }))
  }, [categoryTree])

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categoriesWithLeafs

    const query = searchQuery.toLowerCase()
    return categoriesWithLeafs.filter((category) => {
      return category.parentName.toLowerCase().includes(query)
    })
  }, [categoriesWithLeafs, searchQuery])

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Browse and manage products by category
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
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
      </div>

      <div className="border rounded-lg">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading categories...</div>
        ) : isError ? (
          <div className="p-8 text-center text-destructive">Failed to load categories</div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {searchQuery ? "No categories found" : "No categories yet"}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">No.</TableHead>
                <TableHead>Category Name</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.map((category, index) => (
                <TableRow
                  key={category.key || category.id || index}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    router.push(`/dhthub-admin/products/leaves/${category.id}`)
                  }}
                >
                  <TableCell className="font-mono text-sm">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-medium">
                    {category.parentName}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        router.push(`/dhthub-admin/products/leaves/${category.id}`)
                      }}
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      View Leafs ({category.leafs.length})
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
