"use client"

import * as React from "react"
import {
  LayoutPanelLeft,
  LayoutDashboard,
  Mail,
  CheckSquare,
  MessageCircle,
  Calendar,
  Shield,
  AlertTriangle,
  Settings,
  HelpCircle,
  CreditCard,
  LayoutTemplate,
  Users,
  FolderTree,
  Wrench,
  Package,
  Upload,
  History,
  CheckCircle,
  FileCode,
} from "lucide-react"
import Link from "next/link"
import { Logo } from "@/components/logo"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { authClient } from "@/lib/auth-client"

const adminOnlyLabels = new Set([
  "Catalog Setup",
  "Products",
  "Review",
])

const adminOnlyItems = new Set(["Users"])

const allNavGroups = [
  {
    label: "Dashboards",
    items: [
      {
        title: "Dashboard 1",
        url: "/dhthub-admin",
        icon: LayoutDashboard,
      },
      {
        title: "Dashboard 2",
        url: "/dashboard-2",
        icon: LayoutPanelLeft,
      },
    ],
  },
  {
    label: "Apps",
    items: [
      {
        title: "Mail",
        url: "/mail",
        icon: Mail,
      },
      {
        title: "Tasks",
        url: "/tasks",
        icon: CheckSquare,
      },
      {
        title: "Chat",
        url: "/chat",
        icon: MessageCircle,
      },
      {
        title: "Calendar",
        url: "/calendar",
        icon: Calendar,
      },
      {
        title: "Users",
        url: "/users",
        icon: Users,
      },
    ],
  },
  {
    label: "Pages",
    items: [
      {
        title: "Landing",
        url: "/landing",
        target: "_blank",
        icon: LayoutTemplate,
      },
      {
        title: "Auth Pages",
        url: "#",
        icon: Shield,
        items: [
          { title: "Sign In 1", url: "/sign-in" },
          { title: "Sign In 2", url: "/sign-in-2" },
          { title: "Sign In 3", url: "/sign-in-3" },
          { title: "Sign Up 1", url: "/sign-up" },
          { title: "Sign Up 2", url: "/sign-up-2" },
          { title: "Sign Up 3", url: "/sign-up-3" },
          { title: "Forgot Password 1", url: "/forgot-password" },
          { title: "Forgot Password 2", url: "/forgot-password-2" },
          { title: "Forgot Password 3", url: "/forgot-password-3" },
        ],
      },
      {
        title: "Errors",
        url: "#",
        icon: AlertTriangle,
        items: [
          { title: "Unauthorized", url: "/errors/unauthorized" },
          { title: "Forbidden", url: "/errors/forbidden" },
          { title: "Not Found", url: "/errors/not-found" },
          { title: "Internal Server Error", url: "/errors/internal-server-error" },
          { title: "Under Maintenance", url: "/errors/under-maintenance" },
        ],
      },
      {
        title: "Settings",
        url: "#",
        icon: Settings,
        items: [
          { title: "User Settings", url: "/settings/user" },
          { title: "Account Settings", url: "/settings/account" },
          { title: "Plans & Billing", url: "/settings/billing" },
          { title: "Appearance", url: "/settings/appearance" },
          { title: "Notifications", url: "/settings/notifications" },
          { title: "Connections", url: "/settings/connections" },
        ],
      },
      {
        title: "FAQs",
        url: "/faqs",
        icon: HelpCircle,
      },
      {
        title: "Pricing",
        url: "/pricing",
        icon: CreditCard,
      },
    ],
  },
  {
    label: "Catalog Setup",
    items: [
      {
        title: "Categories",
        url: "/dhthub-admin/categories",
        icon: FolderTree,
      },
      {
        title: "Attributes",
        url: "/dhthub-admin/attributes",
        icon: Wrench,
      },
    ],
  },
  {
    label: "Products",
    items: [
      {
        title: "All Products",
        url: "/dhthub-admin/products",
        icon: Package,
      },
      {
        title: "Upload",
        url: "/dhthub-admin/upload",
        icon: Upload,
      },
      {
        title: "Upload History",
        url: "/dhthub-admin/upload-history",
        icon: History,
      },
    ],
  },
  {
    label: "Review",
    items: [
      {
        title: "Review Queue",
        url: "/dhthub-admin/review",
        icon: CheckCircle,
        badge: 3,
      },
      {
        title: "Schema Requests",
        url: "/dhthub-admin/schema-requests",
        icon: FileCode,
        badge: 2,
      },
    ],
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = authClient.useSession()

  const userRole = (session?.user as { role?: string } | undefined)?.role
  const [isAdmin, setIsAdmin] = React.useState(false)

  React.useEffect(() => {
    const nextIsAdmin = userRole === "admin" || userRole === "super_admin"
    setIsAdmin(nextIsAdmin)
  }, [userRole])

  const navGroups = React.useMemo(() => {
    return allNavGroups
      .filter((group) => {
        if (adminOnlyLabels.has(group.label) && !isAdmin) return false
        return true
      })
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (adminOnlyItems.has(item.title) && !isAdmin) return false
          return true
        }),
      }))
  }, [isAdmin])

  const user = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "",
    avatar: session?.user?.image || "",
  }

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dhthub-admin">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Logo size={24} className="text-current" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Dynamic Hub</span>
                  <span className="truncate text-xs">
                    {isAdmin ? "Admin Dashboard" : "Dashboard"}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => (
          <NavMain key={group.label} label={group.label} items={group.items} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
