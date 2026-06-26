-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PENDING_CONFIRMATION', 'CONFIRMED', 'DISPUTED');

-- AlterTable
ALTER TABLE "DartsChallenge" ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "DartsMatch" ADD COLUMN     "disputeReason" TEXT,
ADD COLUMN     "status" "MatchStatus" NOT NULL DEFAULT 'PENDING_CONFIRMATION',
ADD COLUMN     "submittedById" TEXT;

-- AddForeignKey
ALTER TABLE "DartsMatch" ADD CONSTRAINT "DartsMatch_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
