-- AlterTable
ALTER TABLE "variant_attribute_values" ADD COLUMN     "boolean_value" BOOLEAN;

-- CreateIndex
CREATE INDEX "variant_attribute_values_attribute_id_boolean_value_idx" ON "variant_attribute_values"("attribute_id", "boolean_value");
