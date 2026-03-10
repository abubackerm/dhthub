-- CreateTable
CREATE TABLE "currencies" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL DEFAULT 2,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prices" (
    "id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "currency_id" TEXT NOT NULL,
    "customer_group_id" TEXT,
    "region_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_tiers" (
    "id" TEXT NOT NULL,
    "price_id" TEXT NOT NULL,
    "min_qty" INTEGER NOT NULL,
    "max_qty" INTEGER,
    "unit_price" DECIMAL(12,4) NOT NULL,

    CONSTRAINT "price_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "currencies_code_key" ON "currencies"("code");

-- CreateIndex
CREATE INDEX "prices_variant_id_idx" ON "prices"("variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "prices_variant_id_currency_id_key" ON "prices"("variant_id", "currency_id");

-- CreateIndex
CREATE INDEX "price_tiers_price_id_idx" ON "price_tiers"("price_id");

-- CreateIndex
CREATE INDEX "price_tiers_price_id_min_qty_idx" ON "price_tiers"("price_id", "min_qty");

-- CreateIndex
CREATE UNIQUE INDEX "price_tiers_price_id_min_qty_key" ON "price_tiers"("price_id", "min_qty");

-- AddForeignKey
ALTER TABLE "prices" ADD CONSTRAINT "prices_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prices" ADD CONSTRAINT "prices_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_tiers" ADD CONSTRAINT "price_tiers_price_id_fkey" FOREIGN KEY ("price_id") REFERENCES "prices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
