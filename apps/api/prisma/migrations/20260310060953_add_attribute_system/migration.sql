-- CreateEnum
CREATE TYPE "AttributeDataType" AS ENUM ('number', 'text', 'enum', 'boolean');

-- CreateEnum
CREATE TYPE "AttributeFilterType" AS ENUM ('RANGE', 'CHECKBOX', 'SELECT');

-- CreateTable
CREATE TABLE "attribute_definitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "data_type" "AttributeDataType" NOT NULL,
    "group_name" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "filter_type" "AttributeFilterType",
    "unit_id" TEXT,
    "is_filterable" BOOLEAN NOT NULL DEFAULT false,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "attribute_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attribute_options" (
    "id" TEXT NOT NULL,
    "attribute_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attribute_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variant_attribute_values" (
    "id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "attribute_id" TEXT NOT NULL,
    "number_value" DOUBLE PRECISION,
    "text_value" TEXT,
    "option_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "variant_attribute_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_definitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unit_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_attributes" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "attribute_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attribute_definitions_slug_key" ON "attribute_definitions"("slug");

-- CreateIndex
CREATE INDEX "attribute_definitions_slug_idx" ON "attribute_definitions"("slug");

-- CreateIndex
CREATE INDEX "attribute_definitions_data_type_idx" ON "attribute_definitions"("data_type");

-- CreateIndex
CREATE INDEX "attribute_definitions_group_name_idx" ON "attribute_definitions"("group_name");

-- CreateIndex
CREATE INDEX "attribute_options_attribute_id_idx" ON "attribute_options"("attribute_id");

-- CreateIndex
CREATE UNIQUE INDEX "attribute_options_attribute_id_value_key" ON "attribute_options"("attribute_id", "value");

-- CreateIndex
CREATE INDEX "variant_attribute_values_variant_id_idx" ON "variant_attribute_values"("variant_id");

-- CreateIndex
CREATE INDEX "variant_attribute_values_attribute_id_idx" ON "variant_attribute_values"("attribute_id");

-- CreateIndex
CREATE INDEX "variant_attribute_values_variant_id_attribute_id_idx" ON "variant_attribute_values"("variant_id", "attribute_id");

-- CreateIndex
CREATE INDEX "variant_attribute_values_attribute_id_number_value_idx" ON "variant_attribute_values"("attribute_id", "number_value");

-- CreateIndex
CREATE INDEX "variant_attribute_values_attribute_id_option_id_idx" ON "variant_attribute_values"("attribute_id", "option_id");

-- CreateIndex
CREATE UNIQUE INDEX "variant_attribute_values_variant_id_attribute_id_key" ON "variant_attribute_values"("variant_id", "attribute_id");

-- CreateIndex
CREATE UNIQUE INDEX "unit_definitions_symbol_key" ON "unit_definitions"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "category_attributes_category_id_attribute_id_key" ON "category_attributes"("category_id", "attribute_id");

-- CreateIndex
CREATE INDEX "products_name_idx" ON "products"("name");

-- AddForeignKey
ALTER TABLE "attribute_definitions" ADD CONSTRAINT "attribute_definitions_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "unit_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attribute_options" ADD CONSTRAINT "attribute_options_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "attribute_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_attribute_values" ADD CONSTRAINT "variant_attribute_values_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_attribute_values" ADD CONSTRAINT "variant_attribute_values_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "attribute_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_attribute_values" ADD CONSTRAINT "variant_attribute_values_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "attribute_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_attributes" ADD CONSTRAINT "category_attributes_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_attributes" ADD CONSTRAINT "category_attributes_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "attribute_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
