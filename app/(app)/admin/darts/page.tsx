import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { CreateLeagueForm } from "@/components/darts/create-league-form";
import { AdminMatchControls } from "@/components/darts/admin-match-controls";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Target, Users, ShieldAlert } from "lucide-react";
import { DeleteLeagueButton } from "@/components/darts/delete-league-button";
import { EditLeagueButton } from "@/components/darts/edit-league-button";

export default async function AdminDartsPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") notFound();

  const leagues = await prisma.dartsLeague.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { matches: true } },
      members: {
        include: { player: { include: { user: { select: { name: true, email: true } } } } },
      },
    },
  });

  const players = await prisma.dartsPlayer.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { currentElo: "desc" },
  });

  const totalMatches = await prisma.dartsMatch.count();

  const disputedMatches = await prisma.dartsMatch.findMany({
    where: { status: "DISPUTED" },
    orderBy: { playedAt: "desc" },
    include: {
      playerA: { select: { name: true, email: true } },
      playerB: { select: { name: true, email: true } },
      submittedBy: { select: { name: true, email: true } },
      league: { select: { matchConfig: true } },
    },
  });

  const allMatches = await prisma.dartsMatch.findMany({
    where: { status: { in: ["CONFIRMED", "PENDING_CONFIRMATION"] } },
    orderBy: { playedAt: "desc" },
    include: {
      playerA: { select: { name: true, email: true } },
      playerB: { select: { name: true, email: true } },
      league: { select: { matchConfig: true } },
    },
  });

  const league = await prisma.dartsLeague.findFirst({ orderBy: { createdAt: "desc" } });
  const defaultLegsToWin = (league?.matchConfig as { legsToWin?: number } | null)?.legsToWin ?? 3;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Target className="h-6 w-6" /> Darts-Liga verwalten
        </h1>
        <p className="text-muted-foreground mt-1">
          {players.length} Spieler · {totalMatches} Matches gespielt
        </p>
      </div>

      {/* Disputed matches queue */}
      {disputedMatches.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-4 w-4" />
              Eskalierte Matches ({disputedMatches.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {disputedMatches.map((m) => {
              const cfg = m.matchConfig as { legsA: number; legsB: number };
              const legsToWin =
                (m.league?.matchConfig as { legsToWin?: number } | null)?.legsToWin ?? defaultLegsToWin;
              const challengerName = m.playerA.name ?? m.playerA.email ?? "Spieler A";
              const opponentName = m.playerB.name ?? m.playerB.email ?? "Spieler B";
              return (
                <div key={m.id} className="space-y-3 rounded-md border p-4">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-medium text-sm">
                        {challengerName} vs. {opponentName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Gespielt: {new Date(m.playedAt).toLocaleDateString("de-DE")} ·
                        Eingetragen von: {m.submittedBy?.name ?? m.submittedBy?.email}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {cfg.legsA} – {cfg.legsB}
                    </Badge>
                  </div>
                  {m.disputeReason && (
                    <div className="rounded bg-muted px-3 py-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Begründung: </span>
                      {m.disputeReason}
                    </div>
                  )}
                  <AdminMatchControls
                    matchId={m.id}
                    legsToWin={legsToWin}
                    challengerName={challengerName}
                    opponentName={opponentName}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Create league */}
      <CreateLeagueForm />

      {/* Existing leagues */}
      {leagues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ligen</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead className="text-right">K-Faktor</TableHead>
                  <TableHead className="text-right">Start-ELO</TableHead>
                  <TableHead className="text-right">Matches</TableHead>
                  <TableHead>Erstellt</TableHead>
                  <TableHead>Mitglieder</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {leagues.map((l) => {
                  const cfg = l.matchConfig as { legsToWin?: number; startingScore?: number };
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {cfg.startingScore ?? 501} · First to {cfg.legsToWin ?? 3} Legs
                      </TableCell>
                      <TableCell className="text-right">{l.kFactor}</TableCell>
                      <TableCell className="text-right">{l.startingElo}</TableCell>
                      <TableCell className="text-right">{l._count.matches}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(l.createdAt).toLocaleDateString("de-DE")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {l.members.length === 0 ? (
                          <span className="text-muted-foreground">–</span>
                        ) : (
                          <span className="text-xs">
                            {l.members.map((m) => m.player.user.name ?? m.player.user.email).join(", ")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <EditLeagueButton league={l} />
                          <DeleteLeagueButton leagueId={l.id} leagueName={l.name} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* All matches — admin controls */}
      {allMatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" /> Alle Matches
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {allMatches.map((m) => {
              const cfg = m.matchConfig as { legsA: number; legsB: number };
              const legsToWin =
                (m.league?.matchConfig as { legsToWin?: number } | null)?.legsToWin ?? defaultLegsToWin;
              const challengerName = m.playerA.name ?? m.playerA.email ?? "Spieler A";
              const opponentName = m.playerB.name ?? m.playerB.email ?? "Spieler B";
              return (
                <div key={m.id} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-medium">
                      {challengerName} vs. {opponentName}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={m.status === "CONFIRMED" ? "outline" : "secondary"} className="text-xs">
                        {cfg.legsA} – {cfg.legsB}
                      </Badge>
                      <Badge variant={m.status === "CONFIRMED" ? "default" : "secondary"} className="text-xs">
                        {m.status === "CONFIRMED" ? "Bestätigt" : "Ausstehend"}
                      </Badge>
                    </div>
                  </div>
                  <AdminMatchControls
                    matchId={m.id}
                    legsToWin={legsToWin}
                    challengerName={challengerName}
                    opponentName={opponentName}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Players overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Registrierte Spieler
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {players.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6">Noch keine Spieler registriert.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">ELO</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map((p, i) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">
                      {p.user.name ?? p.user.email}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{p.currentElo}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
