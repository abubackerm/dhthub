"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mockCategories } from "@/lib/mock-data";

export function CatalogSidebar() {
    const pathname = usePathname();

    const topLevelCategories = mockCategories.filter(
        (cat) => cat.depth === 0 && cat.type === "BRANCH" && cat.isActive
    );

    return (
        <aside className="catalog-sidebar">
            <nav>
                <ul className="catalog-sidebar__list">
                    {topLevelCategories.map((category) => {
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
                    })}
                </ul>
            </nav>
        </aside>
    );
}
