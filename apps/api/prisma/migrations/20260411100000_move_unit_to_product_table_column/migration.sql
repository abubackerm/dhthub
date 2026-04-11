-- Move unit ownership from AttributeDefinition to ProductTableColumn
-- Attributes no longer own units; units are selected per product table column

-- Add unit_id column to product_table_columns
ALTER TABLE "product_table_columns" ADD COLUMN "unit_id" TEXT;

-- Add foreign key constraint
ALTER TABLE "product_table_columns" ADD CONSTRAINT "product_table_columns_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "unit_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop the unit_id column and constraint from attribute_definitions
ALTER TABLE "attribute_definitions" DROP CONSTRAINT IF EXISTS "attribute_definitions_unit_id_fkey";
ALTER TABLE "attribute_definitions" DROP COLUMN IF EXISTS "unit_id";
