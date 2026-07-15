-- CreateEnum
CREATE TYPE "SubmissionType" AS ENUM ('VIDEO', 'IMAGE');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED');

-- CreateEnum
CREATE TYPE "UsageRightStatus" AS ENUM ('NOT_REQUESTED', 'REQUESTED', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "UsageScope" AS ENUM ('ORGANIC', 'PAID', 'WHITELISTING');

-- AlterEnum
ALTER TYPE "PayoutType" ADD VALUE 'USAGE_RIGHTS';

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "usageRightsBudget" INTEGER,
ADD COLUMN     "usageRightsSpent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "usageRightsWanted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "CampaignPayout" ADD COLUMN     "commissionAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "grossAmount" INTEGER,
ADD COLUMN     "submissionId" TEXT;

-- AlterTable
ALTER TABLE "CommissionLedger" ADD COLUMN     "campaignPayoutId" TEXT,
ALTER COLUMN "orderId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ContentSubmission" (
    "id" TEXT NOT NULL,
    "participationId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "type" "SubmissionType" NOT NULL,
    "assetKey" TEXT NOT NULL,
    "thumbnailKey" TEXT,
    "caption" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageRight" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "status" "UsageRightStatus" NOT NULL DEFAULT 'REQUESTED',
    "feeAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "channels" JSONB,
    "scope" "UsageScope" NOT NULL DEFAULT 'ORGANIC',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageRight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "ContentSubmission_participationId_idx" ON "ContentSubmission"("participationId");

-- CreateIndex
CREATE INDEX "ContentSubmission_campaignId_idx" ON "ContentSubmission"("campaignId");

-- CreateIndex
CREATE INDEX "ContentSubmission_creatorProfileId_idx" ON "ContentSubmission"("creatorProfileId");

-- CreateIndex
CREATE INDEX "ContentSubmission_status_idx" ON "ContentSubmission"("status");

-- CreateIndex
CREATE UNIQUE INDEX "UsageRight_submissionId_key" ON "UsageRight"("submissionId");

-- CreateIndex
CREATE INDEX "UsageRight_status_idx" ON "UsageRight"("status");

-- CreateIndex
CREATE INDEX "CampaignPayout_submissionId_idx" ON "CampaignPayout"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignPayout_submissionId_type_key" ON "CampaignPayout"("submissionId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionLedger_campaignPayoutId_key" ON "CommissionLedger"("campaignPayoutId");

-- AddForeignKey
ALTER TABLE "CampaignPayout" ADD CONSTRAINT "CampaignPayout_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "ContentSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentSubmission" ADD CONSTRAINT "ContentSubmission_participationId_fkey" FOREIGN KEY ("participationId") REFERENCES "CampaignParticipation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentSubmission" ADD CONSTRAINT "ContentSubmission_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentSubmission" ADD CONSTRAINT "ContentSubmission_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRight" ADD CONSTRAINT "UsageRight_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "ContentSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
