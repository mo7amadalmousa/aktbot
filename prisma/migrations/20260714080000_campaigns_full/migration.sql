-- CreateEnum
CREATE TYPE "PayoutType" AS ENUM ('SALE', 'PERFORMANCE', 'UGC');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('ACCRUED', 'APPROVED', 'PAID', 'REVERSED');

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "brief" TEXT,
ADD COLUMN     "budgetAmount" INTEGER,
ADD COLUMN     "coverImage" TEXT,
ADD COLUMN     "currency" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "endAt" TIMESTAMP(3),
ADD COLUMN     "payoutConfig" JSONB,
ADD COLUMN     "requirements" JSONB,
ADD COLUMN     "spentAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "startAt" TIMESTAMP(3),
ADD COLUMN     "targetUrl" TEXT;

-- AlterTable
ALTER TABLE "CampaignParticipation" ADD COLUMN     "payoutAccrued" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CampaignPayout" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "participationId" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "type" "PayoutType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "orderId" TEXT,
    "status" "PayoutStatus" NOT NULL DEFAULT 'ACCRUED',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CampaignPayout_orderId_key" ON "CampaignPayout"("orderId");

-- CreateIndex
CREATE INDEX "CampaignPayout_campaignId_idx" ON "CampaignPayout"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignPayout_participationId_idx" ON "CampaignPayout"("participationId");

-- CreateIndex
CREATE INDEX "CampaignPayout_creatorProfileId_idx" ON "CampaignPayout"("creatorProfileId");

-- CreateIndex
CREATE INDEX "CampaignPayout_status_idx" ON "CampaignPayout"("status");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- AddForeignKey
ALTER TABLE "CampaignPayout" ADD CONSTRAINT "CampaignPayout_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignPayout" ADD CONSTRAINT "CampaignPayout_participationId_fkey" FOREIGN KEY ("participationId") REFERENCES "CampaignParticipation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignPayout" ADD CONSTRAINT "CampaignPayout_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

