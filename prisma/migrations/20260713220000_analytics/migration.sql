-- CreateTable
CREATE TABLE "PageViewDaily" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "uniques" INTEGER NOT NULL DEFAULT 0,
    "srcDirect" INTEGER NOT NULL DEFAULT 0,
    "srcSocial" INTEGER NOT NULL DEFAULT 0,
    "srcOther" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageViewDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitorDay" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitorDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockClick" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlockClick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageViewDaily_creatorProfileId_idx" ON "PageViewDaily"("creatorProfileId");

-- CreateIndex
CREATE INDEX "PageViewDaily_date_idx" ON "PageViewDaily"("date");

-- CreateIndex
CREATE UNIQUE INDEX "PageViewDaily_creatorProfileId_date_key" ON "PageViewDaily"("creatorProfileId", "date");

-- CreateIndex
CREATE INDEX "VisitorDay_creatorProfileId_date_idx" ON "VisitorDay"("creatorProfileId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "VisitorDay_creatorProfileId_visitorId_date_key" ON "VisitorDay"("creatorProfileId", "visitorId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "BlockClick_blockId_key" ON "BlockClick"("blockId");

-- CreateIndex
CREATE INDEX "BlockClick_creatorProfileId_idx" ON "BlockClick"("creatorProfileId");

-- AddForeignKey
ALTER TABLE "PageViewDaily" ADD CONSTRAINT "PageViewDaily_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockClick" ADD CONSTRAINT "BlockClick_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

