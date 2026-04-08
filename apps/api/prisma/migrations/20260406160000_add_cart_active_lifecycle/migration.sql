-- CreateEnum
CREATE TYPE "CartStatus" AS ENUM ('ACTIVE', 'SUBMITTED', 'ABANDONED');

-- AddColumn: isActive boolean to carts
ALTER TABLE "carts" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AddColumn: status enum to carts
ALTER TABLE "carts" ADD COLUMN "status" "CartStatus" NOT NULL DEFAULT 'ACTIVE';

-- Set existing submitted carts as inactive and status SUBMITTED
UPDATE "carts" SET "is_active" = false, "status" = 'SUBMITTED' WHERE "submitted_at" IS NOT NULL;

-- Handle edge case: multiple active carts per user, keep only the most recent one
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY "user_id" ORDER BY "created_at" DESC) as rn
  FROM "carts"
  WHERE "is_active" = true
)
UPDATE "carts"
SET "is_active" = false, "status" = 'ABANDONED'
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Drop old unique constraint/index on user_id
ALTER TABLE "carts" DROP CONSTRAINT IF EXISTS carts_user_id_key;
DROP INDEX IF EXISTS carts_user_id_key;

-- Create partial unique index: allows many inactive carts per user, only one active
CREATE UNIQUE INDEX "one_active_cart_per_user" ON "carts" ("user_id") WHERE "is_active" = true;
