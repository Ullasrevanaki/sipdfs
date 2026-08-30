CREATE TABLE IF NOT EXISTS "Category" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Category_storeId_name_key"
ON "Category" ("storeId", "name");

CREATE INDEX IF NOT EXISTS "Category_storeId_idx"
ON "Category" ("storeId");

ALTER TABLE "Category"
ADD CONSTRAINT "Category_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "Store"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Product"
ADD COLUMN IF NOT EXISTS "categoryId" TEXT;

INSERT INTO "Category" ("id", "storeId", "name", "createdAt", "updatedAt")
SELECT
  'legacy-' || md5(p."storeId" || ':' || p."category"),
  p."storeId",
  p."category",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Product" p
WHERE p."category" IS NOT NULL
ON CONFLICT ("storeId", "name") DO NOTHING;

UPDATE "Product" p
SET "categoryId" = c."id"
FROM "Category" c
WHERE c."storeId" = p."storeId"
  AND c."name" = p."category"
  AND p."category" IS NOT NULL;

ALTER TABLE "Product"
DROP COLUMN IF EXISTS "category";

ALTER TABLE "Product"
ADD CONSTRAINT "Product_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Product_categoryId_idx"
ON "Product" ("categoryId");
