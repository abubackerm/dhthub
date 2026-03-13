"use client"

import { useState, useEffect, useCallback } from "react"
import { StatCards } from "./components/stat-cards"
import { DataTable } from "./components/data-table"
import { authClient } from "@/lib/auth-client"

export interface User {
  id: string
  name: string | null
  email: string
  image: string | null | undefined
  role: UserRole
  banned: boolean
  banReason: string | null
  banExpires: string | null
  createdAt: string
  updatedAt: string
}

export type UserRole = "admin" | "super_admin" | "user" | "dealer"

function normalizeDate(value: string | Date | null | undefined): string {
  if (!value) {
    return new Date(0).toISOString()
  }

  return value instanceof Date ? value.toISOString() : value
}

function normalizeNullableDate(
  value: string | Date | null | undefined,
): string | null {
  if (!value) {
    return null
  }

  return value instanceof Date ? value.toISOString() : value
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await authClient.admin.listUsers({
        query: { limit: 100 },
      })

      if (fetchError) {
        setError(fetchError.message ?? "Failed to fetch users")
        return
      }

      const filtered = (data?.users ?? [])
        .filter((u) => !Array.isArray(u.role) && u.role !== "super_admin")
        .map((u) => ({
          id: u.id,
          name: u.name ?? null,
          email: u.email,
          image: u.image ?? null,
          role: u.role as UserRole,
          banned: Boolean(u.banned),
          banReason: u.banReason ?? null,
          banExpires: normalizeNullableDate(u.banExpires),
          createdAt: normalizeDate(u.createdAt),
          updatedAt: normalizeDate(u.updatedAt),
        }))
      setUsers(filtered)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch users")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleSetRole = async (userId: string, role: Exclude<UserRole, "super_admin">) => {
    try {
      const { error: roleError } = await authClient.admin.setRole({
        userId,
        role,
      })
      if (roleError) {
        throw new Error(roleError.message ?? "Failed to update role")
      }
      await fetchUsers()
    } catch (e) {
      throw e
    }
  }

  const handleBanUser = async (userId: string, reason?: string) => {
    try {
      const { error: banError } = await authClient.admin.banUser({
        userId,
        banReason: reason,
      })
      if (banError) {
        throw new Error(banError.message ?? "Failed to ban user")
      }
      await fetchUsers()
    } catch (e) {
      throw e
    }
  }

  const handleUnbanUser = async (userId: string) => {
    try {
      const { error: unbanError } = await authClient.admin.unbanUser({
        userId,
      })
      if (unbanError) {
        throw new Error(unbanError.message ?? "Failed to unban user")
      }
      await fetchUsers()
    } catch (e) {
      throw e
    }
  }

  const handleCreateUser = async (data: {
    name: string
    email: string
    password: string
    role: Exclude<UserRole, "super_admin">
  }) => {
    try {
      const { error: createError } = await authClient.admin.createUser({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
      })
      if (createError) {
        throw new Error(createError.message ?? "Failed to create user")
      }
      await fetchUsers()
    } catch (e) {
      throw e
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="@container/main px-4 lg:px-6">
        <StatCards users={users} loading={loading} />
      </div>

      <div className="@container/main px-4 lg:px-6 mt-8 lg:mt-12">
        {error && (
          <p className="text-sm text-destructive mb-4">{error}</p>
        )}
        <DataTable
          users={users}
          loading={loading}
          onSetRole={handleSetRole}
          onBanUser={handleBanUser}
          onUnbanUser={handleUnbanUser}
          onCreateUser={handleCreateUser}
        />
      </div>
    </div>
  )
}
