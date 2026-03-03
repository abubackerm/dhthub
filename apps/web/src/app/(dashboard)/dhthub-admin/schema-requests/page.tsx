"use client"

import * as React from "react"
import { useState } from "react"
import {
  Eye,
  Check,
  X,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info } from "lucide-react"

import {
  mockSchemaRequests,
  type SchemaChangeRequest,
  type SchemaRequestStatus,
  type SchemaChangeType,
} from "@/lib/mock-data"

function StatusBadge({ status }: { status: SchemaRequestStatus }) {
  const styles: Record<SchemaRequestStatus, { bg: string; label: string }> = {
    PENDING: { bg: "bg-amber-100 text-amber-700", label: "Pending" },
    APPROVED: { bg: "bg-green-100 text-green-700", label: "Approved" },
    REJECTED: { bg: "bg-red-100 text-red-700", label: "Rejected" },
  }

  const style = styles[status]
  return <Badge className={style.bg}>{style.label}</Badge>
}

function ChangeTypeBadge({ type }: { type: SchemaChangeType }) {
  const labels: Record<SchemaChangeType, string> = {
    ADD_ATTRIBUTE: "Add Attribute",
    MODIFY_ATTRIBUTE: "Modify Attribute",
    ADD_ALLOWED_VALUE: "Add Allowed Value",
    REMOVE_ALLOWED_VALUE: "Remove Allowed Value",
  }

  const icons: Record<SchemaChangeType, React.ReactNode> = {
    ADD_ATTRIBUTE: <Plus className="h-3 w-3 mr-1" />,
    MODIFY_ATTRIBUTE: <Pencil className="h-3 w-3 mr-1" />,
    ADD_ALLOWED_VALUE: <Plus className="h-3 w-3 mr-1" />,
    REMOVE_ALLOWED_VALUE: <Trash2 className="h-3 w-3 mr-1" />,
  }

  return (
    <Badge variant="outline" className="gap-1">
      {icons[type]}
      {labels[type]}
    </Badge>
  )
}

export default function SchemaRequestsPage() {
  const [requests, setRequests] = useState<SchemaChangeRequest[]>(mockSchemaRequests)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedRequest, setSelectedRequest] = useState<SchemaChangeRequest | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [reviewerComment, setReviewerComment] = useState("")

  const filteredRequests = requests.filter((req) => {
    if (statusFilter === "all") return true
    return req.status === statusFilter
  })

  const statusCounts = {
    all: requests.length,
    PENDING: requests.filter((r) => r.status === "PENDING").length,
    APPROVED: requests.filter((r) => r.status === "APPROVED").length,
    REJECTED: requests.filter((r) => r.status === "REJECTED").length,
  }

  const handleViewRequest = (request: SchemaChangeRequest) => {
    setSelectedRequest(request)
    setReviewerComment(request.reviewerComment || "")
    setSheetOpen(true)
  }

  const handleApprove = () => {
    if (!selectedRequest) return

    setRequests((prev) =>
      prev.map((req) =>
        req.id === selectedRequest.id
          ? { ...req, status: "APPROVED" as SchemaRequestStatus, reviewerComment }
          : req
      )
    )

    toast.success("Schema change request approved")
    setSheetOpen(false)
    setSelectedRequest(null)
    setReviewerComment("")
  }

  const handleReject = () => {
    if (!selectedRequest) return

    setRequests((prev) =>
      prev.map((req) =>
        req.id === selectedRequest.id
          ? { ...req, status: "REJECTED" as SchemaRequestStatus, reviewerComment }
          : req
      )
    )

    toast.success("Schema change request rejected")
    setSheetOpen(false)
    setSelectedRequest(null)
    setReviewerComment("")
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Schema Change Requests</h1>
        <p className="text-muted-foreground">
          Requests to modify attribute schemas for categories that already have products
        </p>
      </div>

      {/* Status Filter Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">All ({statusCounts.all})</TabsTrigger>
          <TabsTrigger value="PENDING">Pending ({statusCounts.PENDING})</TabsTrigger>
          <TabsTrigger value="APPROVED">Approved ({statusCounts.APPROVED})</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected ({statusCounts.REJECTED})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Requests Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Change Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No schema change requests found
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {request.createdAt}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{request.categoryName}</p>
                        <p className="text-xs text-muted-foreground">
                          {request.categoryPath}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{request.requestedBy}</TableCell>
                    <TableCell>
                      <ChangeTypeBadge type={request.changeType} />
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm truncate">{request.description}</p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={request.status} />
                    </TableCell>
                    <TableCell>
                      {request.status === "PENDING" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewRequest(request)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewRequest(request)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Review Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto">
          {selectedRequest && (
            <>
              <SheetHeader>
                <SheetTitle>Review Schema Change Request</SheetTitle>
                <SheetDescription>
                  Request ID: {selectedRequest.id}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Category Info */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Category</h4>
                  <p className="font-medium">{selectedRequest.categoryName}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedRequest.categoryPath}
                  </p>
                </div>

                {/* Request Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Requested By</h4>
                    <p>{selectedRequest.requestedBy}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Date</h4>
                    <p>{selectedRequest.createdAt}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">Change Type</h4>
                  <ChangeTypeBadge type={selectedRequest.changeType} />
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">Description</h4>
                  <p className="text-sm">{selectedRequest.description}</p>
                </div>

                <Separator />

                {/* Proposed Change */}
                {selectedRequest.proposedChange && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Proposed Change</h4>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm">{selectedRequest.proposedChange}</p>
                    </div>
                  </div>
                )}

                {/* Impact Note */}
                {selectedRequest.impactNote && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Impact:</strong> {selectedRequest.impactNote}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Reviewer Comment */}
                <div className="grid gap-2">
                  <Label htmlFor="comment">
                    {selectedRequest.status === "PENDING"
                      ? "Reviewer Comment (optional)"
                      : "Reviewer Comment"}
                  </Label>
                  <Textarea
                    id="comment"
                    value={reviewerComment}
                    onChange={(e) => setReviewerComment(e.target.value)}
                    placeholder="Add a comment about this decision..."
                    rows={3}
                    disabled={selectedRequest.status !== "PENDING"}
                  />
                </div>

                {/* Previous Decision */}
                {selectedRequest.status !== "PENDING" && selectedRequest.reviewerComment && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">
                      Previous decision: <StatusBadge status={selectedRequest.status} />
                    </p>
                    <p className="text-sm">{selectedRequest.reviewerComment}</p>
                  </div>
                )}

                {/* Action Buttons */}
                {selectedRequest.status === "PENDING" && (
                  <SheetFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => setSheetOpen(false)}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleReject}>
                      <X className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button onClick={handleApprove}>
                      <Check className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  </SheetFooter>
                )}

                {selectedRequest.status !== "PENDING" && (
                  <SheetFooter>
                    <Button variant="outline" onClick={() => setSheetOpen(false)}>
                      Close
                    </Button>
                  </SheetFooter>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
