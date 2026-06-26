"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ─── Auth helpers ─────────────────────────────────────────────────────────────

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Nicht angemeldet.");
  return session;
}

async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN") throw new Error("Keine Berechtigung.");
  return session;
}

// ─── ELO calculation ─────────────────────────────────────────────────────────

function calcElo(
  ratingA: number,
  ratingB: number,
  actualA: number, // 1 = win, 0 = loss
  k = 32
): { newA: number; newB: number } {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 - expectedA;
  return {
    newA: Math.round(ratingA + k * (actualA - expectedA)),
    newB: Math.round(ratingB + k * (1 - actualA - expectedB)),
  };
}

// ─── D1a: Register as darts player ───────────────────────────────────────────

export async function registerDartsPlayer(): Promise<{ error?: string }> {
  const session = await requireAuth();
  const existing = await prisma.dartsPlayer.findUnique({
    where: { userId: session.user.id },
  });
  if (existing) return { error: "Bereits registriert." };

  await prisma.dartsPlayer.create({
    data: { userId: session.user.id },
  });
  revalidatePath("/darts");
  return {};
}

// ─── D1a2: Join / leave a league ─────────────────────────────────────────────

export async function joinLeague(leagueId: string): Promise<{ error?: string }> {
  const session = await requireAuth();

  const player = await prisma.dartsPlayer.findUnique({ where: { userId: session.user.id } });
  if (!player) return { error: "Du bist noch nicht als Spieler registriert." };

  await prisma.dartsLeagueMember.upsert({
    where: { leagueId_playerId: { leagueId, playerId: player.id } },
    create: { leagueId, playerId: player.id },
    update: {},
  });

  revalidatePath("/darts");
  revalidatePath("/admin/darts");
  return {};
}

export async function leaveLeague(leagueId: string): Promise<{ error?: string }> {
  const session = await requireAuth();

  const player = await prisma.dartsPlayer.findUnique({ where: { userId: session.user.id } });
  if (!player) return { error: "Spieler nicht gefunden." };

  await prisma.dartsLeagueMember.deleteMany({
    where: { leagueId, playerId: player.id },
  });

  revalidatePath("/darts");
  revalidatePath("/admin/darts");
  return {};
}

// ─── D1b: Send challenge ──────────────────────────────────────────────────────

const CHALLENGE_EXPIRY_DAYS = 7;

const SendChallengeSchema = z.object({
  opponentId: z.string().min(1, "Gegner erforderlich."),
});

export type ChallengeState = { error?: string; errors?: Record<string, string[]> } | undefined;

