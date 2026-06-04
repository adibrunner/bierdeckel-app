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
    correctScore: formData.get("correctScore"),
    correctWinner: formData.get("correctWinner"),
    correctDraw: formData.get("correctDraw"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { name, sport, description, startDate, endDate, correctScore, correctWinner, correctDraw } =
    parsed.data;

  const competition = await prisma.competition.create({
    data: {
      name,
      sport,
      description,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
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

// ─── Add Fixture ───────────────────────────────────────────────────────────────

const AddFixtureSchema = z.object({
  competitionId: z.string().min(1),
  homeTeam: z.string().min(1, "Heimmannschaft angeben.").trim(),
  awayTeam: z.string().min(1, "Gastmannschaft angeben.").trim(),
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
    homeTeam: formData.get("homeTeam"),
    awayTeam: formData.get("awayTeam"),
    startsAt: formData.get("startsAt"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { competitionId, homeTeam, awayTeam, startsAt } = parsed.data;

  await prisma.fixture.create({
    data: {
      competitionId,
      homeTeam,
      awayTeam,
      startsAt: new Date(startsAt),
    },
  });

  revalidatePath(`/competitions/${competitionId}`);
  revalidatePath(`/admin/competitions/${competitionId}`);
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

export async function enterResult(fixtureId: string, homeGoals: number, awayGoals: number) {
  await requireAdmin();

  const fixture = await prisma.fixture.findUnique({
    where: { id: fixtureId },
    include: {
      predictions: true,
      competition: { include: { scoringRules: true } },
    },
  });
  if (!fixture) throw new Error("Spiel nicht gefunden.");

  const rules = fixture.competition.scoringRules[0]?.ruleDefinition as {
    correctScore: number;
    correctWinner: number;
    correctDraw: number;
  } | null;

  const actualHome = homeGoals;
  const actualAway = awayGoals;
  const actualWinner = actualHome > actualAway ? "home" : actualAway > actualHome ? "away" : "draw";

  for (const pred of fixture.predictions) {
    const p = pred.prediction as { home: number; away: number };
    const predWinner = p.home > p.away ? "home" : p.away > p.home ? "away" : "draw";
    let points = 0;

    if (p.home === actualHome && p.away === actualAway) {
      points = rules?.correctScore ?? 3;
    } else if (predWinner === actualWinner && actualWinner === "draw") {
      points = rules?.correctDraw ?? 2;
    } else if (predWinner === actualWinner) {
      points = rules?.correctWinner ?? 1;
    }

    await prisma.prediction.update({
      where: { id: pred.id },
      data: { pointsAwarded: points },
    });
  }

  await prisma.fixture.update({
    where: { id: fixtureId },
    data: {
      result: { home: actualHome, away: actualAway },
      status: "FINISHED",
    },
  });

  revalidatePath(`/competitions/${fixture.competitionId}`);
}
