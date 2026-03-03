import { mockCategories } from "@/lib/mock-data";
import Link from "next/link";
import { CategoryIcon } from "@/components/public/CategoryIcon";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Products - DHT Hub",
  description: "Browse our extensive collection of industrial products",
};

export default function ProductsPage() {
  const topLevelCategories = mockCategories.filter(
    (cat) => cat.depth === 0 && cat.type === "BRANCH" && cat.isActive
  );

  return (
    <div className="catalog-page">
      {/* Breadcrumb */}
      <div className="catalog-breadcrumb">
        <Link href="/" className="catalog-breadcrumb__link">Home</Link>
        <span className="catalog-breadcrumb__sep">&gt;</span>
        <span className="catalog-breadcrumb__current">All Categories</span>
      </div>

      {/* Each top-level category rendered as a section */}
      {topLevelCategories.map((category) => {
        const activeChildren = category.children.filter((c) => c.isActive);

        return (
          <div key={category.id} className="catalog-section">
            <h2 className="catalog-section__title">
              <Link href={`/products/${category.slug}`} className="catalog-section__title-link">
                {category.name}
              </Link>
            </h2>

            <div className="catalog-grid">
              {activeChildren.map((child) => (
                <Link
                  key={child.id}
                  href={`/products/${category.slug}/${child.slug}`}
                  className="catalog-grid__cell"
                >
                  <div className="catalog-grid__icon">
                    <CategoryIcon
                      iconName={child.iconName}
                      className="w-12 h-12 text-gray-600"
                      strokeWidth={1.5}
                    />
                  </div>
                  <span className="catalog-grid__label">{child.name}</span>
                </Link>
              ))}
            </div>
          </div>
        );
      })}

      {topLevelCategories.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg">
            No categories available at this time.
          </p>
        </div>
      )}
    </div>
  );
}
