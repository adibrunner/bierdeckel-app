-- AlterTable
ALTER TABLE "DartsLeagueMember" ADD COLUMN     "currentElo" INTEGER NOT NULL DEFAULT 1000;

-- AlterTable
ALTER TABLE "EloHistory" ADD COLUMN     "leagueId" TEXT;

-- AddForeignKey
ALTER TABLE "EloHistory" ADD CONSTRAINT "EloHistory_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "DartsLeague"("id") ON DELETE SET NULL ON UPDATE CASCADE;
