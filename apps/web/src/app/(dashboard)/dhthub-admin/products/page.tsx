"use client"

import { useState, useMemo } from "react"
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  Upload,
  ChevronRight,
  Package,
} from "lucide-react"
import { toast } from "sonner"

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
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"

import {
  mockProducts,
  mockCategories,
  mockAttributes,
  getLeafCategories,
  type Product,
  type Category,
  type ProductStatus,
} from "@/lib/mock-data"

function StatusBadge({ status }: { status: ProductStatus }) {
  const styles: Record<ProductStatus, { bg: string; text: string; label: string }> = {
    DRAFT: { bg: "bg-gray-100 text-gray-700", text: "text-gray-700", label: "Draft" },
    IN_REVIEW: { bg: "bg-amber-100 text-amber-700", text: "text-amber-700", label: "In Review" },
    PUBLISHED: { bg: "bg-green-100 text-green-700", text: "text-green-700", label: "Published" },
    REJECTED: { bg: "bg-red-100 text-red-700", text: "text-red-700", label: "Rejected" },
    ARCHIVED: { bg: "bg-gray-100 text-gray-500 line-through", text: "text-gray-500", label: "Archived" },
  }

  const style = styles[status]
  return (
    <Badge variant="secondary" className={style.bg}>
      {style.label}
    </Badge>
  )
}

function StockBadge({ inStock }: { inStock: boolean }) {
  return inStock ? (
    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
      In Stock
    </Badge>
  ) : (
    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
      Out of Stock
    </Badge>
  )
}

interface ProductFormData {
  categoryId: string
  sku: string
  name: string
  basePrice: number
  inStock: boolean
  stockQty: number
  minOrderQty: number
  leadTimeDays: number
  attributes: Record<string, string>
}

const initialFormData: ProductFormData = {
  categoryId: "",
  sku: "",
  name: "",
  basePrice: 0,
  inStock: true,
  stockQty: 0,
  minOrderQty: 1,
  leadTimeDays: 3,
  attributes: {},
}

