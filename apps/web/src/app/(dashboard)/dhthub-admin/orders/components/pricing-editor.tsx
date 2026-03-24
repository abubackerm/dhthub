import { useState } from "react";
import { DollarSign, Save, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EnquiryView, EnquiryItemView, QuoteItemDto } from "@/lib/api/enquiry";
import { toast } from "sonner";

interface PricingEditorProps {
  items: EnquiryItemView[];
  isEditable: boolean;
  onSave: (items: QuoteItemDto[]) => void;
  isSaving: boolean;
}

export function PricingEditor({ items, isEditable, onSave, isSaving }: PricingEditorProps) {
  const [editingPrices, setEditingPrices] = useState(false);
  const [itemPrices, setItemPrices] = useState<Record<string, number>>({});

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "—";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const handleSavePrices = () => {
    const quoteItems: QuoteItemDto[] = Object.entries(itemPrices).map(([itemId, price]) => ({
      itemId,
      price,
    }));

    if (quoteItems.length === 0) {
      toast.error("Please enter at least one price");
      return;
    }

    onSave(quoteItems);
  };

  const handleCancel = () => {
    setEditingPrices(false);
    setItemPrices({});
  };

  const toggleEditing = () => {
    if (editingPrices) {
      handleCancel();
    } else {
      setEditingPrices(true);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Item Pricing</h3>
        </div>
        {isEditable && (
          <Button
            variant={editingPrices ? "outline" : "default"}
            size="sm"
            onClick={toggleEditing}
          >
            {editingPrices ? (
              <>
                <Clock className="h-4 w-4 mr-2" />
                Cancel
              </>
            ) : (
              <>
                <DollarSign className="h-4 w-4 mr-2" />
                Add Pricing
              </>
            )}
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Variant</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">
              {editingPrices ? "Price (₹)" : "Unit Price"}
            </TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-sm">{item.sku}</TableCell>
              <TableCell className="font-medium">{item.productName}</TableCell>
              <TableCell className="text-muted-foreground">
                {item.variantName || "—"}
              </TableCell>
              <TableCell className="text-right">{item.qty}</TableCell>
              <TableCell className="text-right">
                {editingPrices && isEditable ? (
                  <Input
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    value={itemPrices[item.id] || item.price || ""}
                    onChange={(e) =>
                      setItemPrices((prev) => ({
                        ...prev,
                        [item.id]: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-24 text-right"
                  />
                ) : (
                  <span className={item.price ? "font-medium" : "text-muted-foreground"}>
                    {formatCurrency(item.price)}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(item.total)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {editingPrices && isEditable && (
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSavePrices} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Pricing
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
