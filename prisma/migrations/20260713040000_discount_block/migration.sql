-- AlterEnum
ALTER TYPE "BlockType" ADD VALUE 'DISCOUNT';

-- CreateTable
CREATE TABLE "CouponCounter" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CouponCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CouponCounter_blockId_idx" ON "CouponCounter"("blockId");

-- CreateIndex
CREATE UNIQUE INDEX "CouponCounter_blockId_couponId_key" ON "CouponCounter"("blockId", "couponId");

-- AddForeignKey
ALTER TABLE "CouponCounter" ADD CONSTRAINT "CouponCounter_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block"("id") ON DELETE CASCADE ON UPDATE CASCADE;

