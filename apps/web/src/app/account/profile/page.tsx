"use client";

import Link from "next/link";
import { User, Package, Settings, ChevronRight, Mail, Phone, MapPin } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";
import { usePathname } from "next/navigation";

const accountNav = [
    { href: "/account/profile", icon: User, label: "Profile" },
    { href: "/account/orders", icon: Package, label: "Orders" },
    { href: "/account/settings", icon: Settings, label: "Settings" },
];

export default function ProfilePage() {
    const { data: session } = authClient.useSession();
    const pathname = usePathname();

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
                        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
                        <p className="text-gray-600 mt-1">
                            Manage your personal information and preferences
                        </p>
                    </div>

                    {/* Profile Overview Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Profile Overview</CardTitle>
                            <CardDescription>
                                Your account information and contact details
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-start gap-4 pb-4 border-b">
                                <div className="w-16 h-16 rounded-full bg-(--dht-red) flex items-center justify-center text-white text-xl font-bold">
                                    {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {session?.user?.name || "User"}
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        {session?.user?.email || "email@example.com"}
                                    </p>
                                    <div className="mt-2">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-(--dht-red)/10 text-(--dht-red)">
                                            Customer
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                                        <Mail className="h-4 w-4 text-gray-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Email</p>
                                        <p className="text-gray-900">{session?.user?.email || "Not provided"}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                                        <Phone className="h-4 w-4 text-gray-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Phone</p>
                                        <p className="text-gray-900">Not provided</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                                        <MapPin className="h-4 w-4 text-gray-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Address</p>
                                        <p className="text-gray-900">Not provided</p>
                                    </div>
                                </div>
                            </div>

                            <Separator className="my-4" />

                            <div className="flex gap-3">
                                <Button className="flex-1 bg-(--dht-red) hover:bg-(--dht-red-hover) cursor-pointer">
                                    Edit Profile
                                </Button>
                                <Button variant="outline" className="cursor-pointer">
                                    Change Password
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Account Activity Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Account Activity</CardTitle>
                            <CardDescription>
                                Recent activity and account statistics
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <p className="text-2xl font-bold text-(--dht-red)">0</p>
                                    <p className="text-xs text-gray-600 mt-1">Total Orders</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <p className="text-2xl font-bold text-(--dht-red)">SAR 0.00</p>
                                    <p className="text-xs text-gray-600 mt-1">Total Spent</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <p className="text-2xl font-bold text-(--dht-red)">0</p>
                                    <p className="text-xs text-gray-600 mt-1">Items Purchased</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
