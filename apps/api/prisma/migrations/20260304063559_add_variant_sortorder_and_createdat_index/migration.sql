-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "products_created_at_idx" ON "products"("created_at");
