import { DHTHeader } from "@/app/(home)/components/dht-header";
import { DHTFooter } from "@/app/(home)/components/dht-footer";
import { CatalogSidebar } from "@/components/public/CatalogSidebar";
import { FilterProvider } from "@/contexts/filter-context";
import { AuthProvider } from "@/providers/auth-provider";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Products - DHT Hub",
  description: "Browse our extensive collection of industrial products",
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col">
        <DHTHeader />

        {/* Main Layout: Sidebar + Content */}
        <div className="catalog-layout">
          <FilterProvider>
            <CatalogSidebar />
            <main className="catalog-content">
              {children}
            </main>
          </FilterProvider>
        </div>

        <DHTFooter />
      </div>
    </AuthProvider>
  );
}