export async function sendChallenge(
  _prev: ChallengeState,
  formData: FormData
): Promise<ChallengeState> {
  const session = await requireAuth();

  const parsed = SendChallengeSchema.safeParse({
    opponentId: formData.get("opponentId"),
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { opponentId } = parsed.data;
  if (opponentId === session.user.id) return { error: "Du kannst dich nicht selbst herausfordern." };

  // Check both are registered players
  const [challenger, opponent] = await Promise.all([
    prisma.dartsPlayer.findUnique({ where: { userId: session.user.id } }),
    prisma.dartsPlayer.findUnique({ where: { userId: opponentId } }),
  ]);
  if (!challenger) return { error: "Du bist noch nicht als Spieler registriert." };
  if (!opponent) return { error: "Gegner ist noch nicht als Spieler registriert." };

  // No duplicate pending challenge
  const dupe = await prisma.dartsChallenge.findFirst({
    where: {
      challengerId: session.user.id,
      opponentId,
      status: "PENDING",
    },
  });
  if (dupe) return { error: "Du hast diesem Spieler bereits eine offene Herausforderung gesendet." };

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + CHALLENGE_EXPIRY_DAYS);

  await prisma.dartsChallenge.create({
    data: { challengerId: session.user.id, opponentId, expiresAt },
  });
  revalidatePath("/darts");
  revalidatePath("/darts/challenges");
  return {};
}

// ─── D1c: Accept / decline challenge ─────────────────────────────────────────

export async function respondToChallenge(
  challengeId: string,
  action: "ACCEPTED" | "DECLINED"
): Promise<{ error?: string }> {
  const session = await requireAuth();

  const challenge = await prisma.dartsChallenge.findUnique({
    where: { id: challengeId },
  });
  if (!challenge) return { error: "Herausforderung nicht gefunden." };
  if (challenge.opponentId !== session.user.id) return { error: "Keine Berechtigung." };
  if (challenge.status !== "PENDING") return { error: "Herausforderung ist nicht mehr offen." };

  await prisma.dartsChallenge.update({
    where: { id: challengeId },
    data: { status: action },
  });
  revalidatePath("/darts");
  revalidatePath("/darts/challenges");
  return {};
}

// ─── Shared ELO application helper ───────────────────────────────────────────

async function applyElo(
  tx: Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
  matchId: string,
  challengerUserId: string,
  opponentUserId: string,
  legsA: number,
  legsB: number,
  kFactor: number
) {
  const [playerA, playerB] = await Promise.all([
    tx.dartsPlayer.findUnique({ where: { userId: challengerUserId } }),
    tx.dartsPlayer.findUnique({ where: { userId: opponentUserId } }),
  ]);
  if (!playerA || !playerB) throw new Error("Spieler nicht gefunden.");

  const actualA = legsA > legsB ? 1 : 0;
  const { newA, newB } = calcElo(playerA.currentElo, playerB.currentElo, actualA, kFactor);

  await Promise.all([
    tx.dartsPlayer.update({ where: { userId: challengerUserId }, data: { currentElo: newA } }),
    tx.dartsPlayer.update({ where: { userId: opponentUserId }, data: { currentElo: newB } }),
    tx.eloHistory.createMany({
      data: [
        { playerId: playerA.id, matchId, ratingBefore: playerA.currentElo, ratingAfter: newA },
        { playerId: playerB.id, matchId, ratingBefore: playerB.currentElo, ratingAfter: newB },
      ],
    }),
  ]);
}

async function reverseElo(
  tx: Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
  matchId: string
) {
  const history = await tx.eloHistory.findMany({ where: { matchId } });
  await Promise.all(
    history.map((h) =>
      tx.dartsPlayer.update({
        where: { id: h.playerId },
        data: { currentElo: h.ratingBefore },
      })
    )
  );
  await tx.eloHistory.deleteMany({ where: { matchId } });
}

// ─── D1d: Record match result (step 1 — submit, awaiting confirmation) ────────

const LegDataSchema = z.object({
  winner: z.enum(["A", "B"]),
  checkout: z.coerce.number().int().min(1).max(170).optional(),
});

const RecordMatchSchema = z.object({
  challengeId: z.string().min(1),
  leagueId: z.string().optional(),
  legsA: z.coerce.number().int().min(0),
  legsB: z.coerce.number().int().min(0),
  avgA: z.coerce.number().min(0).max(170).optional(),
  avgB: z.coerce.number().min(0).max(170).optional(),
});

export type RecordMatchState = { error?: string; errors?: Record<string, string[]> } | undefined;

export async function recordMatch(
  _prev: RecordMatchState,
  formData: FormData
): Promise<RecordMatchState> {
  const session = await requireAuth();

  const parsed = RecordMatchSchema.safeParse({
    challengeId: formData.get("challengeId"),
    leagueId: formData.get("leagueId") || undefined,
    legsA: formData.get("legsA"),
    legsB: formData.get("legsB"),
    avgA: formData.get("avgA") || undefined,
    avgB: formData.get("avgB") || undefined,
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { challengeId, leagueId, legsA, legsB, avgA, avgB } = parsed.data;
  const totalLegs = legsA + legsB;

  // Parse per-leg data: leg_winner_1, leg_checkout_1, ...
  const legDataEntries = Array.from({ length: totalLegs }, (_, i) => {
    const n = i + 1;
    const raw = { winner: formData.get(`leg_winner_${n}`), checkout: formData.get(`leg_checkout_${n}`) || undefined };
    const result = LegDataSchema.safeParse(raw);
    return result.success ? result.data : null;
  });

  const challenge = await prisma.dartsChallenge.findUnique({
    where: { id: challengeId },
    include: { match: true },
  });
  if (!challenge) return { error: "Herausforderung nicht gefunden." };
  if (challenge.status !== "ACCEPTED") return { error: "Herausforderung wurde noch nicht angenommen." };
  if (challenge.match) return { error: "Ergebnis wurde bereits eingetragen." };
  if (
    challenge.challengerId !== session.user.id &&
    challenge.opponentId !== session.user.id &&
    session.user.role !== "ADMIN"
  ) {
    return { error: "Keine Berechtigung." };
  }
  if (legsA === legsB) return { error: "Kein Unentschieden möglich." };

  const winnerId = legsA > legsB ? challenge.challengerId : challenge.opponentId;

  const league = leagueId
    ? await prisma.dartsLeague.findUnique({ where: { id: leagueId } })
    : await prisma.dartsLeague.findFirst({ orderBy: { createdAt: "desc" } });

  const kFactor = league?.kFactor ?? 32;

  await prisma.$transaction(async (tx) => {
    const match = await tx.dartsMatch.create({
      data: {
        challengeId,
        leagueId: league?.id ?? null,
        playerAId: challenge.challengerId,
        playerBId: challenge.opponentId,
        winnerId,
        matchConfig: { legsA, legsB, avgA: avgA ?? null, avgB: avgB ?? null },
        playedAt: new Date(),
        status: "PENDING_CONFIRMATION",
        submittedById: session.user.id,
      },
    });

    await tx.dartsLeg.createMany({
      data: Array.from({ length: totalLegs }, (_, i) => {
        const legData = legDataEntries[i];
        const legWinnerId = legData?.winner === "A"
          ? challenge.challengerId
          : legData?.winner === "B"
          ? challenge.opponentId
          : null;
        return {
          matchId: match.id,
          legNumber: i + 1,
          winnerId: legWinnerId,
          legData: legData ? { winner: legData.winner, checkout: legData.checkout ?? null } : Prisma.JsonNull,
        };
      }),
    });

    await applyElo(tx, match.id, challenge.challengerId, challenge.opponentId, legsA, legsB, kFactor);
  });

  revalidatePath("/darts");
  revalidatePath("/darts/challenges");
  revalidatePath(`/darts/matches/${challengeId}`);
  return {};
}

// ─── D1e: Confirm result (step 2 — other player agrees) ──────────────────────

export async function confirmMatch(matchId: string): Promise<{ error?: string }> {
  const session = await requireAuth();

  const match = await prisma.dartsMatch.findUnique({
    where: { id: matchId },
    include: { challenge: true },
  });
  if (!match) return { error: "Match nicht gefunden." };
  if (match.status !== "PENDING_CONFIRMATION") return { error: "Dieses Match wartet nicht auf Bestätigung." };

  const otherUserId =
    match.playerAId === match.submittedById ? match.playerBId : match.playerAId;
  if (otherUserId !== session.user.id && session.user.role !== "ADMIN") {
    return { error: "Nur der andere Spieler kann das Ergebnis bestätigen." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.dartsMatch.update({ where: { id: matchId }, data: { status: "CONFIRMED" } });
    if (match.challengeId) {
      await tx.dartsChallenge.update({
        where: { id: match.challengeId },
        data: { status: "COMPLETED" },
      });
    }
  });

  revalidatePath("/darts");
  revalidatePath(`/darts/matches/${match.challengeId ?? matchId}`);
  return {};
}

// ─── D1f: Dispute result (escalate to admin) ─────────────────────────────────

const DisputeSchema = z.object({
  matchId: z.string().min(1),
  reason: z.string().min(5, "Bitte beschreibe das Problem kurz.").max(500),
});

export type DisputeState = { error?: string; errors?: Record<string, string[]> } | undefined;

export async function disputeMatch(
  _prev: DisputeState,
  formData: FormData
): Promise<DisputeState> {
  const session = await requireAuth();

  const parsed = DisputeSchema.safeParse({
    matchId: formData.get("matchId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { matchId, reason } = parsed.data;

  const match = await prisma.dartsMatch.findUnique({ where: { id: matchId } });
  if (!match) return { error: "Match nicht gefunden." };
  if (match.status !== "PENDING_CONFIRMATION") return { error: "Dieses Match kann nicht mehr eskaliert werden." };

  const otherUserId =
    match.playerAId === match.submittedById ? match.playerBId : match.playerAId;
  if (otherUserId !== session.user.id) {
    return { error: "Nur der andere Spieler kann das Ergebnis anfechten." };
  }

  await prisma.dartsMatch.update({
    where: { id: matchId },
    data: { status: "DISPUTED", disputeReason: reason },
  });

  revalidatePath("/darts");
  revalidatePath(`/darts/matches/${match.challengeId ?? matchId}`);
  revalidatePath("/admin/darts");
  return {};
}

// ─── D1g: Admin — override match result ──────────────────────────────────────

const AdminOverrideSchema = z.object({
  matchId: z.string().min(1),
  legsA: z.coerce.number().int().min(0),
  legsB: z.coerce.number().int().min(0),
});

export type AdminOverrideState = { error?: string; errors?: Record<string, string[]> } | undefined;

export async function adminOverrideMatch(
  _prev: AdminOverrideState,
  formData: FormData
): Promise<AdminOverrideState> {
  await requireAdmin();

  const parsed = AdminOverrideSchema.safeParse({
    matchId: formData.get("matchId"),
    legsA: formData.get("legsA"),
    legsB: formData.get("legsB"),
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { matchId, legsA, legsB } = parsed.data;
  if (legsA === legsB) return { error: "Kein Unentschieden möglich." };

  const match = await prisma.dartsMatch.findUnique({
    where: { id: matchId },
    include: { challenge: true },
  });
  if (!match) return { error: "Match nicht gefunden." };
  // Admin can override any match (DISPUTED, CONFIRMED, PENDING_CONFIRMATION)

  const winnerId = legsA > legsB ? match.playerAId : match.playerBId;

  const league = match.leagueId
    ? await prisma.dartsLeague.findUnique({ where: { id: match.leagueId } })
    : await prisma.dartsLeague.findFirst({ orderBy: { createdAt: "desc" } });
  const kFactor = league?.kFactor ?? 32;

  await prisma.$transaction(async (tx) => {
    await reverseElo(tx, matchId);
    await tx.dartsMatch.update({
      where: { id: matchId },
      data: {
        winnerId,
        matchConfig: { legsA, legsB },
        status: "CONFIRMED",
        disputeReason: null,
      },
    });
    await applyElo(tx, matchId, match.playerAId, match.playerBId, legsA, legsB, kFactor);
    if (match.challengeId) {
      await tx.dartsChallenge.update({
        where: { id: match.challengeId },
        data: { status: "COMPLETED" },
      });
    }
  });

  revalidatePath("/darts");
  revalidatePath("/admin/darts");
  revalidatePath(`/darts/matches/${match.challengeId ?? matchId}`);
  return {};
}

// ─── D1h: Admin — delete match entirely (reverses ELO) ───────────────────────

export async function adminDeleteMatch(matchId: string): Promise<{ error?: string }> {
  await requireAdmin();

  const match = await prisma.dartsMatch.findUnique({
    where: { id: matchId },
    include: { challenge: true },
  });
  if (!match) return { error: "Match nicht gefunden." };

  await prisma.$transaction(async (tx) => {
    await reverseElo(tx, matchId);
    await tx.dartsLeg.deleteMany({ where: { matchId } });
    await tx.dartsMatch.delete({ where: { id: matchId } });
    if (match.challengeId) {
      await tx.dartsChallenge.update({
        where: { id: match.challengeId },
        data: { status: "ACCEPTED" },
      });
    }
  });

  revalidatePath("/darts");
  revalidatePath("/admin/darts");
  if (match.challengeId) {
    revalidatePath(`/darts/matches/${match.challengeId}`);
  }
  return {};
}

// ─── D1i: Expire stale challenge ─────────────────────────────────────────────

export async function expireStaleChallenge(challengeId: string): Promise<{ error?: string }> {
  const challenge = await prisma.dartsChallenge.findUnique({ where: { id: challengeId } });
  if (!challenge) return { error: "Herausforderung nicht gefunden." };
  if (challenge.status !== "PENDING") return {};
  if (!challenge.expiresAt || challenge.expiresAt > new Date()) return {};

  await prisma.dartsChallenge.update({
    where: { id: challengeId },
    data: { status: "EXPIRED" },
  });
  revalidatePath("/darts/challenges");
  revalidatePath("/darts");
  return {};
}

// ─── D1e: Create league (admin) ───────────────────────────────────────────────

const CreateLeagueSchema = z.object({
  name: z.string().min(1, "Name erforderlich.").trim(),
  kFactor: z.coerce.number().int().min(1).default(32),
  startingElo: z.coerce.number().int().min(1).default(1000),
  legsToWin: z.coerce.number().int().min(1).default(3),
  startingScore: z.coerce.number().int().refine((v) => v === 301 || v === 501, {
    message: "Muss 301 oder 501 sein.",
  }).default(501),
});

export type LeagueState = { error?: string; errors?: Record<string, string[]> } | undefined;

export async function createLeague(
  _prev: LeagueState,
  formData: FormData
): Promise<LeagueState> {
  await requireAdmin();

  const parsed = CreateLeagueSchema.safeParse({
    name: formData.get("name"),
    kFactor: formData.get("kFactor") || 32,
    startingElo: formData.get("startingElo") || 1000,
    legsToWin: formData.get("legsToWin") || 3,
    startingScore: formData.get("startingScore") || 501,
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { name, kFactor, startingElo, legsToWin, startingScore } = parsed.data;

  await prisma.dartsLeague.create({
    data: {
      name,
      kFactor,
      startingElo,
      matchConfig: { legsToWin, startingScore },
    },
  });
  revalidatePath("/darts");
  revalidatePath("/admin/darts");
  return {};
}

export async function deleteLeague(id: string) {
  await requireAdmin();

  const matches = await prisma.dartsMatch.findMany({
    where: { leagueId: id },
    select: { id: true, challengeId: true },
  });

  await prisma.$transaction(async (tx) => {
    // Reverse ELO for every match in this league
    for (const m of matches) {
      await reverseElo(tx, m.id);
    }

    // Delete legs + matches (eloHistory cascades via schema)
    const matchIds = matches.map((m) => m.id);
    await tx.dartsLeg.deleteMany({ where: { matchId: { in: matchIds } } });
    await tx.dartsMatch.deleteMany({ where: { id: { in: matchIds } } });

    // Reset associated challenges back to ACCEPTED so players can re-enter results
    const challengeIds = matches.map((m) => m.challengeId).filter(Boolean) as string[];
    if (challengeIds.length > 0) {
      await tx.dartsChallenge.updateMany({
        where: { id: { in: challengeIds } },
        data: { status: "ACCEPTED" },
      });
    }

    await tx.dartsLeague.delete({ where: { id } });
  });

  revalidatePath("/darts");
  revalidatePath("/darts/challenges");
  revalidatePath("/admin/darts");
}
