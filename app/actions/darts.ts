"use server";

import { prisma } from "@/lib/prisma";
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

// ─── D1b: Send challenge ──────────────────────────────────────────────────────

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

  await prisma.dartsChallenge.create({
    data: { challengerId: session.user.id, opponentId },
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

// ─── D1d: Record match result ─────────────────────────────────────────────────

const RecordMatchSchema = z.object({
  challengeId: z.string().min(1),
  leagueId: z.string().optional(),
  legsA: z.coerce.number().int().min(0),
  legsB: z.coerce.number().int().min(0),
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
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { challengeId, leagueId, legsA, legsB } = parsed.data;

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
  const loserId = legsA > legsB ? challenge.opponentId : challenge.challengerId;

  // Fetch ELO ratings
  const [playerA, playerB] = await Promise.all([
    prisma.dartsPlayer.findUnique({ where: { userId: challenge.challengerId } }),
    prisma.dartsPlayer.findUnique({ where: { userId: challenge.opponentId } }),
  ]);
  if (!playerA || !playerB) return { error: "Spieler nicht gefunden." };

  const league = leagueId
    ? await prisma.dartsLeague.findUnique({ where: { id: leagueId } })
    : await prisma.dartsLeague.findFirst({ orderBy: { createdAt: "desc" } });

  const kFactor = league?.kFactor ?? 32;
  const actualA = legsA > legsB ? 1 : 0;
  const { newA, newB } = calcElo(playerA.currentElo, playerB.currentElo, actualA, kFactor);

  // Create match + legs + ELO history in a transaction
  await prisma.$transaction(async (tx) => {
    const match = await tx.dartsMatch.create({
      data: {
        challengeId,
        leagueId: league?.id ?? null,
        playerAId: challenge.challengerId,
        playerBId: challenge.opponentId,
        winnerId,
        matchConfig: { legsA, legsB },
        playedAt: new Date(),
      },
    });

    // Create a leg record per leg played
    const totalLegs = legsA + legsB;
    await tx.dartsLeg.createMany({
      data: Array.from({ length: totalLegs }, (_, i) => ({
        matchId: match.id,
        legNumber: i + 1,
        winnerId: null, // individual leg tracking not implemented yet
      })),
    });

    // Update ELO
    await tx.dartsPlayer.update({ where: { userId: challenge.challengerId }, data: { currentElo: newA } });
    await tx.dartsPlayer.update({ where: { userId: challenge.opponentId }, data: { currentElo: newB } });

    // ELO history
    await tx.eloHistory.createMany({
      data: [
        { playerId: playerA.id, matchId: match.id, ratingBefore: playerA.currentElo, ratingAfter: newA },
        { playerId: playerB.id, matchId: match.id, ratingBefore: playerB.currentElo, ratingAfter: newB },
      ],
    });

    // Close challenge
    await tx.dartsChallenge.update({
      where: { id: challengeId },
      data: { status: "COMPLETED" },
    });
  });

  revalidatePath("/darts");
  revalidatePath("/darts/challenges");
  revalidatePath(`/darts/matches/${challengeId}`);
  return {};
}

// ─── D1e: Create league (admin) ───────────────────────────────────────────────

const CreateLeagueSchema = z.object({
  name: z.string().min(1, "Name erforderlich.").trim(),
  kFactor: z.coerce.number().int().min(1).default(32),
  startingElo: z.coerce.number().int().min(1).default(1000),
  legsToWin: z.coerce.number().int().min(1).default(3),
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
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { name, kFactor, startingElo, legsToWin } = parsed.data;

  await prisma.dartsLeague.create({
    data: {
      name,
      kFactor,
      startingElo,
      matchConfig: { legsToWin },
    },
  });
  revalidatePath("/darts");
  revalidatePath("/admin/darts");
  return {};
}

export async function deleteLeague(id: string) {
  await requireAdmin();
  await prisma.dartsLeague.delete({ where: { id } });
  revalidatePath("/admin/darts");
}
