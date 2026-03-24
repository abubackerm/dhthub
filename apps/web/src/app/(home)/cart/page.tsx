"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCart, useUpdateCartItem, useRemoveFromCart } from "@/lib/api/cart";
import { createEnquiryFromCart } from "@/lib/api/enquiry";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";

export default function CartPage() {
  const { data: cart, isLoading, error } = useCart();
  const updateCartItem = useUpdateCartItem();
  const removeFromCart = useRemoveFromCart();
  const queryClient = useQueryClient();
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  const submitCart = useMutation({
    mutationFn: async () => {
      return createEnquiryFromCart({});
    },
    onSuccess: (enquiry) => {
      toast.success(`Enquiry ${enquiry.enquiryNumber} submitted successfully!`);
      setIsConfirmDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      window.location.href = `/account/orders/${enquiry.id}`;
    },
    onError: (error: Error) => {
      console.error("Failed to submit cart:", error);
      toast.error("Failed to submit cart");
      setIsConfirmDialogOpen(false);
    },
  });

  const handleSubmitEnquiry = () => {
    setIsConfirmDialogOpen(true);
  };

  const handleQuantityChange = (itemId: string, newQty: number) => {
    if (newQty < 1) return;
    updateCartItem.mutate({ id: itemId, qty: newQty });
  };

  const handleRemoveItem = (itemId: string) => {
    removeFromCart.mutate(itemId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
          <p className="mt-4 text-muted-foreground">Loading cart...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading cart</p>
          <Link href="/products">
            <Button variant="outline">Continue Shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <ShoppingBag className="w-24 h-24 mx-auto text-muted-foreground mb-6" />
          <h1 className="text-3xl font-bold mb-4">Your cart is empty</h1>
          <p className="text-muted-foreground mb-8">
            Looks like you haven't added any items to your cart yet.
          </p>
          <Link href="/products">
            <Button className="bg-(--dht-red) hover:bg-(--dht-red-hover)">
              Start Shopping
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold mb-8">Shopping Cart ({cart.itemCount} items)</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-3">
            {cart.items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg shadow-sm p-4 flex items-center gap-4"
              >
                {/* Product Image */}
                {item.image && (
                  <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.productName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Product Details */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/products/${item.variantId}`}
                    className="font-semibold hover:text-(--dht-red) transition-colors line-clamp-1"
                  >
                    {item.productName}
                  </Link>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                    <span className="line-clamp-1">
                      {item.variantName || item.sku}
                    </span>
                    {item.variantName && item.sku && (
                      <span className="text-muted-foreground/50">•</span>
                    )}
                    {item.sku && (
                      <span>SKU: {item.sku}</span>
                    )}
                  </div>
                </div>

                {/* Quantity and Stock Status */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center border rounded-md">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-none"
                      onClick={() =>
                        handleQuantityChange(item.id, item.qty - 1)
                      }
                      disabled={item.qty <= 1}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <Input
                      type="number"
                      value={item.qty}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (value >= 1 && value <= 10000) {
                          handleQuantityChange(item.id, value);
                        }
                      }}
                      className="w-14 h-8 rounded-none border-0 text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      min="1"
                      max="10000"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-none"
                      onClick={() =>
                        handleQuantityChange(item.id, item.qty + 1)
                      }
                      disabled={item.qty >= 10000}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Stock Status */}
                  {!item.isAvailable && (
                    <span className="text-xs text-red-600 font-medium whitespace-nowrap">
                      Out of Stock
                    </span>
                  )}
                  {item.availableStock < item.qty && item.isAvailable && (
                    <span className="text-xs text-orange-600 font-medium whitespace-nowrap">
                      Only {item.availableStock} left
                    </span>
                  )}
                </div>

                {/* Remove Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-red-600 hover:bg-red-50 h-8 w-8 shrink-0"
                  onClick={() => handleRemoveItem(item.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Cart Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
              <h2 className="text-xl font-semibold mb-4">Order Summary</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">
                    {cart.items.length} items
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated Delivery</span>
                  <span className="font-medium">2-3 business days</span>
                </div>
              </div>

              <hr className="my-4" />

              <Button
                className="w-full bg-(--dht-red) hover:bg-(--dht-red-hover) h-12 text-base"
                onClick={handleSubmitEnquiry}
                disabled={submitCart.isPending}
              >
                {submitCart.isPending ? "Submitting..." : "Submit as Enquiry"}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>

              <div className="mt-4 text-xs text-muted-foreground text-center">
                By submitting, you agree to our terms and conditions.
              </div>

              <div className="mt-6">
                <Link href="/products" className="block text-center text-sm text-(--dht-red) hover:text-(--dht-red-hover)">
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Enquiry Submission</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit {cart?.itemCount || 0} item{cart?.itemCount !== 1 ? 's' : ''} as an enquiry?
              <br />
              <br />
              Our team will review your enquiry and provide a quote with pricing details.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfirmDialogOpen(false)}
              disabled={submitCart.isPending}
            >
              Cancel
            </Button>
            <Button
              className="bg-(--dht-red) hover:bg-(--dht-red-hover)"
              onClick={() => submitCart.mutate()}
              disabled={submitCart.isPending}
            >
              {submitCart.isPending ? "Submitting..." : "Confirm & Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
