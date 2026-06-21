"use client"

import { useState, useEffect, useRef, useMemo } from "react"
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
import { Loader2, X, Package, Trash2, Upload, ImageIcon, Star } from "lucide-react"
import { toast } from "sonner"

import {
  useCreateSimpleProduct,
  useUpdateSimpleProduct,
  useAddSimpleProductImage,
  useSimpleProductImages,
  useDeleteSimpleProductImage,
  useUpdateSimpleProductImage,
  type SimpleProductView,
  type SimpleProductImage,
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

  const isEditing = !!product

  // ── Existing images (edit mode) ──
  const {
    data: existingImages = [],
    isLoading: imagesLoading,
  } = useSimpleProductImages(
    isEditing ? categoryId : "",
    isEditing ? product!.id : "",
  )

  const addImageMutation = useAddSimpleProductImage(
    isEditing ? categoryId : "",
    isEditing ? product?.id || "" : "",
  )
  const deleteImageMutation = useDeleteSimpleProductImage(
    isEditing ? categoryId : "",
    isEditing ? product?.id || "" : "",
  )
  const updateImageMutation = useUpdateSimpleProductImage(
    isEditing ? categoryId : "",
    isEditing ? product?.id || "" : "",
  )

  // ── New image files pending upload ──
  const [newImageFiles, setNewImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // ── Form state ──
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
    }
    // Reset image selection when dialog opens
    setNewImageFiles([])
    setImagePreviews([])
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

  // ── Image file selection ──
  const handleImageFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Validate each file
    const validFiles: File[] = []
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`"${file.name}" exceeds 5MB limit`)
        continue
      }
      if (!file.type.startsWith("image/")) {
        toast.error(`"${file.name}" is not a valid image`)
        continue
      }
      validFiles.push(file)
    }

    if (validFiles.length === 0) return

    setNewImageFiles((prev) => [...prev, ...validFiles])

    // Generate previews
    const newPreviews: string[] = []
    validFiles.forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
      newPreviews.push("") // placeholder
    })

    // Reset input so same file can be selected again
    if (imageInputRef.current) imageInputRef.current.value = ""
  }

  const removeNewImage = (index: number) => {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  // ── Upload selected images to storage + create ProductImage records ──
  const uploadNewImages = async (): Promise<boolean> => {
    if (newImageFiles.length === 0) return true

    setIsUploading(true)
    let allSuccess = true

    for (let i = 0; i < newImageFiles.length; i++) {
      const file = newImageFiles[i]
      const productSku = formData.sku.trim() || product?.sku || ""
      const nextPosition = existingImages.length + i + 1

      try {
        const uploadData = new FormData()
        uploadData.append("file", file)
        uploadData.append("entityType", "product")
        uploadData.append("sku", productSku)
        uploadData.append("position", String(nextPosition))

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
        const imageUrl = result.url

        if (isEditing && product) {
          // Create ProductImage record (sortOrder is computed by the backend)
          addImageMutation.mutate({
            url: imageUrl,
            altText: formData.name || product.name,
            isPrimary: existingImages.length === 0 && i === 0,
          })
        }
      } catch (error) {
        allSuccess = false
        if (error instanceof Error) {
          toast.error(`Failed to upload "${file.name}": ${error.message}`)
        } else {
          toast.error(`Failed to upload "${file.name}"`)
        }
      }
    }

    setIsUploading(false)
    setNewImageFiles([])
    setImagePreviews([])
    return allSuccess
  }

  // ── Handle delete existing image ──
  const handleDeleteImage = (image: SimpleProductImage) => {
    deleteImageMutation.mutate(image.id)
  }

  // ── Handle set image as primary ──
  const handleSetPrimary = (image: SimpleProductImage) => {
    updateImageMutation.mutate({
      imageId: image.id,
      data: { isPrimary: true },
    })
  }

  // ── Save ──
  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Product name is required")
      return
    }

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
      }

      updateMutation.mutate(
        { productId: product.id, data: updateData },
        {
          onSuccess: async () => {
            // Upload any new images
            await uploadNewImages()
            onClose()
          },
        },
      )
    } else {
      // Create mode — upload first image as thumbnail
      let thumbnailUrl: string | undefined

      if (newImageFiles.length > 0) {
        const file = newImageFiles[0]
        try {
          const uploadData = new FormData()
          uploadData.append("file", file)
          uploadData.append("entityType", "product")
          uploadData.append("sku", formData.sku.trim() || "")
          uploadData.append("position", "1")

          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
          const response = await fetch(`${apiUrl}/v1/storage/upload`, {
            method: "POST",
            body: uploadData,
            credentials: "include",
            signal: AbortSignal.timeout(60_000),
          })

          if (response.ok) {
            const result = await response.json()
            thumbnailUrl = result.url
          }
        } catch (error) {
          // Non-fatal — product will be created without an image
          console.error("Failed to upload thumbnail image:", error)
        }
      }

      const createData: CreateSimpleProductInput = {
        name: formData.name,
        ...(formData.slug ? { slug: formData.slug } : {}),
        ...(formData.sku.trim() ? { sku: formData.sku.toUpperCase() } : {}),
        ...(formData.description.trim() ? { description: formData.description } : {}),
        ...(price !== undefined ? { price } : {}),
        ...(quantity !== undefined ? { quantity } : {}),
        ...(thumbnailUrl ? { thumbnailUrl } : {}),
      }

      createMutation.mutate(createData, {
        onSuccess: () => {
          setNewImageFiles([])
          setImagePreviews([])
          onClose()
        },
      })
    }
  }

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    addImageMutation.isPending ||
    deleteImageMutation.isPending ||
    updateImageMutation.isPending ||
    isUploading

  // ── Combined image list for display ──
  const allDisplayImages = useMemo(() => {
    const items: Array<{
      id: string
      url: string
      altText: string
      isExisting: boolean
      sortOrder: number
    }> = []

    // Existing images
    existingImages.forEach((img, idx) => {
      items.push({
        id: img.id,
        url: img.url,
        altText: img.altText || product?.name || "",
        isExisting: true,
        sortOrder: img.sortOrder ?? idx,
      })
    })

    // New image previews
    imagePreviews.forEach((preview, idx) => {
      if (preview) {
        items.push({
          id: `new-${idx}`,
          url: preview,
          altText: newImageFiles[idx]?.name || "New image",
          isExisting: false,
          sortOrder: existingImages.length + idx,
        })
      }
    })

    return items.sort((a, b) => a.sortOrder - b.sortOrder)
  }, [existingImages, imagePreviews, newImageFiles, product])

  // ── Total pending image operations ──
  const hasPendingUploads = newImageFiles.length > 0

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
            <Label htmlFor="form-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="form-name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Premium Widget"
              disabled={isPending}
            />
          </div>

          {/* Slug */}
          <div className="grid gap-2">
            <Label htmlFor="form-slug">Slug</Label>
            <Input
              id="form-slug"
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
            <Label htmlFor="form-sku">SKU</Label>
            <Input
              id="form-sku"
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
            <Label htmlFor="form-price">Price (SAR)</Label>
            <Input
              id="form-price"
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
            <Label htmlFor="form-quantity">Stock Quantity</Label>
            <Input
              id="form-quantity"
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
            <Label htmlFor="form-description">Description</Label>
            <Textarea
              id="form-description"
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
            <Label htmlFor="form-status">Status</Label>
            <select
              id="form-status"
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

          {/* ── Images Section ── */}
          <div className="grid gap-3 border-t pt-4">
            <Label>Product Images</Label>

            {/* Existing images (edit mode) */}
            {isEditing && imagesLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading images...
              </div>
            )}

            {allDisplayImages.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {allDisplayImages.map((img) => (
                  <div
                    key={img.id}
                    className="relative aspect-square rounded-md border border-border bg-muted overflow-hidden group"
                  >
                    {img.url ? (
                      <img
                        src={img.url}
                        alt={img.altText}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none"
                          e.currentTarget.nextElementSibling?.classList.remove("hidden")
                        }}
                      />
                    ) : null}
                    <div className={`absolute inset-0 flex items-center justify-center ${img.url ? "hidden" : ""}`}>
                      <Package className="h-6 w-6 text-muted-foreground/40" />
                    </div>

                    {/* Delete button (existing images only) */}
                    {img.isExisting && (
                      <button
                        type="button"
                        onClick={() => {
                          const existing = existingImages.find((e) => e.id === img.id)
                          if (existing) handleDeleteImage(existing)
                        }}
                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        disabled={deleteImageMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3 text-white" />
                      </button>
                    )}

                    {/* Remove button (new/preview images) */}
                    {!img.isExisting && (
                      <button
                        type="button"
                        onClick={() => {
                          const idx = imagePreviews.indexOf(img.url)
                          if (idx >= 0) removeNewImage(idx)
                        }}
                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    )}

                    {/* Primary badge / Set as Primary button */}
                    {img.isExisting && (() => {
                      const existingImg = existingImages.find((e) => e.id === img.id)
                      return existingImg?.isPrimary ? (
                        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-blue-600/80 text-[10px] font-medium text-white leading-tight flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 fill-white" />
                          Primary
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const existing = existingImages.find((e) => e.id === img.id)
                            if (existing) handleSetPrimary(existing)
                          }}
                          className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/50 text-[10px] font-medium text-white leading-tight opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-600 flex items-center gap-1"
                          disabled={updateImageMutation.isPending}
                        >
                          <Star className="w-2.5 h-2.5" />
                          Set Primary
                        </button>
                      )
                    })()}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-2">
                {isEditing ? "No images yet." : "You can add images after creating the product."}
              </p>
            )}

            {/* Upload new images */}
            {isEditing && (
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageFilesChange}
                      className="cursor-pointer flex-1"
                      disabled={isPending}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Accepts JPG, PNG, GIF, WEBP. Max size: 5MB each. Select multiple files at once.
                  </p>
                </div>
              </div>
            )}
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
                {isUploading
                  ? "Uploading images..."
                  : updateMutation.isPending
                    ? "Saving..."
                    : "Saving..."}
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
