import Script from "next/script";
import { getThemeScript } from "@/lib/theme-init";

/**
 * Server component that injects the theme initialization script before React hydration.
 * This prevents FOUC (Flash of Unthemed Content) on dashboard pages only.
 * Public website pages do not render this component, so they remain in light mode.
 */
export function DashboardThemeScript() {
  return (
    <Script
      id="dashboard-theme-init"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: getThemeScript() }}
    />
  );
}
