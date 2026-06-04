import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
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
import { AddFixtureForm } from "@/components/competitions/add-fixture-form";
import { PredictionRow } from "@/components/competitions/prediction-row";
import { EnterResultForm } from "@/components/competitions/enter-result-form";
import { AddSpecialQuestionForm } from "@/components/competitions/add-special-question-form";
import { SpecialQuestionCard } from "@/components/competitions/special-question-card";
import { ManageRoundsPanel } from "@/components/competitions/manage-rounds-panel";
import { CalendarDays, Trophy, Lock, Star } from "lucide-react";

const fixtureStatusLabel: Record<string, string> = {
  SCHEDULED: "Geplant",
  LIVE: "Live",
  FINISHED: "Beendet",
  CANCELLED: "Abgesagt",
};

export default async function CompetitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const userId = session?.user?.id!;

  const competition = await prisma.competition.findUnique({
    where: { id },
    include: {
      scoringRules: true,
      rounds: { orderBy: { order: "asc" } },
      fixtures: {
        orderBy: { startsAt: "asc" },
        include: {
          homeParticipant: true,
          awayParticipant: true,
          round: true,
          predictions: {
            where: { userId },
          },
        },
      },
    },
  });

  if (!competition) notFound();

  const specialQuestions = await prisma.specialQuestion.findMany({
    where: { competitionId: id, isActive: true },
    orderBy: { deadline: "asc" },
    include: {
      answers: { where: { userId } },
    },
  });

  const participants = await prisma.participant.findMany({
    where: { type: competition.participantType },
    orderBy: { name: "asc" },
    select: { id: true, name: true, shortName: true },
  });

  const rules = competition.scoringRules[0]?.ruleDefinition as {
    correctScore: number;
    correctWinner: number;
    correctDraw: number;
  } | null;

  // ─── Leaderboard ─────────────────────────────────────────────────────────────
  const allPredictions = await prisma.prediction.findMany({
    where: {
      fixture: { competitionId: id },
      pointsAwarded: { not: null },
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const standingsMap = new Map<
    string,
    { name: string; points: number; correct: number; total: number }
  >();

  for (const pred of allPredictions) {
    const key = pred.userId;
    const existing = standingsMap.get(key) ?? {
      name: pred.user.name ?? pred.user.email ?? "?",
      points: 0,
      correct: 0,
      total: 0,
    };
    existing.points += pred.pointsAwarded ?? 0;
    existing.total += 1;
    if ((pred.pointsAwarded ?? 0) > 0) existing.correct += 1;
    standingsMap.set(key, existing);
  }

  const standings = [...standingsMap.values()].sort((a, b) => b.points - a.points);

  const now = new Date();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{competition.name}</h1>
          <p className="text-muted-foreground mt-1">{competition.sport}</p>
          {competition.description && (
            <p className="text-sm text-muted-foreground mt-1">{competition.description}</p>
          )}
          <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            <span>
              {new Date(competition.startDate).toLocaleDateString("de-DE")}
              {competition.endDate
                ? ` – ${new Date(competition.endDate).toLocaleDateString("de-DE")}`
                : ""}
            </span>
          </div>
        </div>
        <Badge variant={competition.status === "ACTIVE" ? "default" : "secondary"}>
          {{ ACTIVE: "Aktiv", FINISHED: "Abgeschlossen", ARCHIVED: "Archiviert" }[competition.status] ?? competition.status}
        </Badge>
      </div>

      {/* Scoring rules info */}
      {rules && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>Exaktes Ergebnis: <strong className="text-foreground">{rules.correctScore} Pkt.</strong></span>
          <span>Richtiger Gewinner: <strong className="text-foreground">{rules.correctWinner} Pkt.</strong></span>
          <span>Unentschieden: <strong className="text-foreground">{rules.correctDraw} Pkt.</strong></span>
        </div>
      )}

      {/* Admin tools */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Verwaltung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ManageRoundsPanel competitionId={id} rounds={competition.rounds} />
            <div>
              <p className="text-sm font-semibold mb-3">Spiel hinzufügen</p>
              <AddFixtureForm competitionId={id} participants={participants} rounds={competition.rounds} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fixtures + predictions — grouped by round */}
      {(() => {
        if (competition.fixtures.length === 0) {
          return (
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground text-sm">Noch keine Spiele eingetragen.</p>
              </CardContent>
            </Card>
          );
        }

        // Group fixtures: keyed by roundId (or null for unassigned)
        const roundOrder = competition.rounds.map((r) => r.id);
        const grouped = new Map<string | null, typeof competition.fixtures>();
        for (const f of competition.fixtures) {
          const key = f.roundId ?? null;
          if (!grouped.has(key)) grouped.set(key, []);
          grouped.get(key)!.push(f);
        }
        // Sort groups: rounds in order, then unassigned last
        const sortedKeys: (string | null)[] = [
          ...roundOrder.filter((rid) => grouped.has(rid)),
          ...(grouped.has(null) ? [null] : []),
        ];

        return (
          <div className="space-y-4">
            {sortedKeys.map((roundId) => {
              const roundObj = roundId ? competition.rounds.find((r) => r.id === roundId) : null;
              const matchFormat = (roundObj?.matchFormat ?? "SCORE") as "SCORE" | "SETS" | "WINNER_ONLY";
              const setsToWin = roundObj?.setsToWin ?? null;
              const fixtures = grouped.get(roundId)!;

              return (
                <Card key={roundId ?? "__none__"}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      {roundObj ? roundObj.name : "Spiele &amp; Tipps"}
                      {roundObj && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          {matchFormat === "SCORE" && "Ergebnis tipppen"}
                          {matchFormat === "SETS" && `Sets tipppen${setsToWin ? ` (First to ${setsToWin})` : ""}`}
                          {matchFormat === "WINNER_ONLY" && "Sieger tippen"}
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Datum</TableHead>
                          <TableHead>Spiel</TableHead>
                          <TableHead>Ergebnis</TableHead>
                          <TableHead>Dein Tipp</TableHead>
                          <TableHead className="text-right">Punkte</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fixtures.map((fixture) => {
                          const locked = fixture.startsAt <= now || fixture.status === "FINISHED";
                          const myPred = fixture.predictions[0];
                          const predVal = myPred?.prediction as { home: number; away: number } | undefined;
                          const result = fixture.result as { home: number; away: number } | null;
                          const fmtDisplay = matchFormat === "SETS" ? "-" : ":";

                          return (
                            <TableRow key={fixture.id}>
                              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                  {locked && <Lock className="h-3 w-3" />}
                                  {new Date(fixture.startsAt).toLocaleString("de-DE", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">
                                {fixture.homeParticipant.name}
                                <span className="text-muted-foreground mx-1">–</span>
                                {fixture.awayParticipant.name}
                              </TableCell>
                              <TableCell>
                                {fixture.status === "FINISHED" && result ? (
                                  <span className="font-semibold">
                                    {result.home} {fmtDisplay} {result.away}
                                  </span>
                                ) : isAdmin ? (
                                  <EnterResultForm
                                    fixtureId={fixture.id}
                                    matchFormat={matchFormat}
                                    setsToWin={setsToWin}
                                    homeName={fixture.homeParticipant.name}
                                    awayName={fixture.awayParticipant.name}
                                    existingHome={result?.home}
                                    existingAway={result?.away}
                                  />
                                ) : (
                                  <span className="text-xs text-muted-foreground">–</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <PredictionRow
                                  fixtureId={fixture.id}
                                  matchFormat={matchFormat}
                                  setsToWin={setsToWin}
                                  homeName={fixture.homeParticipant.name}
                                  awayName={fixture.awayParticipant.name}
                                  existingHome={predVal?.home}
                                  existingAway={predVal?.away}
                                  locked={locked}
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                {myPred?.pointsAwarded !== null && myPred?.pointsAwarded !== undefined ? (
                                  <span className="font-semibold">{myPred.pointsAwarded}</span>
                                ) : (
                                  <span className="text-muted-foreground">–</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        );
      })()}

      {/* Special Questions */}
      {(specialQuestions.length > 0 || isAdmin) && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Star className="h-5 w-5" /> Spezialtipps
          </h2>
          {isAdmin && <AddSpecialQuestionForm competitionId={id} />}
          <div className="grid gap-4 sm:grid-cols-2">
            {specialQuestions.map((sq) => (
              <SpecialQuestionCard
                key={sq.id}
                question={{
                  ...sq,
                  type: sq.type as "SINGLE_PARTICIPANT" | "MULTIPLE_PARTICIPANTS" | "NUMBER",
                }}
                participants={participants}
                existingAnswer={
                  sq.answers[0]
                    ? { answer: sq.answers[0].answer, pointsAwarded: sq.answers[0].pointsAwarded }
                    : undefined
                }
                isAdmin={isAdmin}
              />
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {standings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4" /> Tabelle
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Punkte</TableHead>
                  <TableHead className="text-right">Richtig</TableHead>
                  <TableHead className="text-right">Quote</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standings.map((s, i) => (
                  <TableRow key={s.name}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-right font-semibold">{s.points}</TableCell>
                    <TableCell className="text-right">{s.correct}/{s.total}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
