import Link from "next/link";
import { Category } from "@/lib/mock-data";
import { CategoryIcon } from "@/components/public/CategoryIcon";

interface BranchCategoryProps {
  category: Category;
  pathNames: string[];
  pathSlugs: string[];
}

export function BranchCategory({ category, pathNames, pathSlugs }: BranchCategoryProps) {
  const activeChildren = category.children.filter((child) => child.isActive);

  // Build breadcrumb links
  const breadcrumbItems = pathNames.map((name, index) => ({
    name,
    path: `/products/${pathSlugs.slice(0, index + 1).join("/")}`,
  }));

  return (
    <div className="catalog-page">
      {/* Breadcrumb */}
      <div className="catalog-breadcrumb">
        <Link href="/" className="catalog-breadcrumb__link">Home</Link>
        <span className="catalog-breadcrumb__sep">&gt;</span>
        <Link href="/products" className="catalog-breadcrumb__link">All Categories</Link>
        {breadcrumbItems.map((item, i) => (
          <span key={i}>
            <span className="catalog-breadcrumb__sep">&gt;</span>
            {i === breadcrumbItems.length - 1 ? (
              <span className="catalog-breadcrumb__current">{item.name}</span>
            ) : (
              <Link href={item.path} className="catalog-breadcrumb__link">{item.name}</Link>
            )}
          </span>
        ))}
      </div>

      {/* Category Title */}
      <h1 className="catalog-page__title">{category.name}</h1>

      {/* Subcategory Grid */}
      <div className="catalog-grid">
        {activeChildren.map((child) => (
          <Link
            key={child.id}
            href={`/products/${pathSlugs.join("/")}/${child.slug}`}
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

      {/* Empty State */}
      {activeChildren.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg">
            No subcategories available in this section.
          </p>
        </div>
      )}
    </div>
  );
}
