"use client"

import { useState, useEffect, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, X, Package } from "lucide-react"
import { toast } from "sonner"

import {
  useCreateSimpleProduct,
  useUpdateSimpleProduct,
  useAddSimpleProductImage,
  type SimpleProductView,
  type CreateSimpleProductInput,
  type UpdateSimpleProductInput,
} from "@/lib/api/catalog"

interface SimpleProductFormDialogProps {
  categoryId: string
  categoryName: string
  product: SimpleProductView | null
  open: boolean
  onClose: () => void
}

interface FormData {
  name: string
  slug: string
  sku: string
  description: string
  price: string
  quantity: string
  status: string
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "product"
}

export function SimpleProductFormDialog({
  categoryId,
  categoryName,
  product,
  open,
  onClose,
}: SimpleProductFormDialogProps) {
  const createMutation = useCreateSimpleProduct(categoryId)
  const updateMutation = useUpdateSimpleProduct(categoryId)
  const addImageMutation = useAddSimpleProductImage(categoryId, product?.id || "")

  const isEditing = !!product
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")
  const [isUploading, setIsUploading] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)

  const [formData, setFormData] = useState<FormData>({
    name: "",
    slug: "",
    sku: "",
    description: "",
    price: "",
    quantity: "",
    status: "ACTIVE",
  })

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        slug: product.slug || "",
        sku: product.sku || "",
        description: product.description || "",
        price: product.price != null ? String(product.price / 100) : "",
        quantity: product.quantity != null ? String(product.quantity) : "",
        status: (product.status || "ACTIVE").toUpperCase(),
      })
      setImageFile(null)
      setImagePreview("")
      setUploadedImageUrl(null)
    } else {
      setFormData({
        name: "",
        slug: "",
        sku: "",
        description: "",
        price: "",
        quantity: "",
        status: "ACTIVE",
      })
      setImageFile(null)
      setImagePreview("")
      setUploadedImageUrl(null)
    }
  }, [product, open])

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug:
        prev.slug === "" || prev.slug === generateSlug(prev.name)
          ? generateSlug(name)
          : prev.slug,
    }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB")
      return
    }

    if (!file.type.startsWith("image/")) {
      toast.error("File must be an image")
      return
    }

    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null

    setIsUploading(true)
    try {
      const uploadData = new FormData()
      uploadData.append("file", imageFile)
      uploadData.append("entityType", "product")
      uploadData.append("sku", formData.sku.trim() || product?.sku || "")
      uploadData.append("position", "1")

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      const response = await fetch(`${apiUrl}/v1/storage/upload`, {
        method: "POST",
        body: uploadData,
        credentials: "include",
        signal: AbortSignal.timeout(60_000),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Upload failed (${response.status})`)
      }

      const result = await response.json()
      return result.url
    } catch (error) {
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        toast.error("Upload timed out. The file may be too large.")
      } else if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error("Failed to upload image")
      }
      return null
    } finally {
      setIsUploading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Product name is required")
      return
    }

    // Upload image if selected
    const imageUrl = await uploadImage()
    if (imageFile && !imageUrl) return // Upload failed

    const price = formData.price.trim()
      ? Math.round(parseFloat(formData.price) * 100)
      : undefined

    const quantity = formData.quantity.trim()
      ? parseInt(formData.quantity, 10)
      : undefined

    if (isEditing && product) {
      const updateData: UpdateSimpleProductInput = {
        ...(formData.name !== product.name ? { name: formData.name } : {}),
        ...(formData.slug !== product.slug ? { slug: formData.slug } : {}),
        ...(formData.sku !== (product.sku || "") ? { sku: formData.sku.toUpperCase() || undefined } : {}),
        ...(formData.description !== (product.description || "") ? { description: formData.description || undefined } : {}),
        ...(price !== product.price ? { price } : {}),
        ...(quantity !== product.quantity ? { quantity } : {}),
        ...(formData.status !== (product.status || "DRAFT") ? { status: formData.status.toLowerCase() } : {}),
        ...(imageUrl ? { thumbnailUrl: imageUrl } : {}),
      }

      updateMutation.mutate(
        { productId: product.id, data: updateData },
        {
          onSuccess: () => {
            // If a new image was uploaded, also create a ProductImage record
            if (imageUrl && product.id) {
              addImageMutation.mutate(
                {
                  url: imageUrl,
                  altText: formData.name,
                  isPrimary: true,
                },
                {
                  onSuccess: () => {
                    onClose()
                  },
                  onError: () => {
                    // Image record creation failed but product update succeeded
                    // Close anyway since the image URL is stored on the product
                    onClose()
                  },
                },
              )
            } else {
              onClose()
            }
          },
        },
      )
    } else {
      const createData: CreateSimpleProductInput = {
        name: formData.name,
        ...(formData.slug ? { slug: formData.slug } : {}),
        ...(formData.sku.trim() ? { sku: formData.sku.toUpperCase() } : {}),
        ...(formData.description.trim() ? { description: formData.description } : {}),
        ...(price !== undefined ? { price } : {}),
        ...(quantity !== undefined ? { quantity } : {}),
        ...(imageUrl ? { thumbnailUrl: imageUrl } : {}),
      }

      createMutation.mutate(createData, {
        onSuccess: () => {
          onClose()
        },
      })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending || addImageMutation.isPending || isUploading

  const currentImageUrl = imagePreview || product?.images?.[0]?.url || ""

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Simple Product" : "Create Simple Product"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Update product details in "${categoryName}".`
              : `Create a new simple product in "${categoryName}".`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 max-h-[65vh] overflow-y-auto pr-2">
          {/* Name */}
          <div className="grid gap-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Premium Widget"
              disabled={isPending}
            />
          </div>

          {/* Slug */}
          <div className="grid gap-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, slug: e.target.value }))
              }
              placeholder="e.g., premium-widget"
              className="font-mono text-sm"
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Auto-generated from name.
            </p>
          </div>

          {/* SKU */}
          <div className="grid gap-2">
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              value={formData.sku}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  sku: e.target.value.toUpperCase(),
                }))
              }
              placeholder="e.g., P-A1B2C3D4"
              className="font-mono text-sm"
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Optional. Auto-generated if left empty.
            </p>
          </div>

          {/* Price */}
          <div className="grid gap-2">
            <Label htmlFor="price">Price (SAR)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, price: e.target.value }))
              }
              placeholder="0.00"
              disabled={isPending}
            />
          </div>

          {/* Stock Quantity */}
          <div className="grid gap-2">
            <Label htmlFor="quantity">Stock Quantity</Label>
            <Input
              id="quantity"
              type="number"
              step="1"
              min="0"
              value={formData.quantity}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, quantity: e.target.value }))
              }
              placeholder="0"
              disabled={isPending}
            />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Optional product description"
              rows={3}
              disabled={isPending}
            />
          </div>

          {/* Status */}
          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={formData.status}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, status: e.target.value }))
              }
              disabled={isPending}
            >
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>

          {/* Image */}
          <div className="grid gap-2">
            <Label htmlFor="image">Product Image</Label>
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                {currentImageUrl ? (
                  <img
                    src={currentImageUrl}
                    alt="Product image preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none"
                    }}
                  />
                ) : (
                  <Package className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="image"
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="cursor-pointer flex-1"
                    disabled={isPending}
                  />
                  {(imagePreview || product?.images?.[0]?.url) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setImageFile(null)
                        setImagePreview("")
                        if (imageInputRef.current) imageInputRef.current.value = ""
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Accepts JPG, PNG, GIF, WEBP. Max size: 5MB.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isUploading ? "Uploading..." : isEditing ? "Saving..." : "Creating..."}
              </>
            ) : isEditing ? (
              "Save Changes"
            ) : (
              "Create Product"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
