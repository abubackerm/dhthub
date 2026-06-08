"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import { SignInDialog } from "@/components/sign-in-dialog";
import Image from "next/image";
import { Loader2 } from "lucide-react";

function SignInPageContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [open, setOpen] = useState(true);

  const handleSuccess = useCallback(() => {
    window.location.href = callbackUrl;
  }, [callbackUrl]);

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
        <p className="text-sm text-muted-foreground">Sign in to continue</p>
      </div>
      <SignInDialog
        open={open}
        onOpenChange={setOpen}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SignInPageContent />
    </Suspense>
  );
}
