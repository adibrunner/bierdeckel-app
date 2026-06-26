"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

// ─── Guards ────────────────────────────────────────────────────────────────────

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

// ─── Create Competition ────────────────────────────────────────────────────────

const CreateCompetitionSchema = z.object({
  name: z.string().min(2, "Name muss mindestens 2 Zeichen lang sein.").trim(),
  sport: z.string().min(2, "Sport muss angegeben werden.").trim(),
  description: z.string().trim().optional(),
  startDate: z.string().min(1, "Startdatum muss angegeben werden."),
  endDate: z.string().optional(),
  participantType: z.enum(["PLAYER", "COUNTRY", "TEAM"]).default("TEAM"),
  correctScore: z.coerce.number().int().min(0).default(3),
  correctWinner: z.coerce.number().int().min(0).default(1),
  correctDraw: z.coerce.number().int().min(0).default(2),
});

export type CreateCompetitionState =
  | { errors?: Record<string, string[]>; error?: string }
  | undefined;

export async function createCompetition(
  _prev: CreateCompetitionState,
  formData: FormData
): Promise<CreateCompetitionState> {
  const session = await requireAdmin();

  const parsed = CreateCompetitionSchema.safeParse({
    name: formData.get("name"),
    sport: formData.get("sport"),
    description: formData.get("description"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") || undefined,
    participantType: formData.get("participantType") || "TEAM",
    correctScore: formData.get("correctScore"),
    correctWinner: formData.get("correctWinner"),
    correctDraw: formData.get("correctDraw"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { name, sport, description, startDate, endDate, participantType, correctScore, correctWinner, correctDraw } =
    parsed.data;

  const competition = await prisma.competition.create({
    data: {
      name,
      sport,
      description,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      participantType,
      createdById: session.user.id,
      scoringRules: {
        create: {
          ruleDefinition: { correctScore, correctWinner, correctDraw },
        },
      },
    },
  });

  revalidatePath("/competitions");
  revalidatePath("/admin/competitions");
  redirect(`/competitions/${competition.id}`);
}

// ─── Update Competition ────────────────────────────────────────────────────────

const UpdateCompetitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2, "Name muss mindestens 2 Zeichen lang sein.").trim(),
  sport: z.string().min(2, "Sport muss angegeben werden.").trim(),
  description: z.string().trim().optional(),
  startDate: z.string().min(1, "Startdatum muss angegeben werden."),
  endDate: z.string().optional(),
  status: z.enum(["ACTIVE", "FINISHED", "ARCHIVED"]).default("ACTIVE"),
});

export type UpdateCompetitionState =
  | { errors?: Record<string, string[]>; error?: string }
  | undefined;

export async function updateCompetition(
  _prev: UpdateCompetitionState,
  formData: FormData
): Promise<UpdateCompetitionState> {
  await requireAdmin();

  const parsed = UpdateCompetitionSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    sport: formData.get("sport"),
    description: formData.get("description") || undefined,
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") || undefined,
    status: formData.get("status") || "ACTIVE",
  });

  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { id, name, sport, description, startDate, endDate, status } = parsed.data;

  await prisma.competition.update({
    where: { id },
    data: {
      name,
      sport,
      description: description ?? null,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      status,
    },
  });

  revalidatePath("/competitions");
  revalidatePath("/admin/competitions");
  revalidatePath(`/competitions/${id}`);
  return {};
}

// ─── Delete Competition ────────────────────────────────────────────────────────

export async function deleteCompetition(id: string): Promise<{ error?: string }> {
  await requireAdmin();

  await prisma.competition.delete({ where: { id } });

  revalidatePath("/competitions");
  revalidatePath("/admin/competitions");
  return {};
}

// ─── Add Fixture ───────────────────────────────────────────────────────────────

const AddFixtureSchema = z.object({
  competitionId: z.string().min(1),
  homeParticipantId: z.string().min(1, "Heimteilnehmer auswählen."),
  awayParticipantId: z.string().min(1, "Gastteilnehmer auswählen."),
  roundId: z.string().optional(),
  startsAt: z.string().min(1, "Anstoßzeit angeben."),
});

export type AddFixtureState =
  | { errors?: Record<string, string[]>; error?: string }
  | undefined;

