-- CreateTable
CREATE TABLE "ReorderRecommendation" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "recommendedQuantity" DECIMAL(10,2) NOT NULL,
    "targetStock" DECIMAL(10,2) NOT NULL,
    "currentStock" DECIMAL(10,2) NOT NULL,
    "priority" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "reason" TEXT,
    "forecastDemand" DECIMAL(10,2),
    "safetyStock" DECIMAL(10,2),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReorderRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAlert" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "currentStock" DECIMAL(10,2) NOT NULL,
    "minimumStock" DECIMAL(10,2) NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReorderRecommendation_storeId_idx" ON "ReorderRecommendation"("storeId");

-- CreateIndex
CREATE INDEX "ReorderRecommendation_storeId_productId_idx" ON "ReorderRecommendation"("storeId", "productId");

-- CreateIndex
CREATE INDEX "ReorderRecommendation_storeId_status_idx" ON "ReorderRecommendation"("storeId", "status");

-- CreateIndex
CREATE INDEX "ReorderRecommendation_productId_idx" ON "ReorderRecommendation"("productId");

-- CreateIndex
CREATE INDEX "StockAlert_storeId_idx" ON "StockAlert"("storeId");

-- CreateIndex
CREATE INDEX "StockAlert_storeId_productId_idx" ON "StockAlert"("storeId", "productId");

-- CreateIndex
CREATE INDEX "StockAlert_storeId_status_idx" ON "StockAlert"("storeId", "status");

-- CreateIndex
CREATE INDEX "StockAlert_productId_idx" ON "StockAlert"("productId");

-- AddForeignKey
ALTER TABLE "ReorderRecommendation" ADD CONSTRAINT "ReorderRecommendation_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReorderRecommendation" ADD CONSTRAINT "ReorderRecommendation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAlert" ADD CONSTRAINT "StockAlert_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAlert" ADD CONSTRAINT "StockAlert_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
