"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Users,
  FolderTree,
  Wrench,
  Package,
  Upload,
  History,
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
])

const adminOnlyItems = new Set(["Users"])

const allNavGroups = [
  {
    label: "Dashboards",
    items: [
      {
        title: "Dashboard",
        url: "/dhthub-admin",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Apps",
    items: [
      {
        title: "Users",
        url: "/users",
        icon: Users,
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
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = authClient.useSession()

  const userRole = (session?.user as { role?: string } | undefined)?.role
  const [isAdmin, setIsAdmin] = React.useState(false)
  const [user, setUser] = React.useState({
    name: "User",
    email: "",
    avatar: "",
  })

  React.useEffect(() => {
    const nextIsAdmin = userRole === "admin" || userRole === "super_admin"
    setIsAdmin(nextIsAdmin)
  }, [userRole])

  React.useEffect(() => {
    setUser({
      name: session?.user?.name || "User",
      email: session?.user?.email || "",
      avatar: session?.user?.image || "",
    })
  }, [session])

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
