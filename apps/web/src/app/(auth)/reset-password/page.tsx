import { Suspense } from "react"
import { ResetPasswordForm } from "./components/reset-password-form"
import Image from "next/image"

export default function ResetPasswordPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-4">
        <Image
          src="/images/dynamic_hub_Logo.png"
          alt="Dynamic Hub"
          width={140}
          height={47}
          className="h-10 w-auto"
        />
        <p className="text-sm text-muted-foreground">Set a new password</p>
      </div>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
