"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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

// ─── Create Special Question ───────────────────────────────────────────────────

const CreateSpecialQuestionSchema = z.object({
  competitionId: z.string().min(1),
  question: z.string().min(2, "Frage erforderlich.").trim(),
  description: z.string().trim().optional(),
  type: z.enum(["SINGLE_PARTICIPANT", "MULTIPLE_PARTICIPANTS", "NUMBER"]),
  points: z.coerce.number().int().min(1, "Mindestens 1 Punkt."),
  deadline: z.string().min(1, "Deadline erforderlich."),
  requiredCount: z.coerce.number().int().min(1).optional(),
  usePercentageTolerance: z.coerce.boolean().default(false),
});

export type SpecialQuestionState =
  | { errors?: Record<string, string[]>; error?: string }
  | undefined;

export async function createSpecialQuestion(
  _prev: SpecialQuestionState,
  formData: FormData
): Promise<SpecialQuestionState> {
  await requireAdmin();

  const parsed = CreateSpecialQuestionSchema.safeParse({
    competitionId: formData.get("competitionId"),
    question: formData.get("question"),
    description: formData.get("description") || undefined,
    type: formData.get("type"),
    points: formData.get("points"),
    deadline: formData.get("deadline"),
    requiredCount: formData.get("requiredCount") || undefined,
    usePercentageTolerance: formData.get("usePercentageTolerance") === "on",
  });

  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { competitionId, question, description, type, points, deadline, requiredCount, usePercentageTolerance } =
    parsed.data;

  await prisma.specialQuestion.create({
    data: {
      competitionId,
      question,
      description: description || null,
      type,
      points,
      deadline: new Date(deadline),
      requiredCount: requiredCount ?? null,
      usePercentageTolerance,
    },
  });

  revalidatePath(`/competitions/${competitionId}`);
}

export async function deleteSpecialQuestion(id: string, competitionId: string) {
  await requireAdmin();
  await prisma.specialQuestion.delete({ where: { id } });
  revalidatePath(`/competitions/${competitionId}`);
}

// ─── Submit Special Answer ─────────────────────────────────────────────────────

export async function submitSpecialAnswer(
  specialQuestionId: string,
  answer: string
): Promise<{ error?: string }> {
  const session = await requireAuth();

  const question = await prisma.specialQuestion.findUnique({
    where: { id: specialQuestionId },
  });
  if (!question) return { error: "Frage nicht gefunden." };
  if (question.deadline <= new Date()) return { error: "Abgabefrist überschritten." };

  await prisma.specialAnswer.upsert({
    where: { specialQuestionId_userId: { specialQuestionId, userId: session.user.id } },
    create: { specialQuestionId, userId: session.user.id, answer },
    update: { answer },
  });

  revalidatePath(`/competitions/${question.competitionId}`);
  return {};
}

// ─── Score Special Question ────────────────────────────────────────────────────

export async function scoreSpecialQuestion(
  id: string,
  correctAnswer: string
): Promise<{ error?: string }> {
  await requireAdmin();

  const question = await prisma.specialQuestion.findUnique({
    where: { id },
    include: { answers: true },
  });
  if (!question) return { error: "Frage nicht gefunden." };

  await prisma.specialQuestion.update({
    where: { id },
    data: { correctAnswer },
  });

  const correct = JSON.parse(correctAnswer);

  for (const ans of question.answers) {
    const given = JSON.parse(ans.answer);
    let points = 0;

    if (question.type === "SINGLE_PARTICIPANT") {
      if (given === correct) points = question.points;
    } else if (question.type === "MULTIPLE_PARTICIPANTS") {
      const correctArr = correct as string[];
      const givenArr = given as string[];
      const hits = givenArr.filter((id: string) => correctArr.includes(id)).length;
      points = Math.round(hits * (question.points / correctArr.length));
    } else if (question.type === "NUMBER") {
      const diff = Math.abs(Number(given) - Number(correct));
      if (diff === 0) {
        points = question.points;
      } else if (question.usePercentageTolerance && Number(correct) > 0) {
        const pct = (diff / Number(correct)) * 100;
        if (pct <= 2) points = Math.round(question.points * 0.9);
        else if (pct <= 5) points = Math.round(question.points * 0.5);
        else if (pct <= 10) points = Math.round(question.points * 0.25);
        else if (pct <= 20) points = Math.round(question.points * 0.1);
      }
    }

    await prisma.specialAnswer.update({
      where: { id: ans.id },
      data: { pointsAwarded: points },
    });
  }

  revalidatePath(`/competitions/${question.competitionId}`);
  return {};
}
