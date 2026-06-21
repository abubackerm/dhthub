"use client";

import Link from "next/link";
import { User, Package, Settings, ChevronRight, Search, Filter, Calendar, Package2, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { usePathname } from "next/navigation";
import { useMyEnquiries, type EnquiryStatus } from "@/lib/api/enquiry";
import { format } from "date-fns";

interface Order {
  id: string;
  date: string;
  status: EnquiryStatus;
  total: number | null;
  items: number;
}

const accountNav = [
    { href: "/account/profile", icon: User, label: "Profile" },
    { href: "/account/orders", icon: Package, label: "Orders" },
    { href: "/account/settings", icon: Settings, label: "Settings" },
];

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

const formatCurrency = (amount: number | null) => {
  if (amount === null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "SAR",
  }).format(amount);
};

function getStatusBadge(status: EnquiryStatus) {
    return (
        <Badge className={statusColors[status]}>
            {status.replace(/_/g, " ")}
        </Badge>
    );
}

export default function OrdersPage() {
    const pathname = usePathname();
    const { data: orders = [], isLoading, error } = useMyEnquiries();

    const inProgressCount = orders.filter((o) => 
      ["SUBMITTED", "IN_PROGRESS", "QUOTED", "AWAITING_CONFIRMATION", "CONFIRMED", "PAYMENT_PENDING"].includes(o.status)
    ).length;
    const deliveredCount = orders.filter((o) => 
      ["COMPLETED", "PAID", "PROCESSING"].includes(o.status)
    ).length;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar Navigation */}
                <aside className="lg:col-span-1">
                    <Card className="sticky top-24">
                        <CardContent className="p-4">
                            <nav className="space-y-1">
                                {accountNav.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                                isActive
                                                    ? "bg-(--dht-red) text-white"
                                                    : "text-gray-700 hover:bg-gray-100"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Icon className="h-4 w-4" />
                                                {item.label}
                                            </div>
                                            <ChevronRight className="h-4 w-4 opacity-70" />
                                        </Link>
                                    );
                                })}
                            </nav>
                        </CardContent>
                    </Card>
                </aside>

                {/* Main Content */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Page Header */}
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
                        <p className="text-gray-600 mt-1">
                            View and track your order history
                        </p>
                    </div>

                    {/* Search and Filter */}
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Search orders by ID..."
                                        className="pl-10"
                                    />
                                </div>
                                <Button variant="outline" className="gap-2 cursor-pointer">
                                    <Filter className="h-4 w-4" />
                                    Filter
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Orders List */}
                    {isLoading ? (
                      <Card>
                        <CardContent className="flex items-center justify-center p-12">
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </CardContent>
                      </Card>
                    ) : error ? (
                      <Card>
                        <CardContent className="flex items-center justify-center p-12">
                          <div className="text-center">
                            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Failed to load orders</h3>
                            <p className="text-muted-foreground">
                              {(error as Error).message}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ) : orders.length > 0 ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Order History</CardTitle>
                                <CardDescription>
                                    A list of your recent orders and their status
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {orders.map((order) => (
                                        <Link
                                          key={order.id}
                                          href={`/account/orders/${order.id}`}
                                          className="block"
                                        >
                                            <div className="p-4 border rounded-lg hover:border-(--dht-red) transition-colors cursor-pointer">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex items-start gap-4 flex-1">
                                                        <div className="w-12 h-12 rounded-lg bg-(--dht-red)/10 flex items-center justify-center">
                                                            <Package2 className="h-6 w-6 text-(--dht-red)" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h3 className="font-semibold text-gray-900">
                                                                  {order.enquiryNumber || `Order #${order.id.slice(0, 8)}`}
                                                                </h3>
                                                                {getStatusBadge(order.status)}
                                                            </div>
                                                            <p className="text-sm text-gray-500 flex items-center gap-2">
                                                                <Calendar className="h-3 w-3" />
                                                                {format(new Date(order.createdAt), "MMM dd, yyyy")}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="font-semibold text-gray-900">{formatCurrency(order.grandTotal)}</p>
                                                        <p className="text-xs text-gray-500">{order.itemCount} items</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                    <Package className="h-10 w-10 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders yet</h3>
                                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                                    You haven't placed any orders yet. Start shopping to see your order history here.
                                </p>
                                <Link href="/products">
                                    <Button className="bg-(--dht-red) hover:bg-(--dht-red-hover) cursor-pointer">
                                        Start Shopping
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    )}

                    {/* Order Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                        <Package className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
                                        <p className="text-xs text-gray-500">Total Orders</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                                        <Package2 className="h-5 w-5 text-yellow-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-gray-900">{inProgressCount}</p>
                                        <p className="text-xs text-gray-500">In Progress</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                                        <Package className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-gray-900">{deliveredCount}</p>
                                        <p className="text-xs text-gray-500">Completed</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
