import { DHTHeader } from "@/app/(home)/components/dht-header";
import { DHTFooter } from "@/app/(home)/components/dht-footer";
import { CatalogSidebar } from "@/components/public/CatalogSidebar";

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <DHTHeader />

      {/* All Categories Tab Bar */}
      <div className="catalog-tab-bar">
        <span className="catalog-tab-bar__label">All Categories</span>
      </div>

      {/* Main Layout: Sidebar + Content */}
      <div className="catalog-layout">
        <CatalogSidebar />
        <main className="catalog-content">
          {children}
        </main>
      </div>

      <DHTFooter />
    </div>
  );
}
