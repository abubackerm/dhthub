import { DashboardComponent } from "./dashboard-client"
import { DashboardThemeScript } from "@/components/dashboard-theme-script"

/**
 * Server component for dashboard route group.
 * Injects theme initialization script only for dashboard routes,
 * preventing dark mode theme from bleeding into public website pages.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DashboardThemeScript />
      <DashboardComponent>{children}</DashboardComponent>
    </>
  );
}
