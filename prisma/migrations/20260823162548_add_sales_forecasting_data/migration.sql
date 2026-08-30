-- AlterTable
ALTER TABLE "InventoryTransaction" ADD COLUMN     "sellingPrice" DECIMAL(10,2),
ADD COLUMN     "soldAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "storeId" TEXT,
ADD COLUMN     "unit" TEXT;

-- CreateIndex
CREATE INDEX "InventoryTransaction_storeId_idx" ON "InventoryTransaction"("storeId");

-- CreateIndex
CREATE INDEX "InventoryTransaction_storeId_type_idx" ON "InventoryTransaction"("storeId", "type");

-- CreateIndex
CREATE INDEX "InventoryTransaction_productId_type_idx" ON "InventoryTransaction"("productId", "type");

-- CreateIndex
CREATE INDEX "InventoryTransaction_productId_soldAt_idx" ON "InventoryTransaction"("productId", "soldAt");
