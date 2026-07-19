-- AlterTable
ALTER TABLE "Unit" ADD COLUMN "slug" TEXT;

-- Backfill existing rows with a slug derived from their name
UPDATE "Unit"
SET "slug" = trim(both '-' from regexp_replace(lower(trim("name")), '[^a-z0-9]+', '-', 'g'))
WHERE "slug" IS NULL;

-- Disambiguate any duplicate slugs produced by the backfill above
WITH ranked AS (
  SELECT "id", "slug", row_number() OVER (PARTITION BY "slug" ORDER BY "createdAt") AS rn
  FROM "Unit"
)
UPDATE "Unit" u
SET "slug" = u."slug" || '-' || ranked.rn
FROM ranked
WHERE u."id" = ranked."id" AND ranked.rn > 1;

-- AlterTable
ALTER TABLE "Unit" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Unit_slug_key" ON "Unit"("slug");
