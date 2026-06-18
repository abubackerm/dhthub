import { ForgotPasswordForm2 } from "./components/forgot-password-form-2"
import Image from "next/image"

export default function ForgotPassword2Page() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Image
            src="/images/dynamic_hub_Logo.png"
            alt="Dynamic Hub"
            width={140}
            height={47}
            className="h-8 w-auto"
          />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md">
            <ForgotPasswordForm2 />
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <Image
          src="https://ui.shadcn.com/placeholder.svg"
          alt="Image"
          fill
          className="object-cover dark:brightness-[0.95] dark:invert"
        />
      </div>
    </div>
  )
}
