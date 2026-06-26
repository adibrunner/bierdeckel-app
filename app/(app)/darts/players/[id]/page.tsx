import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Target, Trophy, TrendingUp, TrendingDown, Minus, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { EloChart } from "@/components/darts/elo-chart";

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const currentUserId = session?.user?.id!;

  // id can be either a DartsPlayer.id or a userId
  const player = await prisma.dartsPlayer.findFirst({
    where: { OR: [{ id }, { userId: id }] },
    include: {
      user: { select: { id: true, name: true, email: true } },
      eloHistory: {
        orderBy: { createdAt: "asc" },
        include: {
          match: {
            include: {
              playerA: { select: { name: true, email: true } },
              playerB: { select: { name: true, email: true } },
              winner: { select: { id: true } },
            },
          },
        },
      },
    },
  });

  if (!player) notFound();

  const isMe = player.userId === currentUserId;
  const displayName = player.user.name ?? player.user.email ?? "Unbekannt";

  // All matches this player was in
  const matches = await prisma.dartsMatch.findMany({
    where: { OR: [{ playerAId: player.userId }, { playerBId: player.userId }] },
    orderBy: { playedAt: "desc" },
    include: {
      playerA: { select: { id: true, name: true, email: true } },
      playerB: { select: { id: true, name: true, email: true } },
      winner: { select: { id: true, name: true, email: true } },
    },
  });

  const wins = matches.filter((m) => m.winnerId === player.userId).length;
  const losses = matches.length - wins;
  const winRate = matches.length > 0 ? Math.round((wins / matches.length) * 100) : 0;

  // Personal best ELO
  const peakElo = player.eloHistory.reduce(
    (max, h) => Math.max(max, h.ratingAfter),
    player.eloHistory[0]?.ratingBefore ?? player.currentElo
  );
  const isAtPeak = player.currentElo === peakElo && player.eloHistory.length > 0;

  // Career average (mean of all recorded match averages for this player)
  const matchAvgs = matches.flatMap((m) => {
    const cfg = m.matchConfig as { legsA: number; legsB: number; avgA?: number | null; avgB?: number | null } | null;
    const isPlayerA = m.playerAId === player.userId;
    const avg = isPlayerA ? cfg?.avgA : cfg?.avgB;
    return avg != null ? [avg] : [];
  });
  const careerAvg = matchAvgs.length > 0
    ? (matchAvgs.reduce((s, v) => s + v, 0) / matchAvgs.length).toFixed(1)
    : null;

  // Nemesis: opponent you've lost to most
  const lossMap = new Map<string, { name: string; count: number }>();
  for (const m of matches) {
    if (m.winnerId !== player.userId) {
      const isPlayerA = m.playerAId === player.userId;
      const opp = isPlayerA ? m.playerB : m.playerA;
      const oppId = isPlayerA ? m.playerBId : m.playerAId;
      const oppName = opp.name ?? opp.email ?? oppId;
      const prev = lossMap.get(oppId);
      lossMap.set(oppId, { name: oppName, count: (prev?.count ?? 0) + 1 });
    }
  }
  const nemesis = [...lossMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)[0] ?? null;

  // ELO chart data
  const eloPoints = [
    { label: "Start", elo: player.eloHistory[0]?.ratingBefore ?? player.currentElo },
    ...player.eloHistory.map((h, i) => ({
      label: `M${i + 1}`,
      elo: h.ratingAfter,
    })),
  ];

  // Rank
  const rank = await prisma.dartsPlayer.count({
    where: { currentElo: { gt: player.currentElo } },
  });

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="flex items-start gap-4">
        <Link
          href="/darts"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 text-muted-foreground self-start")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Zurück
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            {displayName}
            {isMe && <Badge variant="outline" className="text-xs">Du</Badge>}
          </h1>
          <p className="text-muted-foreground text-sm">Rang #{rank + 1} · ELO {player.currentElo}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Siege</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{wins}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Niederlagen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{losses}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Siegquote</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{winRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Career average */}
      {careerAvg !== null && (
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> Ø Match-Average
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0.5">
            <p className="text-3xl font-bold">{careerAvg}</p>
            <p className="text-xs text-muted-foreground">Über {matchAvgs.length} {matchAvgs.length === 1 ? "Match" : "Matches"}</p>
          </CardContent>
        </Card>
      )}

      {/* Personal best + Nemesis */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5" /> Persönliche Bestmarke
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0.5">
            <p className="text-3xl font-bold">{peakElo}</p>
            {isAtPeak ? (
              <p className="text-xs text-green-600 font-medium">Aktuelles Maximum</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                aktuell {player.currentElo} ({player.currentElo - peakElo})
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <TrendingDown className="h-3.5 w-3.5 text-destructive" /> Nemesis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0.5">
            {nemesis ? (
              <>
                <p className="text-xl font-bold truncate">{nemesis[1].name}</p>
                <p className="text-xs text-muted-foreground">
                  {nemesis[1].count} {nemesis[1].count === 1 ? "Niederlage" : "Niederlagen"}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground pt-1">Noch keine Niederlagen.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ELO chart */}
      {eloPoints.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> ELO-Verlauf
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EloChart data={eloPoints} />
          </CardContent>
        </Card>
      )}

      {/* Match history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" /> Matchverlauf
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {matches.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6">Noch keine Matches gespielt.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Gegner</TableHead>
                  <TableHead className="text-center">Ergebnis</TableHead>
                  <TableHead className="text-center">Avg</TableHead>
                  <TableHead className="text-center">ELO</TableHead>
                  <TableHead className="text-right">Ergebnis</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matches.map((m) => {
                  const isPlayerA = m.playerAId === player.userId;
                  const opponent = isPlayerA ? m.playerB : m.playerA;
                  const opponentName = opponent.name ?? opponent.email;
                  const cfg = m.matchConfig as { legsA: number; legsB: number; avgA?: number | null; avgB?: number | null } | null;
                  const myLegs = isPlayerA ? (cfg?.legsA ?? 0) : (cfg?.legsB ?? 0);
                  const oppLegs = isPlayerA ? (cfg?.legsB ?? 0) : (cfg?.legsA ?? 0);
                  const won = m.winnerId === player.userId;
                  const myAvg = isPlayerA ? cfg?.avgA : cfg?.avgB;
                  const eloEntry = player.eloHistory.find((h) => h.matchId === m.id);
                  const eloDiff = eloEntry ? eloEntry.ratingAfter - eloEntry.ratingBefore : null;

                  return (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(m.playedAt).toLocaleDateString("de-DE", {
                          day: "2-digit", month: "2-digit", year: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="font-medium">{opponentName}</TableCell>
                      <TableCell className="text-center font-semibold">
                        {myLegs} – {oppLegs}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {myAvg != null ? myAvg : <span className="text-muted-foreground">–</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        {eloDiff !== null ? (
                          <span className={cn("flex items-center justify-center gap-0.5 text-xs", eloDiff >= 0 ? "text-green-600" : "text-destructive")}>
                            {eloDiff >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {eloDiff >= 0 ? "+" : ""}{eloDiff}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs"><Minus className="h-3 w-3 inline" /></span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={won ? "default" : "destructive"} className="text-xs">
                          {won ? "Sieg" : "Niederlage"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
