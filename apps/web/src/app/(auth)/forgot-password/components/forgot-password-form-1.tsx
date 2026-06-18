"use client"

import { useState } from "react"
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

export function ForgotPasswordForm1({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const { error: resetError } = await authClient.requestPasswordReset({
        email,
        redirectTo: "/reset-password",
      })

      if (resetError) {
        setError(resetError.message ?? "Unable to send reset link. Please try again.")
        return
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-(--dht-red)/20 bg-(--dht-gray-light)">
        <CardHeader className="text-center">
          <CardTitle className="text-xl text-(--dht-dark)">Forgot your password?</CardTitle>
          <CardDescription className="text-(--dht-gray)">
            Enter your email address and we&apos;ll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="grid gap-4 text-center">
              <p className="text-sm text-(--dht-gray)">
                If an account exists with that email, we&apos;ve sent a password reset link.
                Please check your inbox.
              </p>
              <a href="/sign-in" className="text-(--dht-red) hover:text-(--dht-red-hover) text-sm underline underline-offset-4">
                Back to sign in
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="grid gap-6">
                <div className="grid gap-6">
                  <div className="grid gap-3">
                    <Label htmlFor="email" className="text-(--dht-dark)">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
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
                        Sending...
                      </>
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>
                </div>
                <div className="text-center text-sm">
                  Remember your password?{" "}
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
