import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Trophy, Target, CheckSquare, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id!;

  const [dartsPlayer, pendingChallenges, acceptedChallenges, totalPlayers] = await Promise.all([
    prisma.dartsPlayer.findUnique({
      where: { userId },
      include: { eloHistory: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
    prisma.dartsChallenge.count({ where: { opponentId: userId, status: "PENDING" } }),
    prisma.dartsChallenge.count({
      where: {
        OR: [{ challengerId: userId }, { opponentId: userId }],
        status: "ACCEPTED",
        match: null,
      },
    }),
    prisma.dartsPlayer.count(),
  ]);

  const myRank = dartsPlayer
    ? await prisma.dartsPlayer.count({ where: { currentElo: { gt: dartsPlayer.currentElo } } }) + 1
    : null;

  const lastEloDiff = dartsPlayer?.eloHistory[0]
    ? dartsPlayer.eloHistory[0].ratingAfter - dartsPlayer.eloHistory[0].ratingBefore
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Willkommen, {session?.user?.name ?? "du"} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Hier ist dein aktueller Stand.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tipps</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Aktive Wettbewerbe ansehen.</p>
            <Link href="/competitions" className={cn(buttonVariants({ variant: "link", size: "sm" }), "px-0 mt-1")}>
              Zu den Wettbewerben →
            </Link>
          </CardContent>
        </Card>

        <Card className={cn((pendingChallenges > 0 || acceptedChallenges > 0) && "border-primary/50")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Double-Trouble-Liga</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            {dartsPlayer ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{dartsPlayer.currentElo}</span>
                  <span className="text-xs text-muted-foreground">ELO</span>
                  {lastEloDiff !== null && (
                    <span className={cn("text-xs font-medium flex items-center gap-0.5", lastEloDiff >= 0 ? "text-green-600" : "text-destructive")}>
                      <TrendingUp className="h-3 w-3" />
                      {lastEloDiff >= 0 ? "+" : ""}{lastEloDiff}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Rang #{myRank} von {totalPlayers}
                </p>
                {pendingChallenges > 0 && (
                  <p className="text-xs font-medium text-destructive">
                    {pendingChallenges} offene Herausforderung{pendingChallenges > 1 ? "en" : ""}
                  </p>
                )}
                {acceptedChallenges > 0 && (
                  <p className="text-xs font-medium text-primary">
                    {acceptedChallenges} Match{acceptedChallenges > 1 ? "es" : ""} ohne Ergebnis
                  </p>
                )}
                <Link href="/darts" className={cn(buttonVariants({ variant: "link", size: "sm" }), "px-0")}>
                  Zur Liga →
                </Link>
              </>
            ) : (
              <>
                <p className="text-muted-foreground text-sm">Noch nicht registriert.</p>
                <Link href="/darts" className={cn(buttonVariants({ variant: "link", size: "sm" }), "px-0")}>
                  Jetzt mitmachen →
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Aufgaben</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Keine fälligen Aufgaben.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
