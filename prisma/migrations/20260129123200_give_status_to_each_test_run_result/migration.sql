/*
  Warnings:

  - You are about to drop the column `failReason` on the `TestRun` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `TestRun` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TestRun" DROP COLUMN "failReason",
DROP COLUMN "status";

-- AlterTable
ALTER TABLE "TestRunResult" ADD COLUMN     "failReason" TEXT,
ADD COLUMN     "status" "TEST_RUN_STATUS" NOT NULL DEFAULT 'PENDING';
