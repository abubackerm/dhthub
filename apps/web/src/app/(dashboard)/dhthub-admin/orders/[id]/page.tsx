"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Package,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

import {
  useAdminEnquiry,
  useQuoteEnquiry,
  useUpdateAdminEnquiryStatus,
  useMarkAsPaid,
  type EnquiryStatus,
} from "@/lib/api/enquiry"
import { StatusBadge } from "../components/status-badge"
import { PricingEditor } from "../components/pricing-editor"

const statusFlow: EnquiryStatus[] = [
  "SUBMITTED",
  "IN_PROGRESS",
  "QUOTED",
  "AWAITING_CONFIRMATION",
  "CONFIRMED",
  "PAYMENT_PENDING",
  "PAID",
  "PROCESSING",
  "IN_TRANSIT",
  "DELIVERED",
]

const formatCurrency = (amount: number | null) => {
  if (amount === null) return "—"
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "SAR",
  }).format(amount)
}

export default function AdminOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string

  const { data: order, isLoading, error } = useAdminEnquiry(orderId)
  const quoteMutation = useQuoteEnquiry()
  const statusMutation = useUpdateAdminEnquiryStatus()
  const markAsPaidMutation = useMarkAsPaid()

  const [newStatus, setNewStatus] = useState<EnquiryStatus | "">("")
  const [statusNotes, setStatusNotes] = useState("")

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Button>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Order not found</h2>
              <p className="text-muted-foreground">
                The order you're looking for doesn't exist or you don't have access to it.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const canEditPrices = ["SUBMITTED", "IN_PROGRESS"].includes(order.status)
  const canMarkAsPaid = ["PAYMENT_PENDING", "CONFIRMED"].includes(order.status)

  const handleMarkAsPaid = () => {
    markAsPaidMutation.mutate(orderId)
  }

  const handleUpdateStatus = () => {
    if (!newStatus) {
      toast.error("Please select a status")
      return
    }

    statusMutation.mutate(
      { id: orderId, data: { status: newStatus, notes: statusNotes } },
      {
        onSuccess: () => {
          setNewStatus("")
          setStatusNotes("")
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {order.enquiryNumber || "Order #" + order.id.slice(0, 8)}
            </h1>
            <p className="text-muted-foreground">
              Created on {format(new Date(order.createdAt), "MMM dd, yyyy 'at' HH:mm")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Top Section: Summary + Customer Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Customer Name</Label>
                    <p className="font-medium">{order.customerName}</p>
                  </div>
                  {order.companyName && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Company</Label>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{order.companyName}</p>
                      </div>
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Email</Label>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`mailto:${order.email}`}
                        className="font-medium text-(--dht-red) hover:underline"
                      >
                        {order.email}
                      </a>
                    </div>
                  </div>
                  {order.phone && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Phone</Label>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a
                          href={`tel:${order.phone}`}
                          className="font-medium text-(--dht-red) hover:underline"
                        >
                          {order.phone}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
                {order.notes && (
                  <div className="mt-4 pt-4 border-t">
                    <Label className="text-muted-foreground flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4" />
                      Customer Notes
                    </Label>
                    <p className="text-sm">{order.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Update Status */}
            <Card>
              <CardHeader>
                <CardTitle>Update Status</CardTitle>
                <CardDescription>
                  Change the order status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">New Status</Label>
                    <Select value={newStatus} onValueChange={(v) => setNewStatus(v as EnquiryStatus)}>
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusFlow.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Add any notes about this status change..."
                      value={statusNotes}
                      onChange={(e) => setStatusNotes(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleUpdateStatus}
                    disabled={!newStatus || statusMutation.isPending}
                  >
                    {statusMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Status"
                    )}
                  </Button>
                  {canMarkAsPaid && (
                    <Button
                      variant="outline"
                      onClick={handleMarkAsPaid}
                      disabled={markAsPaidMutation.isPending}
                    >
                      {markAsPaidMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Mark as Paid
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Items</span>
                    <span className="font-medium">{order.itemCount}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Grand Total</span>
                    <span className="text-2xl font-bold text-(--dht-red)">
                      {formatCurrency(order.grandTotal)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Details */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Name</Label>
                    <p className="font-medium text-sm">{order.customerName}</p>
                  </div>
                  {order.companyName && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Company</Label>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <p className="font-medium text-sm">{order.companyName}</p>
                      </div>
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Email</Label>
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      <a
                        href={`mailto:${order.email}`}
                        className="font-medium text-sm text-(--dht-red) hover:underline"
                      >
                        {order.email}
                      </a>
                    </div>
                  </div>
                  {order.phone && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Phone</Label>
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <a
                          href={`tel:${order.phone}`}
                          className="font-medium text-sm text-(--dht-red) hover:underline"
                        >
                          {order.phone}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Order Items - Full Width */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Items
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              Current Status: <StatusBadge status={order.status} />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PricingEditor
              items={order.items}
              isEditable={canEditPrices}
              onSave={(items) => {
                quoteMutation.mutate(
                  { id: orderId, data: { items } },
                  {
                    onSuccess: () => {
                      // Success handled by mutation hook
                    },
                  },
                );
              }}
              isSaving={quoteMutation.isPending}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
