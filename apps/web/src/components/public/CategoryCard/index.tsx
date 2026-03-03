"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FolderOpen,
  Package,
  ArrowRight
} from "lucide-react";
import { Category } from "@/lib/mock-data";

interface CategoryCardProps {
  category: Category;
  basePath?: string;
}

export function CategoryCard({ category, basePath = "/products" }: CategoryCardProps) {
  const href = `${basePath}/${category.slug}`;

  // Determine badge content based on category type
  const badgeContent = category.type === "LEAF"
    ? `${category.productCount} products`
    : `${category.childCount} subcategories`;

  return (
    <Link href={href} className="group block h-full">
      <Card className="h-full transition-all duration-200 hover:shadow-lg hover:ring-2 hover:ring-[--dht-red] hover:border-transparent overflow-hidden">
        <CardContent className="p-0">
          {/* Image/Icon Area */}
          <div className="aspect-[4/3] bg-muted relative overflow-hidden">
            {category.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={category.imageUrl}
                alt={category.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                {category.type === "LEAF" ? (
                  <Package className="w-16 h-16 text-muted-foreground/40" />
                ) : (
                  <FolderOpen className="w-16 h-16 text-muted-foreground/40" />
                )}
              </div>
            )}

            {/* Category Type Badge */}
            <div className="absolute top-3 left-3">
              <Badge
                variant={category.type === "LEAF" ? "default" : "secondary"}
                className={category.type === "LEAF"
                  ? "bg-[--dht-red] text-white hover:bg-[--dht-red-hover]"
                  : ""
                }
              >
                {category.type === "LEAF" ? "Products" : "Category"}
              </Badge>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-4 space-y-2">
            <h3 className="font-semibold text-lg text-foreground group-hover:text-[--dht-red] transition-colors line-clamp-1">
              {category.name}
            </h3>

            {category.productCount > 0 || category.childCount > 0 ? (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                {category.type === "LEAF" ? (
                  <Package className="w-4 h-4" />
                ) : (
                  <FolderOpen className="w-4 h-4" />
                )}
                {badgeContent}
              </p>
            ) : null}

            <div className="flex items-center text-sm font-medium text-[--dht-red] opacity-0 group-hover:opacity-100 transition-opacity">
              Browse {category.name}
              <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
