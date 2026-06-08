"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PasswordChangeForm } from "./components/password-change-form";

export default function PasswordChangePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Navigation */}
      <div className="mb-6">
        <Button variant="ghost" className="gap-2 pl-0 cursor-pointer" asChild>
          <Link href="/account/settings">
            <ChevronLeft className="h-4 w-4" />
            Back to Settings
          </Link>
        </Button>
      </div>

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Password & Security</h1>
        <p className="text-gray-600 mt-1">
          Manage your password and account security settings
        </p>
      </div>

      {/* Password Change Form */}
      <PasswordChangeForm />
    </div>
  );
}
