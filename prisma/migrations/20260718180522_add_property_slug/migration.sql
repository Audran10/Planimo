-- AlterTable
ALTER TABLE "Property" ADD COLUMN "slug" TEXT;

-- Backfill existing rows with a slug derived from their name
UPDATE "Property"
SET "slug" = trim(both '-' from regexp_replace(lower(trim("name")), '[^a-z0-9]+', '-', 'g'))
WHERE "slug" IS NULL;

-- Disambiguate any duplicate slugs produced by the backfill above
WITH ranked AS (
  SELECT "id", "slug", row_number() OVER (PARTITION BY "slug" ORDER BY "createdAt") AS rn
  FROM "Property"
)
UPDATE "Property" p
SET "slug" = p."slug" || '-' || ranked.rn
FROM ranked
WHERE p."id" = ranked."id" AND ranked.rn > 1;

-- AlterTable
ALTER TABLE "Property" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Property_slug_key" ON "Property"("slug");
