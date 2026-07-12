-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BlockType" ADD VALUE 'BEFORE_AFTER';
ALTER TYPE "BlockType" ADD VALUE 'STORY';

-- CreateTable
CREATE TABLE "StoryView" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoryView_blockId_idx" ON "StoryView"("blockId");

-- CreateIndex
CREATE UNIQUE INDEX "StoryView_blockId_visitorId_key" ON "StoryView"("blockId", "visitorId");

-- AddForeignKey
ALTER TABLE "StoryView" ADD CONSTRAINT "StoryView_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block"("id") ON DELETE CASCADE ON UPDATE CASCADE;

