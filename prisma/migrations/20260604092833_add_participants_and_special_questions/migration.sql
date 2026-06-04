/*
  Warnings:

  - You are about to drop the column `awayTeam` on the `Fixture` table. All the data in the column will be lost.
  - You are about to drop the column `homeTeam` on the `Fixture` table. All the data in the column will be lost.
  - Added the required column `awayParticipantId` to the `Fixture` table without a default value. This is not possible if the table is not empty.
  - Added the required column `homeParticipantId` to the `Fixture` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ParticipantType" AS ENUM ('PLAYER', 'COUNTRY', 'TEAM');

-- CreateEnum
CREATE TYPE "SpecialQuestionType" AS ENUM ('SINGLE_PARTICIPANT', 'MULTIPLE_PARTICIPANTS', 'NUMBER');

-- AlterTable
ALTER TABLE "Competition" ADD COLUMN     "participantType" "ParticipantType" NOT NULL DEFAULT 'TEAM';

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "type" "ParticipantType" NOT NULL,
    "imageUrl" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "nickname" TEXT,
    "worldRank" INTEGER,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- Insert placeholder for existing fixture rows
INSERT INTO "Participant" ("id", "name", "type", "createdAt", "updatedAt")
VALUES ('__placeholder__', 'Unbekannt', 'TEAM', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- AlterTable Fixture: nullable first, then backfill, then NOT NULL
ALTER TABLE "Fixture"
  DROP COLUMN "awayTeam",
  DROP COLUMN "homeTeam",
  ADD COLUMN "awayParticipantId" TEXT,
  ADD COLUMN "homeParticipantId" TEXT,
  ADD COLUMN "round" TEXT;

UPDATE "Fixture"
  SET "homeParticipantId" = '__placeholder__', "awayParticipantId" = '__placeholder__'
  WHERE "homeParticipantId" IS NULL OR "awayParticipantId" IS NULL;

ALTER TABLE "Fixture"
  ALTER COLUMN "homeParticipantId" SET NOT NULL,
  ALTER COLUMN "awayParticipantId" SET NOT NULL;

-- CreateTable
CREATE TABLE "SpecialQuestion" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "description" TEXT,
    "type" "SpecialQuestionType" NOT NULL,
    "points" INTEGER NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "requiredCount" INTEGER,
    "usePercentageTolerance" BOOLEAN NOT NULL DEFAULT false,
    "correctAnswer" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecialQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialAnswer" (
    "id" TEXT NOT NULL,
    "specialQuestionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "pointsAwarded" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "singleParticipantId" TEXT,

    CONSTRAINT "SpecialAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SpecialAnswer_specialQuestionId_userId_key" ON "SpecialAnswer"("specialQuestionId", "userId");

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_homeParticipantId_fkey" FOREIGN KEY ("homeParticipantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_awayParticipantId_fkey" FOREIGN KEY ("awayParticipantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialQuestion" ADD CONSTRAINT "SpecialQuestion_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialAnswer" ADD CONSTRAINT "SpecialAnswer_specialQuestionId_fkey" FOREIGN KEY ("specialQuestionId") REFERENCES "SpecialQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialAnswer" ADD CONSTRAINT "SpecialAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialAnswer" ADD CONSTRAINT "SpecialAnswer_singleParticipantId_fkey" FOREIGN KEY ("singleParticipantId") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
