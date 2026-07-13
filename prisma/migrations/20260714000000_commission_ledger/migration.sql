-- CreateEnum
CREATE TYPE "CommissionScope" AS ENUM ('GLOBAL', 'BY_TYPE', 'BY_BRAND', 'BY_CREATOR', 'BY_CAMPAIGN');

-- CreateEnum
CREATE TYPE "SaleType" AS ENUM ('CONSULTATION', 'VIDEO', 'STORE_DIGITAL', 'STORE_COURSE', 'STORE_PHYSICAL', 'BOOKING', 'CAMPAIGN', 'USAGE_RIGHTS');

-- CreateEnum
CREATE TYPE "LedgerStatus" AS ENUM ('ACCRUED', 'SETTLED', 'REVERSED');

-- CreateTable
CREATE TABLE "CommissionRule" (
    "id" TEXT NOT NULL,
    "scope" "CommissionScope" NOT NULL DEFAULT 'GLOBAL',
    "targetId" TEXT,
    "saleType" "SaleType",
    "percentBps" INTEGER,
    "fixedAmount" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionLedger" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "brandId" TEXT,
    "campaignId" TEXT,
    "saleType" "SaleType" NOT NULL,
    "grossAmount" INTEGER NOT NULL,
    "commissionAmount" INTEGER NOT NULL,
    "netCreatorAmount" INTEGER NOT NULL,
    "appliedRuleId" TEXT,
    "currency" TEXT NOT NULL,
    "status" "LedgerStatus" NOT NULL DEFAULT 'ACCRUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommissionRule_scope_idx" ON "CommissionRule"("scope");

-- CreateIndex
CREATE INDEX "CommissionRule_isActive_idx" ON "CommissionRule"("isActive");

-- CreateIndex
CREATE INDEX "CommissionRule_saleType_idx" ON "CommissionRule"("saleType");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionLedger_orderId_key" ON "CommissionLedger"("orderId");

-- CreateIndex
CREATE INDEX "CommissionLedger_creatorProfileId_idx" ON "CommissionLedger"("creatorProfileId");

-- CreateIndex
CREATE INDEX "CommissionLedger_status_idx" ON "CommissionLedger"("status");

-- CreateIndex
CREATE INDEX "CommissionLedger_saleType_idx" ON "CommissionLedger"("saleType");

-- AddForeignKey
ALTER TABLE "CommissionLedger" ADD CONSTRAINT "CommissionLedger_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionLedger" ADD CONSTRAINT "CommissionLedger_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

