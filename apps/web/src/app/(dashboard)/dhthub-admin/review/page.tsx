"use client"

import { useState } from "react"
import {
  ChevronDown,
  ChevronUp,
  Check,
  X,
  MessageSquare,
  Package,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

import {
  mockReviewQueue,
  type ReviewQueueItem,
} from "@/lib/mock-data"

interface ReviewItemWithStatus extends ReviewQueueItem {
  reviewStatus?: "pending" | "approved" | "changes_requested" | "rejected"
  comment?: string
}

export default function ReviewQueuePage() {
  const [reviewItems, setReviewItems] = useState<ReviewItemWithStatus[]>(
    mockReviewQueue.map((item) => ({ ...item, reviewStatus: "pending" }))
  )

  const pendingCount = reviewItems.filter((item) => item.reviewStatus === "pending").length

  const handleApprove = (itemId: string) => {
    setReviewItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, reviewStatus: "approved" as const } : item
      )
    )
    toast.success("Product approved and will be published")

    // Remove from queue after delay
    setTimeout(() => {
      setReviewItems((prev) => prev.filter((item) => item.id !== itemId))
    }, 1000)
  }

  const handleRequestChanges = (itemId: string, comment: string) => {
    if (!comment.trim()) {
      toast.error("Please describe what needs to be changed")
      return
    }
    setReviewItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, reviewStatus: "changes_requested" as const, comment }
          : item
      )
    )
    toast.success("Change request sent to submitter")

    // Remove from queue after delay
    setTimeout(() => {
      setReviewItems((prev) => prev.filter((item) => item.id !== itemId))
    }, 1000)
  }

  const handleReject = (itemId: string, reason: string) => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for rejection")
      return
    }
    setReviewItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, reviewStatus: "rejected" as const, comment: reason }
          : item
      )
    )
    toast.success("Product rejected")

    // Remove from queue after delay
    setTimeout(() => {
      setReviewItems((prev) => prev.filter((item) => item.id !== itemId))
    }, 1000)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Review Queue</h1>
        <p className="text-muted-foreground">
          Products submitted for review before publishing
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {pendingCount} item{pendingCount !== 1 ? "s" : ""} awaiting review
        </p>
      </div>

      {reviewItems.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Check className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">All caught up!</h3>
                <p className="text-muted-foreground">
                  No products waiting for review.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviewItems.map((item) => (
            <ReviewCard
              key={item.id}
              item={item}
              onApprove={() => handleApprove(item.id)}
              onRequestChanges={(comment) => handleRequestChanges(item.id, comment)}
              onReject={(reason) => handleReject(item.id, reason)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface ReviewCardProps {
  item: ReviewItemWithStatus
  onApprove: () => void
  onRequestChanges: (comment: string) => void
  onReject: (reason: string) => void
}

function ReviewCard({ item, onApprove, onRequestChanges, onReject }: ReviewCardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showChangesInput, setShowChangesInput] = useState(false)
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [comment, setComment] = useState("")

  const handleSubmitChanges = () => {
    onRequestChanges(comment)
    setComment("")
    setShowChangesInput(false)
  }

  const handleSubmitReject = () => {
    onReject(comment)
    setComment("")
    setShowRejectInput(false)
  }

  return (
    <Card className={item.reviewStatus !== "pending" ? "opacity-50" : ""}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-muted-foreground">
                  {item.sku}
                </span>
                {item.reviewStatus === "approved" && (
                  <Badge className="bg-green-100 text-green-700">Approved</Badge>
                )}
                {item.reviewStatus === "rejected" && (
                  <Badge className="bg-red-100 text-red-700">Rejected</Badge>
                )}
                {item.reviewStatus === "changes_requested" && (
                  <Badge className="bg-amber-100 text-amber-700">Changes Requested</Badge>
                )}
              </div>
              <CardTitle className="text-lg mt-1">{item.name}</CardTitle>
              <CardDescription className="mt-1">
                {item.categoryPath}
              </CardDescription>
              <p className="text-xs text-muted-foreground mt-2">
                Submitted by {item.uploadedBy} on {item.submittedAt}
              </p>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isOpen ? (
                  <>
                    Hide Details
                    <ChevronUp className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  <>
                    View Details
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <Separator className="mb-4" />

            <div className="grid md:grid-cols-2 gap-6">
              {/* Spec Table */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Product Specifications</h4>
                <div className="grid gap-2 text-sm">
                  {Object.entries(item.attributes).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex justify-between py-2 border-b last:border-0"
                    >
                      <span className="text-muted-foreground capitalize">
                        {key.replace(/_/g, " ")}
                      </span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-medium">${item.price.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Core Info & Images */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Core Information</h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">SKU</span>
                    <span className="font-mono">{item.sku}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Category</span>
                    <span className="text-right text-xs">{item.categoryPath}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Uploaded By</span>
                    <span>{item.uploadedBy}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Batch ID</span>
                    <span className="font-mono text-xs">{item.batchId}</span>
                  </div>
                </div>

                <h4 className="text-sm font-semibold mt-6 mb-3">Product Images</h4>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="aspect-square bg-muted rounded-md flex items-center justify-center"
                    >
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {item.reviewStatus === "pending" && (
              <div className="mt-6 pt-4 border-t">
                {!showChangesInput && !showRejectInput ? (
                  <div className="flex gap-3">
                    <Button onClick={onApprove} className="flex-1">
                      <Check className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-amber-500 text-amber-600 hover:bg-amber-50"
                      onClick={() => setShowChangesInput(true)}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Request Changes
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-red-500 text-red-600 hover:bg-red-50"
                      onClick={() => setShowRejectInput(true)}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                ) : showChangesInput ? (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Describe what needs to be changed..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowChangesInput(false)
                          setComment("")
                        }}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleSubmitChanges}>
                        Submit Change Request
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Reason for rejection..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowRejectInput(false)
                          setComment("")
                        }}
                      >
                        Cancel
                      </Button>
                      <Button variant="destructive" onClick={handleSubmitReject}>
                        Confirm Rejection
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
