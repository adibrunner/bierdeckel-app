import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { RecordMatchForm } from "@/components/darts/record-match-form";
import { MatchConfirmation } from "@/components/darts/match-confirmation";
import { Target, Trophy, ArrowLeft, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const CHALLENGE_STATUS_LABELS: Record<string, string> = {
  PENDING: "Offen",
  ACCEPTED: "Angenommen",
  COMPLETED: "Abgeschlossen",
  DECLINED: "Abgelehnt",
  EXPIRED: "Abgelaufen",
};

const MATCH_STATUS_LABELS: Record<string, string> = {
  PENDING_CONFIRMATION: "Ausstehend",
  CONFIRMED: "Bestätigt",
  DISPUTED: "Eskaliert",
};

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
          winner: { select: { id: true, name: true, email: true } },
          submittedBy: { select: { id: true, name: true, email: true } },
          legs: { orderBy: { legNumber: "asc" } },
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

  // Fetch leagues both players are members of
  const [challengerPlayer, opponentPlayer] = await Promise.all([
    prisma.dartsPlayer.findUnique({
      where: { userId: challenge.challengerId },
      select: { id: true, leagueMemberships: { select: { leagueId: true } } },
    }),
    prisma.dartsPlayer.findUnique({
      where: { userId: challenge.opponentId },
      select: { id: true, leagueMemberships: { select: { leagueId: true } } },
    }),
  ]);

  const challengerLeagueIds = new Set(challengerPlayer?.leagueMemberships.map((m) => m.leagueId) ?? []);
  const opponentLeagueIds = new Set(opponentPlayer?.leagueMemberships.map((m) => m.leagueId) ?? []);
  const sharedLeagueIds = [...challengerLeagueIds].filter((id) => opponentLeagueIds.has(id));

  const sharedLeagues = sharedLeagueIds.length > 0
    ? await prisma.dartsLeague.findMany({
        where: { id: { in: sharedLeagueIds } },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, matchConfig: true },
      })
    : await prisma.dartsLeague.findMany({
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, matchConfig: true },
      });

  const defaultLeague = sharedLeagues[0] ?? null;
  const leagueConfig = defaultLeague?.matchConfig as { legsToWin?: number } | null;
  const legsToWin = leagueConfig?.legsToWin ?? 3;

  const challengerName = challenge.challenger.name ?? challenge.challenger.email ?? "";
  const opponentName = challenge.opponent.name ?? challenge.opponent.email ?? "";

  const match = challenge.match;
  const matchConfig = match?.matchConfig as { legsA: number; legsB: number; avgA?: number | null; avgB?: number | null } | null;

  // Is the current user the one who needs to confirm?
  const isConfirmer =
    match?.status === "PENDING_CONFIRMATION" &&
    match.submittedById !== null &&
    (match.playerAId === match.submittedById
      ? match.playerBId === userId
      : match.playerAId === userId);

  // Is the current user the one who submitted (waiting)?
  const isSubmitter = match?.submittedById === userId;

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

      {/* Details card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base">Details</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Badge variant={challenge.status === "COMPLETED" ? "outline" : "default"}>
                {CHALLENGE_STATUS_LABELS[challenge.status] ?? challenge.status}
              </Badge>
              {match && (
                <Badge
                  variant={
                    match.status === "CONFIRMED"
                      ? "outline"
                      : match.status === "DISPUTED"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {MATCH_STATUS_LABELS[match.status] ?? match.status}
                </Badge>
              )}
            </div>
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
          {match?.playedAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gespielt am</span>
              <span>{new Date(match.playedAt).toLocaleDateString("de-DE")}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disputed — escalated to admin */}
      {match?.status === "DISPUTED" && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-4 w-4" /> An Admin eskaliert
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Dieses Match wurde angefochten. Ein Admin wird das Ergebnis überprüfen und ggf. korrigieren.
            </p>
            {match.disputeReason && (
              <div className="rounded-md bg-muted px-3 py-2 text-sm">
                <span className="font-medium">Begründung: </span>{match.disputeReason}
              </div>
            )}
            {matchConfig && (
              <div className="flex items-center justify-center text-xl font-bold py-1">
                <span>{challengerName}</span>
                <span className="mx-4 text-muted-foreground">{matchConfig.legsA} – {matchConfig.legsB}</span>
                <span>{opponentName}</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center">
              Eingetragen von: {match.submittedBy?.name ?? match.submittedBy?.email}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Confirmed — show final result */}
      {match?.status === "CONFIRMED" && matchConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4" /> Ergebnis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-lg font-bold">
              <span>{challengerName}</span>
              <span className="text-2xl">{matchConfig.legsA} – {matchConfig.legsB}</span>
              <span>{opponentName}</span>
            </div>
            <p className="text-sm text-center text-muted-foreground">
              Sieger: <strong>{match.winner?.name ?? match.winner?.email}</strong>
            </p>

            {/* Averages */}
            {(matchConfig?.avgA != null || matchConfig?.avgB != null) && (
              <div className="flex justify-around rounded-md bg-muted/50 py-2 text-sm">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">{challengerName}</p>
                  <p className="font-semibold">{matchConfig?.avgA ?? "–"}</p>
                </div>
                <div className="text-center text-xs text-muted-foreground self-center">Ø Average</div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">{opponentName}</p>
                  <p className="font-semibold">{matchConfig?.avgB ?? "–"}</p>
                </div>
              </div>
            )}

            {/* Leg breakdown */}
            {match.legs.length > 0 && match.legs.some((l) => l.winnerId !== null) && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Legs</p>
                <div className="divide-y text-xs">
                  {match.legs.map((leg) => {
                    const legData = leg.legData as { winner?: string; checkout?: number } | null;
                    const winnerName = leg.winnerId === challenge.challengerId
                      ? challengerName
                      : leg.winnerId === challenge.opponentId
                      ? opponentName
                      : "–";
                    return (
                      <div key={leg.id} className="flex justify-between py-1.5">
                        <span className="text-muted-foreground">Leg {leg.legNumber}</span>
                        <span className="font-medium">
                          {winnerName}
                          {legData?.checkout ? (
                            <span className="ml-1.5 text-muted-foreground font-normal">({legData.checkout} checkout)</span>
                          ) : null}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="divide-y text-sm">
              {match.eloHistory.map((h) => {
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
          </CardContent>
        </Card>
      )}

      {/* Pending confirmation — show to the non-submitter */}
      {match?.status === "PENDING_CONFIRMATION" && matchConfig && isConfirmer && (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="text-base">Ergebnis bestätigen</CardTitle>
          </CardHeader>
          <CardContent>
            <MatchConfirmation
              matchId={match.id}
              challengeId={challenge.id}
              submittedByName={match.submittedBy?.name ?? match.submittedBy?.email ?? "Dein Mitspieler"}
              config={matchConfig}
              challengerName={challengerName}
              opponentName={opponentName}
            />
          </CardContent>
        </Card>
      )}

      {/* Pending confirmation — waiting view for the submitter */}
      {match?.status === "PENDING_CONFIRMATION" && isSubmitter && (
        <Card>
          <CardContent className="py-6 text-center space-y-1">
            <p className="text-sm font-medium">Warte auf Bestätigung</p>
            <p className="text-sm text-muted-foreground">
              Der andere Spieler muss das Ergebnis noch bestätigen oder anfechten.
            </p>
          </CardContent>
        </Card>
      )}

      {/* No match yet — show record form */}
      {!match && challenge.status === "ACCEPTED" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ergebnis eintragen</CardTitle>
          </CardHeader>
          <CardContent>
            <RecordMatchForm
              challengeId={challenge.id}
              legsToWin={legsToWin}
              challengerName={challengerName}
              opponentName={opponentName}
              leagues={sharedLeagues}
              defaultLeagueId={defaultLeague?.id}
            />
          </CardContent>
        </Card>
      )}

      {!match && challenge.status !== "ACCEPTED" && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Die Herausforderung muss erst angenommen werden, bevor ein Ergebnis eingetragen werden kann.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
