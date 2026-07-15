-- تجديد الحقوق يتطلّب عدّة مستحقّات USAGE_RIGHTS لكل تسليم — يُستبدَل القيد المركّب
-- ([submissionId, type]) بـidempotency على usageRightId (فريد لكل حقّ). لا فقد بيانات.

-- DropIndex
DROP INDEX "CampaignPayout_submissionId_type_key";

-- AlterTable
ALTER TABLE "CampaignPayout" ADD COLUMN     "usageRightId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CampaignPayout_usageRightId_key" ON "CampaignPayout"("usageRightId");
