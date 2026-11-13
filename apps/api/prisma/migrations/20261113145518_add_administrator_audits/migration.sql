-- CreateEnum
CREATE TYPE "AdminAuditAction" AS ENUM ('ROLE_CHANGE', 'QUESTION_CANCELLATION');

-- CreateTable
CREATE TABLE "AdminAudit" (
    "id" TEXT NOT NULL,
    "action" "AdminAuditAction" NOT NULL,
    "targetUserId" TEXT,
    "questionId" TEXT,
    "previousRole" "Role",
    "newRole" "Role",
    "amount" INTEGER,
    "reason" TEXT NOT NULL,
    "responsibleUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminAudit_targetUserId_createdAt_idx" ON "AdminAudit"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAudit_questionId_createdAt_idx" ON "AdminAudit"("questionId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAudit_responsibleUserId_createdAt_idx" ON "AdminAudit"("responsibleUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "AdminAudit" ADD CONSTRAINT "AdminAudit_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAudit" ADD CONSTRAINT "AdminAudit_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAudit" ADD CONSTRAINT "AdminAudit_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;
