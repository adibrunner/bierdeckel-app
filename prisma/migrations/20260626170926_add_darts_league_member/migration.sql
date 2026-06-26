-- CreateTable
CREATE TABLE "DartsLeagueMember" (
    "leagueId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DartsLeagueMember_pkey" PRIMARY KEY ("leagueId","playerId")
);

-- AddForeignKey
ALTER TABLE "DartsLeagueMember" ADD CONSTRAINT "DartsLeagueMember_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "DartsLeague"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DartsLeagueMember" ADD CONSTRAINT "DartsLeagueMember_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "DartsPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
