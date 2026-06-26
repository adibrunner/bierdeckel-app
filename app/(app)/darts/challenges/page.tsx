import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SendChallengeForm } from "@/components/darts/send-challenge-form";
import { ChallengeActions } from "@/components/darts/challenge-actions";
import { Swords, Clock, CheckCircle2, XCircle } from "lucide-react";

const statusLabel: Record<string, string> = {
  PENDING: "Offen",
  ACCEPTED: "Angenommen",
  COMPLETED: "Abgeschlossen",
  DECLINED: "Abgelehnt",
  EXPIRED: "Abgelaufen",
};

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  PENDING: "default",
  ACCEPTED: "secondary",
  COMPLETED: "outline",
  DECLINED: "destructive",
  EXPIRED: "outline",
};

export default async function ChallengesPage() {
  const session = await auth();
  const userId = session?.user?.id!;

  const myPlayer = await prisma.dartsPlayer.findUnique({ where: { userId } });

  // Other registered players I can challenge
  const otherPlayers = await prisma.dartsPlayer.findMany({
    where: { userId: { not: userId } },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { currentElo: "desc" },
  });

  // Challenges I received
  const received = await prisma.dartsChallenge.findMany({
    where: { opponentId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      challenger: { select: { name: true, email: true } },
      match: { select: { id: true, matchConfig: true } },
    },
  });

  // Challenges I sent
  const sent = await prisma.dartsChallenge.findMany({
    where: { challengerId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      opponent: { select: { name: true, email: true } },
      match: { select: { id: true, matchConfig: true } },
    },
  });

  // Accepted challenges where I'm involved and no match yet
  const acceptedPending = [...received, ...sent]
    .filter((c) => c.status === "ACCEPTED" && !c.match)
    .map((c) => ({ ...c, isChallenger: "challenger" in c }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Swords className="h-6 w-6" /> Herausforderungen
        </h1>
        <p className="text-muted-foreground mt-1">Sende und verwalte deine 1-vs-1 Challenges.</p>
      </div>

      {/* Send challenge */}
      {myPlayer ? (
        <SendChallengeForm players={otherPlayers.map((p) => ({ id: p.userId, name: p.user.name ?? p.user.email ?? p.userId }))} />
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center text-muted-foreground text-sm">
            Du musst dich zuerst auf der{" "}
            <a href="/darts" className="underline">Darts-Seite</a>{" "}
            registrieren.
          </CardContent>
        </Card>
      )}

      {/* Accepted — needs result */}
      {acceptedPending.length > 0 && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Angenommen – Ergebnis ausstehend
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {acceptedPending.map((c) => {
              const name = "challenger" in c
                ? (c as typeof received[0]).challenger.name ?? (c as typeof received[0]).challenger.email
                : (c as typeof sent[0]).opponent.name ?? (c as typeof sent[0]).opponent.email;
              const direction = received.find((r) => r.id === c.id) ? "von" : "gegen";
              return (
                <div key={c.id} className="flex items-center justify-between rounded-md border px-4 py-3">
                  <span className="text-sm font-medium">
                    {direction} <strong>{name}</strong>
                  </span>
                  <ChallengeActions
                    challengeId={c.id}
                    status={c.status}
                    isOpponent={received.some((r) => r.id === c.id)}
                    hasMatch={false}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Received */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" /> Erhaltene Herausforderungen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {received.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Herausforderungen erhalten.</p>
          ) : (
            received.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-md border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">
                    von <strong>{c.challenger.name ?? c.challenger.email}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(c.createdAt).toLocaleDateString("de-DE")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={statusVariant[c.status]}>{statusLabel[c.status]}</Badge>
                  <ChallengeActions
                    challengeId={c.id}
                    status={c.status}
                    isOpponent={true}
                    hasMatch={!!c.match}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Sent */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <XCircle className="h-4 w-4" /> Gesendete Herausforderungen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Herausforderungen gesendet.</p>
          ) : (
            sent.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-md border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">
                    an <strong>{c.opponent.name ?? c.opponent.email}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(c.createdAt).toLocaleDateString("de-DE")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={statusVariant[c.status]}>{statusLabel[c.status]}</Badge>
                  <ChallengeActions
                    challengeId={c.id}
                    status={c.status}
                    isOpponent={false}
                    hasMatch={!!c.match}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
