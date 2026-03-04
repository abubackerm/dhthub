"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCategoryTree } from "@/lib/api/catalog/use-categories";
import type { CategoryTreeNode } from "@/lib/api/catalog/types";

export function CatalogSidebar() {
    const pathname = usePathname();
    const { data: categoryTree, isLoading, error } = useCategoryTree();

    // Filter for root-level categories with children that are active
    const topLevelCategories = categoryTree?.filter(
        (cat: CategoryTreeNode) => cat.depth === 0 && cat.children.length > 0 && cat.isActive
    ) ?? [];

    return (
        <aside className="catalog-sidebar">
            <nav>
                <ul className="catalog-sidebar__list">
                    {isLoading ? (
                        <li className="catalog-sidebar__link">Loading...</li>
                    ) : error ? (
                        <li className="catalog-sidebar__link">Error loading categories</li>
                    ) : topLevelCategories.length === 0 ? (
                        <li className="catalog-sidebar__link">No categories available</li>
                    ) : (
                        topLevelCategories.map((category) => {
                            const href = `/products/${category.slug}`;
                            const isActive =
                                pathname === href || pathname.startsWith(href + "/");

                            return (
                                <li key={category.id}>
                                    <Link
                                        href={href}
                                        className={`catalog-sidebar__link ${isActive ? "catalog-sidebar__link--active" : ""}`}
                                    >
                                        {category.name}
                                    </Link>
                                </li>
                            );
                        })
                    )}
                </ul>
            </nav>
        </aside>
    );
}
