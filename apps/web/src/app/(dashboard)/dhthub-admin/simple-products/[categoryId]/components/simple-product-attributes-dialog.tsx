"use client"

import { useState, useMemo } from "react"
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
import {
  Loader2,
  Plus,
  Trash2,
  X,
  Check,
  ListChecks,
} from "lucide-react"
import { toast } from "sonner"
import { useQuery } from "@tanstack/react-query"

import { getAllAttributes, type AttributeView } from "@/lib/api/catalog/attributes"
import {
  useSimpleProductAttributeValues,
  useSetSimpleProductAttribute,
  useRemoveSimpleProductAttribute,
  type SimpleProductAttributeValueView,
} from "@/lib/api/catalog"
import type { SimpleProductView } from "@/lib/api/catalog/types"

interface SimpleProductAttributesDialogProps {
  categoryId: string
  product: SimpleProductView
  open: boolean
  onClose: () => void
}

export function SimpleProductAttributesDialog({
  categoryId,
  product,
  open,
  onClose,
}: SimpleProductAttributesDialogProps) {
  const { data: attributeValues = [], isLoading: valuesLoading } =
    useSimpleProductAttributeValues(categoryId, product.id)
  const setAttribute = useSetSimpleProductAttribute(categoryId, product.id)
  const removeAttribute = useRemoveSimpleProductAttribute(categoryId, product.id)

  const { data: allAttributesData, isLoading: attributesLoading } = useQuery({
    queryKey: ["all-attributes"],
    queryFn: () => getAllAttributes({ take: 200 }),
    enabled: open,
  })

  const allAttributes = allAttributesData?.data ?? []

  const [addingAttribute, setAddingAttribute] = useState(false)
  const [selectedAttributeId, setSelectedAttributeId] = useState("")

  // Editable values per attribute
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  // Attributes that are not yet assigned to this product
  const availableAttributes = useMemo(() => {
    const assignedIds = new Set(attributeValues.map((av) => av.attributeId))
    return allAttributes.filter((a) => !assignedIds.has(a.id))
  }, [allAttributes, attributeValues])

  const getAttributeDisplayValue = (av: SimpleProductAttributeValueView): string => {
    const attr = av.attribute
    switch (attr.dataType) {
      case "enum":
        return av.option?.label ?? av.optionId ?? "—"
      case "boolean":
        return av.booleanValue === true ? "Yes" : av.booleanValue === false ? "No" : "—"
      case "number":
        return av.numberValue != null ? String(av.numberValue) : av.rawValue ?? "—"
      case "text":
      default:
        return av.textValue ?? av.rawValue ?? "—"
    }
  }

  const handleAddAttribute = async () => {
    if (!selectedAttributeId) {
      toast.error("Please select an attribute")
      return
    }

    setAttribute.mutate(
      { attributeId: selectedAttributeId },
      {
        onSuccess: () => {
          setSelectedAttributeId("")
          setAddingAttribute(false)
        },
      },
    )
  }

  const handleRemoveAttribute = (attributeId: string) => {
    removeAttribute.mutate(attributeId)
  }

  const handleValueChange = (
    attributeId: string,
    value: string,
  ) => {
    setEditValues((prev) => ({ ...prev, [attributeId]: value }))
  }

  const handleSaveValue = async (av: SimpleProductAttributeValueView) => {
    const newValue = editValues[av.attributeId]
    if (newValue === undefined) return

    setSaving((prev) => ({ ...prev, [av.attributeId]: true }))

    const attr = av.attribute
    const payload: { attributeId: string } & Record<string, unknown> = {
      attributeId: av.attributeId,
    }

    switch (attr.dataType) {
      case "number": {
        const num = parseFloat(newValue)
        payload.numberValue = isNaN(num) ? null : num
        break
      }
      case "boolean":
        payload.booleanValue = newValue === "true"
        break
      case "enum":
        payload.optionId = newValue || null
        break
      case "text":
      default:
        payload.textValue = newValue || null
        break
    }

    setAttribute.mutate(payload, {
      onSettled: () => {
        setSaving((prev) => ({ ...prev, [av.attributeId]: false }))
        setEditValues((prev) => {
          const next = { ...prev }
          delete next[av.attributeId]
          return next
        })
      },
    })
  }

  const isPending =
    setAttribute.isPending || removeAttribute.isPending || valuesLoading

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Attributes — {product.name}
          </DialogTitle>
          <DialogDescription>
            Manage attribute values for this simple product.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {valuesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : attributeValues.length === 0 && !addingAttribute ? (
            <div className="text-center py-8 text-muted-foreground">
              No attributes assigned yet.
            </div>
          ) : (
            <div className="space-y-3">
              {attributeValues.map((av) => {
                const attr = av.attribute
                const isEditing = editValues[av.attributeId] !== undefined

                return (
                  <div
                    key={av.id}
                    className="border rounded-lg p-3 space-y-2 bg-card"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">{attr.name}</div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveAttribute(av.attributeId)}
                        disabled={removeAttribute.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {attr.group && (
                      <div className="text-xs text-muted-foreground">
                        Group: {attr.group}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {attr.dataType === "boolean" ? (
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                          defaultValue={
                            av.booleanValue != null
                              ? String(av.booleanValue)
                              : ""
                          }
                          onChange={(e) =>
                            handleValueChange(av.attributeId, e.target.value)
                          }
                        >
                          <option value="">—</option>
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      ) : (
                        <Input
                          type={attr.dataType === "number" ? "number" : "text"}
                          step={attr.dataType === "number" ? "any" : undefined}
                          defaultValue={
                            attr.dataType === "number" && av.numberValue != null
                              ? String(av.numberValue)
                              : av.textValue ?? av.rawValue ?? av.option?.label ?? ""
                          }
                          onChange={(e) =>
                            handleValueChange(av.attributeId, e.target.value)
                          }
                          placeholder={
                            attr.dataType === "enum"
                              ? "Enter option value"
                              : `Enter ${attr.dataType} value`
                          }
                          className="h-9"
                        />
                      )}

                      {isEditing && (
                        <Button
                          variant="default"
                          size="sm"
                          className="h-9 shrink-0"
                          onClick={() => handleSaveValue(av)}
                          disabled={saving[av.attributeId]}
                        >
                          {saving[av.attributeId] ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {addingAttribute ? (
            <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
              <Label>Add Attribute</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedAttributeId}
                onChange={(e) => setSelectedAttributeId(e.target.value)}
              >
                <option value="">Select an attribute...</option>
                {availableAttributes.map((attr) => (
                  <option key={attr.id} value={attr.id}>
                    {attr.name}
                    {attr.group ? ` (${attr.group})` : ""}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAddingAttribute(false)
                    setSelectedAttributeId("")
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddAttribute}
                  disabled={!selectedAttributeId || setAttribute.isPending}
                >
                  {setAttribute.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Plus className="h-4 w-4 mr-1" />
                  )}
                  Add
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setAddingAttribute(true)}
              disabled={attributesLoading}
            >
              <Plus className="h-4 w-4 mr-2" />
              {attributesLoading ? "Loading attributes..." : "Add Attribute"}
            </Button>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
