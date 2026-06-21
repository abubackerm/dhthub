"use client"

import { ArrowLeft, Package, AlertCircle, CheckCircle2, Copy, CreditCard, CheckCircle } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

import { useEnquiry, useConfirmOrder, type EnquiryView, type EnquiryStatus } from "@/lib/api/enquiry"

const statusColors: Record<EnquiryStatus, string> = {
  SUBMITTED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  QUOTED: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  AWAITING_CONFIRMATION: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  CONFIRMED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  PAYMENT_PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  PAID: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  PROCESSING: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  IN_TRANSIT: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  DELIVERED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
}

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

function StatusTimeline({ currentStatus }: { currentStatus: EnquiryStatus }) {
  const currentIndex = statusFlow.indexOf(currentStatus)

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">Order Status Timeline</h3>
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {statusFlow.map((status, index) => {
          const isActive = index <= currentIndex
          const isCurrent = status === currentStatus

          return (
            <div key={status} className="flex items-center gap-2 shrink-0">
              <div
                className={`w-3 h-3 rounded-full ${
                  isActive ? "bg-(--dht-red)" : "bg-gray-300 dark:bg-gray-600"
                }`}
              />
              <Badge
                variant={isCurrent ? "default" : "outline"}
                className={
                  isActive
                    ? statusColors[status]
                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500"
                }
              >
                {status.replace(/_/g, " ")}
              </Badge>
              {index < statusFlow.length - 1 && (
                <div
                  className={`w-8 h-0.5 ${
                    isActive ? "bg-(--dht-red)" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PaymentInfo({ order }: { order: EnquiryView }) {
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Copied to clipboard")
    } catch (error) {
      toast.error("Failed to copy")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Information
        </CardTitle>
        <CardDescription>
          Complete payment to confirm your order
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="border-(--dht-red) bg-(--dht-red)/5">
          <AlertCircle className="h-4 w-4 text-(--dht-red)" />
          <AlertTitle className="text-(--dht-red)">Payment Required</AlertTitle>
          <AlertDescription>
            Please complete payment to proceed with your order.
          </AlertDescription>
        </Alert>

        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">UPI ID</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted px-3 py-2 rounded text-sm font-mono">
                your@upi
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard("your@upi")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Reference Number</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted px-3 py-2 rounded text-sm font-mono">
                {order.enquiryNumber || `ORD-${order.id.slice(0, 8)}`}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(order.enquiryNumber || `ORD-${order.id.slice(0, 8)}`)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Amount to Pay</Label>
            <div className="text-3xl font-bold text-(--dht-red)">
              {formatCurrency(order.grandTotal)}
            </div>
          </div>

          <Separator />

          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-1">Payment Instructions:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Use the above UPI ID to make the payment</li>
              <li>Include the reference number in the payment note</li>
              <li>Payment will be verified within 24-48 hours</li>
              <li>You'll receive a confirmation email once verified</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium">{children}</p>
}

export default function OrderDetailPage() {
  const params = useParams()
  const orderId = params.id as string

  const { data: order, isLoading, error } = useEnquiry(orderId)
  const confirmMutation = useConfirmOrder()

  const canConfirmOrder = order?.status === "QUOTED"
  const showPaymentInfo = order?.status === "PAYMENT_PENDING" || order?.status === "CONFIRMED"

  const handleConfirmOrder = () => {
    confirmMutation.mutate(orderId)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-4">
          <Link href="/account/orders">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
          </Link>
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/account/orders">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Button>
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {order.enquiryNumber || `Order #${order.id.slice(0, 8)}`}
            </h1>
            <p className="text-gray-600 mt-1">
              Placed on {format(new Date(order.createdAt), "MMMM dd, yyyy 'at' HH:mm")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusColors[order.status]}>{order.status.replace(/_/g, " ")}</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Items ({order.itemCount})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.variantName || "—"}
                      </TableCell>
                      <TableCell className="text-right">{item.qty}</TableCell>
                      <TableCell className="text-right">
                        {item.price ? formatCurrency(item.price) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Status Progress</CardTitle>
              <CardDescription>Track your order's journey</CardDescription>
            </CardHeader>
            <CardContent>
              <StatusTimeline currentStatus={order.status} />
            </CardContent>
          </Card>

          {/* Payment Info (when applicable) */}
          {showPaymentInfo && <PaymentInfo order={order} />}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Items</span>
                  <span className="font-medium">{order.itemCount}</span>
                </div>
                {order.notes && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">Notes</span>
                      <p className="text-sm">{order.notes}</p>
                    </div>
                  </>
                )}
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

          {/* Actions */}
          {canConfirmOrder && (
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
                <CardDescription>
                  Your order has been quoted and is ready for confirmation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="mb-4">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Quote Ready</AlertTitle>
                  <AlertDescription>
                    Your order has been quoted. Confirm to proceed with payment.
                  </AlertDescription>
                </Alert>
                <Button
                  className="w-full"
                  onClick={handleConfirmOrder}
                  disabled={confirmMutation.isPending}
                >
                  {confirmMutation.isPending ? (
                    "Processing..."
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm Order
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Help */}
          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                If you have any questions about your order, please contact us.
              </p>
              <div className="space-y-2">
                <a
                  href="mailto:support@tek hive.com"
                  className="flex items-center gap-2 text-sm text-(--dht-red) hover:underline"
                >
                  <span>Email Support</span>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
