-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ENDED');

-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('SALE', 'PERFORMANCE', 'UGC');

-- CreateEnum
CREATE TYPE "ParticipationStatus" AS ENUM ('INVITED', 'JOINED', 'ACTIVE', 'LEFT');

-- CreateEnum
CREATE TYPE "AttributionType" AS ENUM ('CLICK', 'CONVERSION', 'SALE');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "participationId" TEXT;

-- CreateTable
CREATE TABLE "BrandProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "logoUrl" TEXT,
    "website" TEXT,
    "description" TEXT,
    "contactEmail" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "type" "CampaignType" NOT NULL DEFAULT 'SALE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignParticipation" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "uniqueCode" TEXT NOT NULL,
    "uniqueLink" TEXT NOT NULL,
    "status" "ParticipationStatus" NOT NULL DEFAULT 'ACTIVE',
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "sales" INTEGER NOT NULL DEFAULT 0,
    "salesValue" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttributionEvent" (
    "id" TEXT NOT NULL,
    "participationId" TEXT NOT NULL,
    "type" "AttributionType" NOT NULL,
    "orderId" TEXT,
    "amount" INTEGER,
    "visitorRef" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttributionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrandProfile_userId_key" ON "BrandProfile"("userId");

-- CreateIndex
CREATE INDEX "Campaign_brandId_idx" ON "Campaign"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignParticipation_uniqueCode_key" ON "CampaignParticipation"("uniqueCode");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignParticipation_uniqueLink_key" ON "CampaignParticipation"("uniqueLink");

-- CreateIndex
CREATE INDEX "CampaignParticipation_campaignId_idx" ON "CampaignParticipation"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignParticipation_creatorProfileId_idx" ON "CampaignParticipation"("creatorProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignParticipation_campaignId_creatorProfileId_key" ON "CampaignParticipation"("campaignId", "creatorProfileId");

-- CreateIndex
CREATE INDEX "AttributionEvent_participationId_idx" ON "AttributionEvent"("participationId");

-- CreateIndex
CREATE INDEX "AttributionEvent_type_idx" ON "AttributionEvent"("type");

-- CreateIndex
CREATE INDEX "Order_participationId_idx" ON "Order"("participationId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_participationId_fkey" FOREIGN KEY ("participationId") REFERENCES "CampaignParticipation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandProfile" ADD CONSTRAINT "BrandProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "BrandProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignParticipation" ADD CONSTRAINT "CampaignParticipation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignParticipation" ADD CONSTRAINT "CampaignParticipation_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributionEvent" ADD CONSTRAINT "AttributionEvent_participationId_fkey" FOREIGN KEY ("participationId") REFERENCES "CampaignParticipation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

