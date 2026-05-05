import { DHTHeaderShell } from "@/components/public/DHTHeaderShell";
import { DHTFooter } from "@/app/(home)/components/dht-footer";
import { CatalogSidebar } from "@/components/public/CatalogSidebar";
import { FilterProvider } from "@/contexts/filter-context";
import { getServerCategoryTree } from "@/lib/api/catalog";
import type { Metadata } from "next";
import type { CategoryTreeNode } from "@/lib/api/catalog/types";

export const metadata: Metadata = {
  title: "Products - DHT Hub",
  description: "Browse our extensive collection of industrial products",
};

export default async function ProductsLayout({ children }: { children: React.ReactNode }) {
  let categories: CategoryTreeNode[] = [];

  try {
    categories = await getServerCategoryTree({ maxDepth: 1 });
  } catch (error) {
    console.error("Failed to fetch category tree for sidebar:", error);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <DHTHeaderShell />

      {/* Main Layout: Sidebar + Content */}
      <div className="catalog-layout">
        <FilterProvider>
          <CatalogSidebar categories={categories} />
          <main className="catalog-content">
            {children}
          </main>
        </FilterProvider>
      </div>

      <DHTFooter />
    </div>
  );
}
