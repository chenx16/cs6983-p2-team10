-- AlterTable
ALTER TABLE "Prediction" ADD COLUMN "idempotencyKey" TEXT;

-- AlterTable
ALTER TABLE "Question"
  ADD COLUMN "aSharesHundredths" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "bSharesHundredths" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "marketVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Prediction_userId_idempotencyKey_key"
  ON "Prediction"("userId", "idempotencyKey");
