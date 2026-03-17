"use client"

import { DashboardComponent } from "./dashboard-client"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardComponent>{children}</DashboardComponent>;
}
