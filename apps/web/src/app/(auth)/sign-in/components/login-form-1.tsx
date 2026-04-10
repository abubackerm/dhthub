"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { authClient } from "@/lib/auth-client"
import { Loader2 } from "lucide-react"

const loginFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

type LoginFormValues = z.infer<typeof loginFormSchema>

interface LoginForm1Props extends React.ComponentProps<"div"> {
  theme?: "dht";
  onSuccess?: () => void;
}

export function LoginForm1({
  className,
  theme,
  onSuccess,
  ...props
}: LoginForm1Props) {
  const isDht = theme === "dht";
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(values: LoginFormValues) {
    setError(null)
    setIsSubmitting(true)
    // Yield so the loading UI paints before the request
    await new Promise((r) => setTimeout(r, 0))
    try {
      const { error: signInError } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      })

      if (signInError) {
        setError(signInError.message ?? "Unable to sign in. Please try again.")
        return
      }

      if (onSuccess) {
        onSuccess();
      } else {
        window.location.reload();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className={isDht ? "border-(--dht-red)/20 bg-(--dht-gray-light)" : undefined}>
        <CardHeader className="text-center">
          <CardTitle className={cn("text-xl", isDht && "text-(--dht-dark)")}>
            Welcome back
          </CardTitle>
          <CardDescription className={isDht ? "text-(--dht-gray)" : undefined}>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-6">
                <div className="grid gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="name@example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center">
                          <FormLabel>Password</FormLabel>
                          <a
                            href="/forgot-password"
                            className={cn(
                              "ml-auto text-sm underline-offset-4 hover:underline",
                              isDht && "text-(--dht-red) hover:text-(--dht-red-hover)"
                            )}
                          >
                            Forgot your password?
                          </a>
                        </div>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                  <Button
                    type="submit"
                    className={cn(
                      "w-full cursor-pointer",
                      isDht &&
                        "bg-(--dht-red) text-white hover:bg-(--dht-red-hover)"
                    )}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                        Logging in...
                      </>
                    ) : (
                      "Login"
                    )}
                  </Button>

                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      <div
        className={cn(
          "text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4",
          isDht
            ? "text-(--dht-gray) *:[a]:text-(--dht-red) *:[a]:hover:text-(--dht-red-hover)"
            : "text-muted-foreground *:[a]:hover:text-primary"
        )}
      >
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  )
}
