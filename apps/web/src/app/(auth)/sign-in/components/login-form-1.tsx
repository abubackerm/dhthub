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

                  <Button
                    variant="outline"
                    className={cn(
                      "w-full cursor-pointer",
                      isDht &&
                        "border-(--dht-red) text-(--dht-red) hover:bg-(--dht-red)/10 hover:text-(--dht-red-hover)"
                    )}
                    type="button"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path
                        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                        fill="currentColor"
                      />
                    </svg>
                    Login with Google
                  </Button>
                </div>
                <div className="text-center text-sm">
                  Don&apos;t have an account?{" "}
                  <a
                    href="/sign-up"
                    className={cn(
                      "underline underline-offset-4",
                      isDht && "text-(--dht-red) hover:text-(--dht-red-hover)"
                    )}
                  >
                    Sign up
                  </a>
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
