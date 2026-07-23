-- AlterTable
ALTER TABLE "Room" ADD COLUMN "slug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Room_unitId_slug_key" ON "Room"("unitId", "slug");
