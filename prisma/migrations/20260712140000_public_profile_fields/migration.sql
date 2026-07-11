-- AlterTable
ALTER TABLE "CreatorProfile" ADD COLUMN     "followerCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "socialLinks" JSONB;