export default function ProductsPage() {
  const leafCategories = useMemo(() => getLeafCategories(mockCategories), [])
  const [products, setProducts] = useState<Product[]>(mockProducts)

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  const [detailSheetOpen, setDetailSheetOpen] = useState(false)
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [_isEditing, setIsEditing] = useState(false)
  const [addStep, setAddStep] = useState<1 | 2>(1)

  const [formData, setFormData] = useState<ProductFormData>(initialFormData)

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        searchQuery === "" ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus =
        statusFilter === "all" || product.status === statusFilter

      const matchesCategory =
        categoryFilter === "all" || product.categoryId === categoryFilter

      return matchesSearch && matchesStatus && matchesCategory
    })
  }, [products, searchQuery, statusFilter, categoryFilter])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: products.length,
      DRAFT: 0,
      IN_REVIEW: 0,
      PUBLISHED: 0,
      REJECTED: 0,
      ARCHIVED: 0,
    }
    products.forEach((p) => {
      counts[p.status] = (counts[p.status] || 0) + 1
    })
    return counts
  }, [products])

  const selectedCategoryAttributes = useMemo(() => {
    if (!formData.categoryId) return []
    return mockAttributes.filter((attr) => attr.categoryId === formData.categoryId)
  }, [formData.categoryId])

  const selectedCategory = useMemo(() => {
    if (!formData.categoryId) return null
    const findCategory = (cats: Category[], id: string): Category | undefined => {
      for (const cat of cats) {
        if (cat.id === id) return cat
        const found = findCategory(cat.children, id)
        if (found) return found
      }
    }
    return findCategory(mockCategories, formData.categoryId)
  }, [formData.categoryId])

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product)
    setIsEditing(false)
    setDetailSheetOpen(true)
  }

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product)
    setIsEditing(true)
    setDetailSheetOpen(true)
  }

  const handleDeleteProduct = (product: Product) => {
    setProducts((prev) => prev.filter((p) => p.id !== product.id))
    toast.success(`Product "${product.name}" deleted`)
  }

  const handleOpenAddSheet = () => {
    setFormData(initialFormData)
    setAddStep(1)
    setAddSheetOpen(true)
  }

  const handleCategorySelect = (categoryId: string) => {
    const attrs = mockAttributes.filter((attr) => attr.categoryId === categoryId)
    const defaultAttrs: Record<string, string> = {}
    attrs.forEach((attr) => {
      defaultAttrs[attr.slug] = ""
    })

    setFormData((prev) => ({
      ...prev,
      categoryId,
      attributes: defaultAttrs,
    }))
  }

  const handleAttributeChange = (slug: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [slug]: value,
      },
    }))
  }

  const handleSaveProduct = () => {
    if (!formData.sku.trim() || !formData.name.trim()) {
      toast.error("SKU and Name are required")
      return
    }

    const category = selectedCategory
    if (!category) {
      toast.error("Please select a category")
      return
    }

    const newProduct: Product = {
      id: `p${Date.now()}`,
      sku: formData.sku,
      name: formData.name,
      categoryId: formData.categoryId,
      categoryPath: category ? getCategoryPath(category, mockCategories) : "",
      status: "DRAFT",
      basePrice: formData.basePrice,
      inStock: formData.inStock,
      stockQty: formData.stockQty,
      minOrderQty: formData.minOrderQty,
      leadTimeDays: formData.leadTimeDays,
      uploadedBy: "Current User",
      createdAt: new Date().toISOString().split("T")[0],
      attributes: formData.attributes,
    }

    setProducts((prev) => [...prev, newProduct])
    toast.success("Product saved as draft")
    setAddSheetOpen(false)
    setFormData(initialFormData)
    setAddStep(1)
  }

  const handleSubmitForReview = () => {
    if (selectedProduct) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === selectedProduct.id ? { ...p, status: "IN_REVIEW" as ProductStatus } : p
        )
      )
      setSelectedProduct({ ...selectedProduct, status: "IN_REVIEW" as ProductStatus })
      toast.success("Product submitted for review")
    }
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
          <Button variant="outline" onClick={() => toast.info("Navigate to Upload page")}>
            <Upload className="h-4 w-4 mr-2" />
            Bulk Upload
          </Button>
          <Button onClick={handleOpenAddSheet}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by SKU or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {leafCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {getCategoryPath(cat, mockCategories)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">All ({statusCounts.all})</TabsTrigger>
            <TabsTrigger value="DRAFT">Draft ({statusCounts.DRAFT})</TabsTrigger>
            <TabsTrigger value="IN_REVIEW">In Review ({statusCounts.IN_REVIEW})</TabsTrigger>
            <TabsTrigger value="PUBLISHED">Published ({statusCounts.PUBLISHED})</TabsTrigger>
            <TabsTrigger value="REJECTED">Rejected ({statusCounts.REJECTED})</TabsTrigger>
            <TabsTrigger value="ARCHIVED">Archived ({statusCounts.ARCHIVED})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Products Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="w-20">Price</TableHead>
              <TableHead className="w-24">Stock</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-28">Uploaded By</TableHead>
              <TableHead className="w-28">Date</TableHead>
              <TableHead className="w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow
                  key={product.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleViewProduct(product)}
                >
                  <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {product.categoryPath}
                  </TableCell>
                  <TableCell>${product.basePrice.toFixed(2)}</TableCell>
                  <TableCell>
                    <StockBadge inStock={product.inStock} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={product.status} />
                  </TableCell>
                  <TableCell className="text-sm">{product.uploadedBy}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {product.createdAt}
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
                        className="h-8 w-8"
                        onClick={() => handleEditProduct(product)}
                      >
                        <Pencil className="h-4 w-4" />
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
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Product Detail Sheet */}
      <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
        <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto">
          {selectedProduct && (
            <>
              <SheetHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <SheetTitle className="font-mono text-lg">
                      {selectedProduct.sku}
                    </SheetTitle>
                    <SheetDescription className="text-base font-medium text-foreground mt-1">
                      {selectedProduct.name}
                    </SheetDescription>
                  </div>
                  <StatusBadge status={selectedProduct.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedProduct.categoryPath}
                </p>
              </SheetHeader>

              {selectedProduct.status === "REJECTED" && selectedProduct.rejectionReason && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>
                    <strong>Rejection Reason:</strong> {selectedProduct.rejectionReason}
                    <Button size="sm" variant="outline" className="ml-2 mt-2">
                      Edit & Resubmit
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <div className="mt-6 space-y-6">
                {/* Core Info */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Core Info</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>
                      <span className="ml-2">{selectedProduct.name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">SKU:</span>
                      <span className="ml-2 font-mono">{selectedProduct.sku}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Price:</span>
                      <span className="ml-2">${selectedProduct.basePrice.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">In Stock:</span>
                      <span className="ml-2">
                        {selectedProduct.inStock ? "Yes" : "No"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Stock Qty:</span>
                      <span className="ml-2">{selectedProduct.stockQty ?? "-"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Min Order:</span>
                      <span className="ml-2">{selectedProduct.minOrderQty ?? 1}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Lead Time:</span>
                      <span className="ml-2">{selectedProduct.leadTimeDays ?? "-"} days</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Attributes */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Attributes</h4>
                  <div className="grid gap-2 text-sm">
                    {Object.entries(selectedProduct.attributes).map(([key, value]) => (
                      <div key={key} className="flex justify-between py-1 border-b last:border-0">
                        <span className="text-muted-foreground capitalize">
                          {key.replace(/_/g, " ")}:
                        </span>
                        <span>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Images Placeholder */}
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

              {selectedProduct.status === "DRAFT" && (
                <SheetFooter className="mt-6">
                  <Button onClick={handleSubmitForReview} className="w-full">
                    Submit for Review
                  </Button>
                </SheetFooter>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Product Sheet */}
      <Sheet open={addSheetOpen} onOpenChange={setAddSheetOpen}>
        <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add Product</SheetTitle>
            <SheetDescription>
              {addStep === 1
                ? "Select a category for the new product"
                : "Enter product details"}
            </SheetDescription>
          </SheetHeader>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mt-4 mb-6">
            <div
              className={`flex items-center gap-2 ${
                addStep >= 1 ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  addStep >= 1 ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                1
              </div>
              <span className="text-sm">Category</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <div
              className={`flex items-center gap-2 ${
                addStep >= 2 ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  addStep >= 2 ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                2
              </div>
              <span className="text-sm">Details</span>
            </div>
          </div>

          {addStep === 1 && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>Select Category</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={handleCategorySelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Search and select a leaf category" />
                  </SelectTrigger>
                  <SelectContent>
                    {leafCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {getCategoryPath(cat, mockCategories)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCategory && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">{selectedCategory.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {getCategoryPath(selectedCategory, mockCategories)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {selectedCategory.productCount} existing products
                  </p>

                  {selectedCategoryAttributes.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-medium">Required attributes:</p>
                      {selectedCategoryAttributes.filter((a) => a.isRequired).map((attr) => (
                        <p key={attr.id} className="text-xs text-muted-foreground">
                          {attr.name}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <SheetFooter>
                <Button
                  variant="outline"
                  onClick={() => setAddSheetOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setAddStep(2)}
                  disabled={!formData.categoryId}
                >
                  Next
                </Button>
              </SheetFooter>
            </div>
          )}

          {addStep === 2 && (
            <div className="space-y-4">
              {/* Fixed Fields */}
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="sku">
                    SKU <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, sku: e.target.value }))
                    }
                    placeholder="e.g., 91257A123"
                    className="font-mono"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="name">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., Hex Head Screw 1/4-20 x 1in"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="price">
                      Base Price <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.basePrice}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          basePrice: parseFloat(e.target.value) || 0,
                        }))
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="stockQty">Stock Qty</Label>
                    <Input
                      id="stockQty"
                      type="number"
                      value={formData.stockQty}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          stockQty: parseInt(e.target.value) || 0,
                        }))
                      }
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="inStock">In Stock</Label>
                  <Switch
                    id="inStock"
                    checked={formData.inStock}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, inStock: checked }))
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="minOrder">Min Order Qty</Label>
                    <Input
                      id="minOrder"
                      type="number"
                      value={formData.minOrderQty}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          minOrderQty: parseInt(e.target.value) || 1,
                        }))
                      }
                      placeholder="1"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="leadTime">Lead Time (days)</Label>
                    <Input
                      id="leadTime"
                      type="number"
                      value={formData.leadTimeDays}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          leadTimeDays: parseInt(e.target.value) || 3,
                        }))
                      }
                      placeholder="3"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Attributes */}
              {selectedCategoryAttributes.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Product Attributes</h4>
                    <div className="grid gap-4">
                      {selectedCategoryAttributes.map((attr) => (
                        <div key={attr.id} className="grid gap-2">
                          <Label>
                            {attr.name}
                            {attr.isRequired && (
                              <span className="text-destructive ml-1">*</span>
                            )}
                            {attr.unit && (
                              <span className="text-muted-foreground ml-1">
                                ({attr.unit})
                              </span>
                            )}
                          </Label>
                          {attr.helpText && (
                            <p className="text-xs text-muted-foreground -mt-1">
                              {attr.helpText}
                            </p>
                          )}
                          {attr.dataType === "SELECT" ? (
                            <Select
                              value={formData.attributes[attr.slug] || ""}
                              onValueChange={(value) =>
                                handleAttributeChange(attr.slug, value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={`Select ${attr.name.toLowerCase()}`} />
                              </SelectTrigger>
                              <SelectContent>
                                {attr.allowedValues.map((value) => (
                                  <SelectItem key={value} value={value}>
                                    {value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : attr.dataType === "NUMBER" ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={formData.attributes[attr.slug] || ""}
                                onChange={(e) =>
                                  handleAttributeChange(attr.slug, e.target.value)
                                }
                                placeholder={`Enter ${attr.name.toLowerCase()}`}
                              />
                              {attr.unit && (
                                <span className="text-sm text-muted-foreground w-8">
                                  {attr.unit}
                                </span>
                              )}
                            </div>
                          ) : attr.dataType === "BOOLEAN" ? (
                            <Switch
                              checked={formData.attributes[attr.slug] === "true"}
                              onCheckedChange={(checked) =>
                                handleAttributeChange(attr.slug, checked ? "true" : "false")
                              }
                            />
                          ) : (
                            <Input
                              value={formData.attributes[attr.slug] || ""}
                              onChange={(e) =>
                                handleAttributeChange(attr.slug, e.target.value)
                              }
                              placeholder={`Enter ${attr.name.toLowerCase()}`}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <SheetFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setAddStep(1)}>
                  Back
                </Button>
                <Button onClick={handleSaveProduct}>Save as Draft</Button>
              </SheetFooter>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function getCategoryPath(category: Category, categories: Category[]): string {
  const parts: string[] = [category.name]
  let current = category

  const findParent = (cats: Category[], id: string): Category | undefined => {
    for (const cat of cats) {
      if (cat.children.some((c) => c.id === id)) return cat
      const found = findParent(cat.children, id)
      if (found) return found
    }
  }

  while (current.parentId) {
    const parent = findParent(categories, current.id)
    if (parent) {
      parts.unshift(parent.name)
      current = parent
    } else {
      break
    }
  }

  return parts.join(" > ")
}
