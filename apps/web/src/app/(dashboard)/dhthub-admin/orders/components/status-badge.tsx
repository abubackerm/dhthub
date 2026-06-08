import { Badge } from "@/components/ui/badge";
import type { EnquiryStatus } from "@/lib/api/enquiry";

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
};

interface StatusBadgeProps {
  status: EnquiryStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge className={`${statusColors[status]} ${className || ""}`}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
