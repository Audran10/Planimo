-- AlterTable
ALTER TABLE "Unit" ADD COLUMN "floorPlans" JSONB;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN "workOrderId" TEXT;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
