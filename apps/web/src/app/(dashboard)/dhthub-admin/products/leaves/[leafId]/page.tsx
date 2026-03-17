"use client"

import { useState, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft,
  Search,
  Eye,
  Package,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
  targetId: string,
): CategoryTreeNode[] {
  const leaves: CategoryTreeNode[] = []

  // Find the target category and collect its leaf children
  function findTargetAndCollectLeaves(items: CategoryTreeNode[]): boolean {
    for (const item of items) {
      if (item.id === targetId) {
        // Found the target category, collect all leaf children
        collectLeaves(item.children)
        return true
      }
      if (item.children.length > 0) {
        if (findTargetAndCollectLeaves(item.children)) {
          return true
        }
      }
    }
    return false
  }

  function collectLeaves(items: CategoryTreeNode[]) {
    for (const item of items) {
      if (item.children.length === 0) {
        // This is a leaf (no children)
        leaves.push(item)
      } else {
        // This is a branch, check if we want nested leafs or just direct children
        // For now, we only want direct leaf children (1 level deep)
        // If you want all nested leafs, uncomment the recursive call below
        // collectLeaves(item.children)
      }
    }
  }

  findTargetAndCollectLeaves(nodes)
  return leaves
}

export default function LeafsPage() {
  const router = useRouter()
  const params = useParams()
  const leafId = params.leafId as string

  const [searchQuery, setSearchQuery] = useState("")

  const { data: categoryTree } = useCategoryTree()

  const leafCategories = useMemo(() => {
    if (!categoryTree) return []
    return getLeafCategories(categoryTree, leafId)
  }, [categoryTree, leafId])

  const flatCategories = useMemo(() => {
    if (!categoryTree) return []
    return flattenCategories(categoryTree)
  }, [categoryTree])

  const leafCategory = useMemo(() => {
    if (!categoryTree) return null

    function findNode(nodes: CategoryTreeNode[], targetId: string): CategoryTreeNode | null {
      for (const node of nodes) {
        if (node.id === targetId) return node
        if (node.children.length > 0) {
          const found = findNode(node.children, targetId)
          if (found) return found
        }
      }
      return null
    }

    return findNode(categoryTree, leafId)
  }, [categoryTree, leafId])

  const getCategoryPath = useMemo(() => {
    return (categoryId: string) => {
      const cat = flatCategories.find(c => c.id === categoryId)
      return cat?.path || "-"
    }
  }, [flatCategories])

  // Filter leafs based on search
  const filteredLeafs = useMemo(() => {
    if (!leafCategories.length) return []

    const query = searchQuery.toLowerCase().trim()
    if (!query) return leafCategories

    return leafCategories.filter(
      (leaf) =>
        leaf.name.toLowerCase().includes(query) ||
        leaf.slug.toLowerCase().includes(query)
    )
  }, [leafCategories, searchQuery])

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
              placeholder="Search leafs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      <div className="border rounded-lg">
        {!categoryTree ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : filteredLeafs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {searchQuery ? "No leafs found" : "No leafs under this category"}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">No.</TableHead>
                <TableHead>Leaf Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeafs.map((leaf, index) => (
                <TableRow key={leaf.id}>
                  <TableCell className="font-mono text-sm">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-medium">
                    {leaf.name}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {leaf.slug}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          window.location.href = `/dhthub-admin/products/leaves/${leaf.id}/cells`
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Cells
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {filteredLeafs.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredLeafs.length} leaf{filteredLeafs.length === 1 ? "" : "s"}
        </div>
      )}
    </div>
  )
}
