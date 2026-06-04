/*
  Warnings:

  - You are about to drop the column `round` on the `Fixture` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "MatchFormat" AS ENUM ('SCORE', 'SETS', 'WINNER_ONLY');

-- AlterTable
ALTER TABLE "Fixture" DROP COLUMN "round",
ADD COLUMN     "roundId" TEXT;

-- CreateTable
CREATE TABLE "CompetitionRound" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "matchFormat" "MatchFormat" NOT NULL DEFAULT 'SCORE',
    "setsToWin" INTEGER,
    "pointsExact" INTEGER NOT NULL DEFAULT 3,
    "pointsWinner" INTEGER NOT NULL DEFAULT 1,
    "pointsDraw" INTEGER NOT NULL DEFAULT 2,

    CONSTRAINT "CompetitionRound_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CompetitionRound" ADD CONSTRAINT "CompetitionRound_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "CompetitionRound"("id") ON DELETE SET NULL ON UPDATE CASCADE;
