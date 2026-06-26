import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { CreateLeagueForm } from "@/components/darts/create-league-form";
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
import { Target, Users } from "lucide-react";

export default async function AdminDartsPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") notFound();

  const leagues = await prisma.dartsLeague.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { matches: true } } },
  });

  const players = await prisma.dartsPlayer.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { currentElo: "desc" },
  });

  const totalMatches = await prisma.dartsMatch.count();

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
                </TableRow>
              </TableHeader>
              <TableBody>
                {leagues.map((l) => {
                  const cfg = l.matchConfig as { legsToWin?: number };
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        First to {cfg.legsToWin ?? 3} Legs
                      </TableCell>
                      <TableCell className="text-right">{l.kFactor}</TableCell>
                      <TableCell className="text-right">{l.startingElo}</TableCell>
                      <TableCell className="text-right">{l._count.matches}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(l.createdAt).toLocaleDateString("de-DE")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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
