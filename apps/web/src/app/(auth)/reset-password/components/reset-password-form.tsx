"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth-client"
import { Loader2 } from "lucide-react"

export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const error_param = searchParams.get("error")

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(
    error_param === "INVALID_TOKEN" ? "This reset link is invalid or has expired." : null
  )
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match")
      return
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    if (!token) {
      setError("Invalid reset link. Please request a new one.")
      return
    }

    setIsSubmitting(true)

    try {
      const { error: resetError } = await authClient.resetPassword({
        newPassword,
        token,
      })

      if (resetError) {
        setError(resetError.message ?? "Unable to reset password. Please try again.")
        return
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!token && !error_param) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="border-(--dht-red)/20 bg-(--dht-gray-light)">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-(--dht-dark)">Invalid Link</CardTitle>
            <CardDescription className="text-(--dht-gray)">
              This password reset link is invalid. Please request a new one.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <a href="/forgot-password" className="text-(--dht-red) hover:text-(--dht-red-hover) text-sm underline underline-offset-4">
              Request a new reset link
            </a>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-(--dht-red)/20 bg-(--dht-gray-light)">
        <CardHeader className="text-center">
          <CardTitle className="text-xl text-(--dht-dark)">Reset your password</CardTitle>
          <CardDescription className="text-(--dht-gray)">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="grid gap-4 text-center">
              <p className="text-sm text-(--dht-gray)">
                Your password has been successfully reset.
              </p>
              <a href="/sign-in" className="text-(--dht-red) hover:text-(--dht-red-hover) text-sm underline underline-offset-4">
                Sign in with your new password
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="grid gap-6">
                <div className="grid gap-4">
                  <div className="grid gap-3">
                    <Label htmlFor="new-password" className="text-(--dht-dark)">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="confirm-password" className="text-(--dht-dark)">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                  <Button
                    type="submit"
                    className="w-full cursor-pointer bg-(--dht-red) text-white hover:bg-(--dht-red-hover)"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                        Resetting...
                      </>
                    ) : (
                      "Reset Password"
                    )}
                  </Button>
                </div>
                <div className="text-center text-sm">
                  <a href="/sign-in" className="text-(--dht-red) hover:text-(--dht-red-hover) underline underline-offset-4">
                    Back to sign in
                  </a>
                </div>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
