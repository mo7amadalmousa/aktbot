-- AlterEnum
ALTER TYPE "PayoutType" ADD VALUE 'CONTENT';

-- AlterEnum
ALTER TYPE "SaleType" ADD VALUE 'CONTENT';

-- AlterEnum
ALTER TYPE "SubmissionStatus" ADD VALUE 'AUTO_APPROVED';

-- AlterEnum (PostgreSQL 12+ يسمح بعدّة ADD VALUE في هجرة واحدة)
ALTER TYPE "UsageRightStatus" ADD VALUE 'ACTIVE';
ALTER TYPE "UsageRightStatus" ADD VALUE 'EXPIRING_SOON';

-- DropIndex (تخفيف قيد: حقوق متعدّدة لكل تسليم — سلسلة تجديد)
DROP INDEX "UsageRight_submissionId_key";

-- AlterTable — مكوّنات الحملة القابلة للتركيب (لكلٍّ ميزانيّته)
ALTER TABLE "Campaign" ADD COLUMN     "contentBudget" INTEGER,
ADD COLUMN     "contentCount" INTEGER,
ADD COLUMN     "contentEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contentPerItem" INTEGER,
ADD COLUMN     "contentSpent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "performanceBudget" INTEGER,
ADD COLUMN     "performanceCpc" INTEGER,
ADD COLUMN     "performanceEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "performanceSpent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "saleBudget" INTEGER,
ADD COLUMN     "saleCreatorBps" INTEGER,
ADD COLUMN     "saleEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "saleFixedPerSale" INTEGER,
ADD COLUMN     "saleSpent" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ContentSubmission" ADD COLUMN     "reviewDeadlineAt" TIMESTAMP(3),
ADD COLUMN     "revisionCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "UsageRight" ADD COLUMN     "renewedFromId" TEXT;

-- CreateIndex
CREATE INDEX "UsageRight_submissionId_idx" ON "UsageRight"("submissionId");

-- CreateIndex
CREATE INDEX "UsageRight_renewedFromId_idx" ON "UsageRight"("renewedFromId");
