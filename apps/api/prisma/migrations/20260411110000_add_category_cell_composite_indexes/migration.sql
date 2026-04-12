-- CreateTable
-- Composite index on categories(path, is_active) for leaf-descendant queries
-- path is leading column because isActive has very low selectivity (~100% true)
-- Covers: WHERE path LIKE 'prefix.%' AND is_active = true
CREATE INDEX "categories_path_is_active_idx" ON "categories"("path", "is_active");

-- Composite index on cells(category_id, is_active, sort_order)
-- Covers: WHERE category_id = $1 AND is_active = true ORDER BY sort_order ASC
CREATE INDEX "cells_category_id_is_active_sort_order_idx" ON "cells"("category_id", "is_active", "sort_order");
