import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { registerDartsPlayer } from "@/app/actions/darts";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Target, TrendingUp, TrendingDown, Minus, Swords } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function DartsPage() {
  const session = await auth();
  const userId = session?.user?.id!;
  const isAdmin = session?.user?.role === "ADMIN";

  const myPlayer = await prisma.dartsPlayer.findUnique({
    where: { userId },
  });

  const league = await prisma.dartsLeague.findFirst({
    orderBy: { createdAt: "desc" },
  });

  const players = await prisma.dartsPlayer.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      eloHistory: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { currentElo: "desc" },
  });

  const recentMatches = await prisma.dartsMatch.findMany({
    orderBy: { playedAt: "desc" },
    take: 10,
    include: {
      playerA: { select: { name: true, email: true } },
      playerB: { select: { name: true, email: true } },
      winner: { select: { name: true, email: true } },
      challenge: true,
    },
  });

  const myPendingChallenges = await prisma.dartsChallenge.count({
    where: { opponentId: userId, status: "PENDING" },
  });

  const myAcceptedChallenges = await prisma.dartsChallenge.findMany({
    where: {
      OR: [{ challengerId: userId }, { opponentId: userId }],
      status: "ACCEPTED",
      match: null,
    },
    include: {
      challenger: { select: { name: true, email: true } },
      opponent: { select: { name: true, email: true } },
    },
  });

  const leagueConfig = league?.matchConfig as { legsToWin?: number } | null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Target className="h-6 w-6" /> Double-Trouble-Liga
          </h1>
          {league ? (
            <p className="text-muted-foreground mt-1">
              {league.name} · First to {leagueConfig?.legsToWin ?? 3} legs · K={league.kFactor}
            </p>
          ) : (
            <p className="text-muted-foreground mt-1">Noch keine Liga konfiguriert.</p>
          )}
        </div>
        <div className="flex gap-2">
          {myPendingChallenges > 0 && (
            <Link
              href="/darts/challenges"
              className={cn(buttonVariants({ variant: "destructive" }))}
            >
              <Swords className="h-4 w-4 mr-2" />
              {myPendingChallenges} offene Herausforderung{myPendingChallenges > 1 ? "en" : ""}
            </Link>
          )}
          <Link href="/darts/challenges" className={cn(buttonVariants({ variant: "outline" }))}>
            <Swords className="h-4 w-4 mr-2" />
            Herausforderungen
          </Link>
          {isAdmin && (
            <Link href="/admin/darts" className={cn(buttonVariants({ variant: "outline" }))}>
              Liga verwalten
            </Link>
          )}
        </div>
      </div>

      {/* Register CTA */}
      {!myPlayer && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-10 gap-4 text-center">
            <Target className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-semibold">Du bist noch nicht registriert</p>
              <p className="text-sm text-muted-foreground mt-1">
                Tritt der Liga bei, um Herausforderungen zu senden und Matches zu spielen.
              </p>
            </div>
            <form
              action={async () => {
                "use server";
                await registerDartsPlayer();
              }}
            >
              <Button type="submit">Jetzt registrieren</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* My current ELO */}
      {myPlayer && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Dein ELO</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{myPlayer.currentElo}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Rang #{players.findIndex((p) => p.userId === userId) + 1} von {players.length}
              </p>
              <Link
                href={`/darts/players/${userId}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3 w-full")}
              >
                Mein Profil
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Matches gespielt</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {recentMatches.filter(
                  (m) => m.playerAId === userId || m.playerBId === userId
                ).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Siege</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {recentMatches.filter((m) => m.winnerId === userId).length}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Accepted challenges needing result */}
      {myAcceptedChallenges.length > 0 && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-primary">
              <Swords className="h-4 w-4" /> Matches ausstehend
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {myAcceptedChallenges.map((c) => {
              const isChallenger = c.challengerId === userId;
              const other = isChallenger ? c.opponent : c.challenger;
              const otherName = other.name ?? other.email;
              return (
                <div key={c.id} className="flex items-center justify-between rounded-md border bg-background px-4 py-2">
                  <span className="text-sm">Match gegen <strong>{otherName}</strong> – Ergebnis fehlt noch</span>
                  <Link href={`/darts/matches/${c.id}`} className={cn(buttonVariants({ size: "sm" }))}>
                    Eintragen
                  </Link>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Standings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rangliste</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {players.length === 0 ? (
            <p className="text-muted-foreground text-sm p-6">Noch keine Spieler registriert.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Spieler</TableHead>
                  <TableHead className="text-right">ELO</TableHead>
                  <TableHead className="text-right">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map((p, i) => {
                  const last = p.eloHistory[0];
                  const diff = last ? last.ratingAfter - last.ratingBefore : 0;
                  const isMe = p.userId === userId;
                  return (
                    <TableRow key={p.id} className={isMe ? "bg-muted/40" : undefined}>
                      <TableCell className="text-muted-foreground font-medium">{i + 1}</TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/darts/players/${p.userId}`} className="hover:underline">
                          {p.user.name ?? p.user.email}
                        </Link>
                        {isMe && (
                          <Badge variant="outline" className="ml-2 text-xs">Du</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{p.currentElo}</TableCell>
                      <TableCell className="text-right">
                        {diff > 0 ? (
                          <span className="text-green-600 flex items-center justify-end gap-0.5 text-xs">
                            <TrendingUp className="h-3.5 w-3.5" />+{diff}
                          </span>
                        ) : diff < 0 ? (
                          <span className="text-destructive flex items-center justify-end gap-0.5 text-xs">
                            <TrendingDown className="h-3.5 w-3.5" />{diff}
                          </span>
                        ) : (
                          <span className="text-muted-foreground flex items-center justify-end gap-0.5 text-xs">
                            <Minus className="h-3.5 w-3.5" />0
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent matches */}
      {recentMatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Letzte Matches</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Match</TableHead>
                  <TableHead className="text-center">Ergebnis</TableHead>
                  <TableHead>Sieger</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentMatches.map((m) => {
                  const config = m.matchConfig as { legsA: number; legsB: number };
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(m.playedAt).toLocaleDateString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {m.playerA.name ?? m.playerA.email}
                        </span>
                        <span className="text-muted-foreground mx-2">vs.</span>
                        <span className="font-medium">
                          {m.playerB.name ?? m.playerB.email}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {config.legsA} – {config.legsB}
                      </TableCell>
                      <TableCell className="text-sm">
                        {m.winner?.name ?? m.winner?.email ?? "–"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
