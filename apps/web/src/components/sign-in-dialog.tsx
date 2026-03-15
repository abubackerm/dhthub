"use client";

import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoginForm1 } from "@/app/(auth)/sign-in/components/login-form-1";

interface SignInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignInDialog({ open, onOpenChange }: SignInDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-t-4 border-t-(--dht-red) bg-(--dht-gray-light) p-0 sm:max-w-sm **:data-[slot=dialog-close]:text-white **:data-[slot=dialog-close]:hover:text-(--dht-gray-light)">
        <DialogHeader className="sr-only">
          <DialogTitle>Sign in</DialogTitle>
        </DialogHeader>
        <div className="bg-(--dht-darker) px-6 py-5">
          <Image
            src="/images/dynamic_hub_Logo.png"
            alt="Dynamic Hub"
            width={140}
            height={47}
            className="h-10 w-auto"
          />
        </div>
        <div className="px-6 pb-6 pt-2">
          <LoginForm1 theme="dht" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
