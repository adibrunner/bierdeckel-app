import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { RecordMatchForm } from "@/components/darts/record-match-form";
import { Target, Trophy, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id!;
  const isAdmin = session?.user?.role === "ADMIN";

  const challenge = await prisma.dartsChallenge.findUnique({
    where: { id },
    include: {
      challenger: { select: { id: true, name: true, email: true } },
      opponent: { select: { id: true, name: true, email: true } },
      match: {
        include: {
          winner: { select: { name: true, email: true } },
          eloHistory: {
            include: { player: { include: { user: { select: { name: true, email: true } } } } },
          },
        },
      },
    },
  });

  if (!challenge) notFound();

  const isInvolved =
    challenge.challengerId === userId || challenge.opponentId === userId || isAdmin;
  if (!isInvolved) notFound();

  const league = await prisma.dartsLeague.findFirst({ orderBy: { createdAt: "desc" } });
  const leagueConfig = league?.matchConfig as { legsToWin?: number } | null;
  const legsToWin = leagueConfig?.legsToWin ?? 3;

  const challengerName = challenge.challenger.name ?? challenge.challenger.email;
  const opponentName = challenge.opponent.name ?? challenge.opponent.email;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Link
        href="/darts"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 text-muted-foreground")}
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Liga-Übersicht
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Target className="h-6 w-6" /> Match
        </h1>
        <p className="text-muted-foreground mt-1">
          {challengerName} vs. {opponentName}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Details</CardTitle>
            <Badge variant={challenge.status === "COMPLETED" ? "outline" : "default"}>
              {{ PENDING: "Offen", ACCEPTED: "Angenommen", COMPLETED: "Abgeschlossen", DECLINED: "Abgelehnt", EXPIRED: "Abgelaufen" }[challenge.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Format</span>
            <span className="font-medium">First to {legsToWin} Legs</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Herausforderung</span>
            <span>{new Date(challenge.createdAt).toLocaleDateString("de-DE")}</span>
          </div>
        </CardContent>
      </Card>

      {/* Result — already recorded */}
      {challenge.match ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4" /> Ergebnis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              const config = challenge.match.matchConfig as { legsA: number; legsB: number };
              return (
                <>
                  <div className="flex items-center justify-between text-lg font-bold">
                    <span>{challengerName}</span>
                    <span className="text-2xl">{config.legsA} – {config.legsB}</span>
                    <span>{opponentName}</span>
                  </div>
                  <p className="text-sm text-center text-muted-foreground">
                    Sieger: <strong>{challenge.match.winner?.name ?? challenge.match.winner?.email}</strong>
                  </p>
                  <div className="divide-y text-sm">
                    {challenge.match.eloHistory.map((h) => {
                      const diff = h.ratingAfter - h.ratingBefore;
                      return (
                        <div key={h.id} className="flex justify-between py-2">
                          <span>{h.player.user.name ?? h.player.user.email}</span>
                          <span>
                            {h.ratingBefore} →{" "}
                            <strong>{h.ratingAfter}</strong>{" "}
                            <span className={diff >= 0 ? "text-green-600" : "text-destructive"}>
                              ({diff >= 0 ? "+" : ""}{diff})
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>
      ) : challenge.status === "ACCEPTED" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ergebnis eintragen</CardTitle>
          </CardHeader>
          <CardContent>
            <RecordMatchForm
              challengeId={challenge.id}
              legsToWin={legsToWin}
              challengerName={challengerName ?? ""}
              opponentName={opponentName ?? ""}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Die Herausforderung muss erst angenommen werden, bevor ein Ergebnis eingetragen werden kann.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