export async function addFixture(
  _prev: AddFixtureState,
  formData: FormData
): Promise<AddFixtureState> {
  await requireAdmin();

  const parsed = AddFixtureSchema.safeParse({
    competitionId: formData.get("competitionId"),
    homeParticipantId: formData.get("homeParticipantId"),
    awayParticipantId: formData.get("awayParticipantId"),
    roundId: formData.get("roundId") || undefined,
    startsAt: formData.get("startsAt"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { competitionId, homeParticipantId, awayParticipantId, roundId, startsAt } = parsed.data;

  await prisma.fixture.create({
    data: {
      competitionId,
      homeParticipantId,
      awayParticipantId,
      roundId: roundId ?? null,
      startsAt: new Date(startsAt),
    },
  });

  revalidatePath(`/competitions/${competitionId}`);
  revalidatePath(`/admin/competitions/${competitionId}`);
}

// ─── Round Management ─────────────────────────────────────────────────────────

const RoundSchema = z.object({
  competitionId: z.string().min(1),
  name: z.string().min(1, "Name erforderlich.").trim(),
  order: z.coerce.number().int().min(0).default(0),
  matchFormat: z.enum(["SCORE", "SETS", "WINNER_ONLY"]).default("SCORE"),
  setsToWin: z.coerce.number().int().min(1).optional(),
  pointsExact: z.coerce.number().int().min(0).default(3),
  pointsWinner: z.coerce.number().int().min(0).default(1),
  pointsDraw: z.coerce.number().int().min(0).default(2),
});

export type RoundState = { errors?: Record<string, string[]>; error?: string } | undefined;

export async function addRound(_prev: RoundState, formData: FormData): Promise<RoundState> {
  await requireAdmin();
  const parsed = RoundSchema.safeParse({
    competitionId: formData.get("competitionId"),
    name: formData.get("name"),
    order: formData.get("order") || 0,
    matchFormat: formData.get("matchFormat") || "SCORE",
    setsToWin: formData.get("setsToWin") || undefined,
    pointsExact: formData.get("pointsExact") || 3,
    pointsWinner: formData.get("pointsWinner") || 1,
    pointsDraw: formData.get("pointsDraw") || 2,
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const { competitionId, name, order, matchFormat, setsToWin, pointsExact, pointsWinner, pointsDraw } = parsed.data;
  await prisma.competitionRound.create({
    data: { competitionId, name, order, matchFormat, setsToWin: setsToWin ?? null, pointsExact, pointsWinner, pointsDraw },
  });
  revalidatePath(`/competitions/${competitionId}`);
}

export async function deleteRound(id: string, competitionId: string) {
  await requireAdmin();
  await prisma.competitionRound.delete({ where: { id } });
  revalidatePath(`/competitions/${competitionId}`);
}

// ─── Submit / Update Prediction ────────────────────────────────────────────────

export async function submitPrediction(fixtureId: string, homeGoals: number, awayGoals: number) {
  const session = await requireAuth();

  const fixture = await prisma.fixture.findUnique({ where: { id: fixtureId } });
  if (!fixture) throw new Error("Spiel nicht gefunden.");
  if (fixture.startsAt <= new Date()) throw new Error("Tipp-Deadline überschritten.");

  await prisma.prediction.upsert({
    where: { fixtureId_userId: { fixtureId, userId: session.user.id } },
    create: {
      fixtureId,
      userId: session.user.id,
      prediction: { home: homeGoals, away: awayGoals },
    },
    update: {
      prediction: { home: homeGoals, away: awayGoals },
    },
  });

  revalidatePath(`/competitions/${fixture.competitionId}`);
}

// ─── Enter Result & Score ──────────────────────────────────────────────────────

export async function enterResult(fixtureId: string, homeVal: number, awayVal: number) {
  await requireAdmin();

  const fixture = await prisma.fixture.findUnique({
    where: { id: fixtureId },
    include: {
      predictions: true,
      round: true,
      competition: { include: { scoringRules: true } },
    },
  });
  if (!fixture) throw new Error("Spiel nicht gefunden.");

  // Round-specific scoring takes priority over legacy scoringRules
  const ptExact   = fixture.round?.pointsExact   ?? (fixture.competition.scoringRules[0]?.ruleDefinition as Record<string, number> | null)?.correctScore   ?? 3;
  const ptWinner  = fixture.round?.pointsWinner  ?? (fixture.competition.scoringRules[0]?.ruleDefinition as Record<string, number> | null)?.correctWinner  ?? 1;
  const ptDraw    = fixture.round?.pointsDraw    ?? (fixture.competition.scoringRules[0]?.ruleDefinition as Record<string, number> | null)?.correctDraw    ?? 2;
  const format    = fixture.round?.matchFormat   ?? "SCORE";

  for (const pred of fixture.predictions) {
    const p = pred.prediction as { home: number; away: number } | { winner: string; home?: number; away?: number };
    let points = 0;

    if (format === "SCORE") {
      const ps = p as { home: number; away: number };
      const actualWinner = homeVal > awayVal ? "home" : awayVal > homeVal ? "away" : "draw";
      const predWinner   = ps.home > ps.away ? "home" : ps.away > ps.home ? "away" : "draw";
      if (ps.home === homeVal && ps.away === awayVal) {
        points = ptExact;
      } else if (predWinner === actualWinner && actualWinner === "draw") {
        points = ptDraw;
      } else if (predWinner === actualWinner) {
        points = ptWinner;
      }
    } else if (format === "SETS") {
      const ps = p as { home: number; away: number };
      const actualWinner = homeVal > awayVal ? "home" : "away";
      const predWinner   = ps.home > ps.away ? "home" : "away";
      if (ps.home === homeVal && ps.away === awayVal) {
        points = ptExact;
      } else if (predWinner === actualWinner) {
        points = ptWinner;
      }
    } else if (format === "WINNER_ONLY") {
      const pw = p as { winner: string };
      const actualWinner = homeVal > awayVal ? "home" : "away";
      if (pw.winner === actualWinner) points = ptWinner;
    }

    await prisma.prediction.update({ where: { id: pred.id }, data: { pointsAwarded: points } });
  }

  await prisma.fixture.update({
    where: { id: fixtureId },
    data: {
      result: { home: homeVal, away: awayVal },
      status: "FINISHED",
    },
  });

  revalidatePath(`/competitions/${fixture.competitionId}`);
}
