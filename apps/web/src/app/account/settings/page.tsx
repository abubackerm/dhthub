"use client";

import Link from "next/link";
import { User, Package, Settings, ChevronRight, Bell, Shield, CreditCard, Globe } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";

const accountNav = [
    { href: "/account/profile", icon: User, label: "Profile" },
    { href: "/account/orders", icon: Package, label: "Orders" },
    { href: "/account/settings", icon: Settings, label: "Settings" },
];

const settingsSections = [
    {
        title: "Preferences",
        description: "Manage your account preferences",
        items: [
            { icon: Bell, label: "Notifications", href: "#", description: "Manage your notification preferences" },
            { icon: Globe, label: "Language & Region", href: "#", description: "Set your language and region" },
        ],
    },
    {
        title: "Security",
        description: "Keep your account secure",
        items: [
            { icon: Shield, label: "Password & Security", href: "#", description: "Update password and security settings" },
            { icon: Shield, label: "Two-Factor Authentication", href: "#", description: "Add an extra layer of security" },
        ],
    },
    {
        title: "Payments",
        description: "Manage payment methods",
        items: [
            { icon: CreditCard, label: "Payment Methods", href: "#", description: "Manage saved payment methods" },
            { icon: CreditCard, label: "Billing History", href: "#", description: "View your billing history" },
        ],
    },
];

export default function SettingsPage() {
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
                        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                        <p className="text-gray-600 mt-1">
                            Manage your account settings and preferences
                        </p>
                    </div>

                    {/* Settings Sections */}
                    {settingsSections.map((section, idx) => (
                        <Card key={idx}>
                            <CardHeader>
                                <CardTitle>{section.title}</CardTitle>
                                <CardDescription>{section.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="divide-y">
                                    {section.items.map((item, itemIdx) => {
                                        const Icon = item.icon;
                                        return (
                                            <Link
                                                key={itemIdx}
                                                href={item.href}
                                                className="flex items-center justify-between py-4 group hover:bg-gray-50 -mx-4 px-4 rounded-lg transition-colors"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-(--dht-red)/10 flex items-center justify-center transition-colors">
                                                        <Icon className="h-5 w-5 text-gray-600 group-hover:text-(--dht-red) transition-colors" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-gray-900 group-hover:text-(--dht-red) transition-colors">
                                                            {item.label}
                                                        </h3>
                                                        <p className="text-sm text-gray-500">{item.description}</p>
                                                    </div>
                                                </div>
                                                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-(--dht-red) transition-colors" />
                                            </Link>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {/* Danger Zone */}
                    <Card className="border-red-200">
                        <CardHeader>
                            <CardTitle className="text-red-600">Danger Zone</CardTitle>
                            <CardDescription>
                                Irreversible and destructive actions
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                                <div>
                                    <h3 className="font-semibold text-gray-900">Delete Account</h3>
                                    <p className="text-sm text-gray-500">
                                        Permanently delete your account and all data
                                    </p>
                                </div>
                                <Button variant="destructive" className="cursor-pointer">
                                    Delete Account
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
