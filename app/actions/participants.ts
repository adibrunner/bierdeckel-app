"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Nicht angemeldet.");
  if (session.user.role !== "ADMIN") throw new Error("Keine Berechtigung.");
}

const ParticipantSchema = z.object({
  name: z.string().min(1, "Name erforderlich.").trim(),
  shortName: z.string().trim().optional(),
  type: z.enum(["PLAYER", "COUNTRY", "TEAM"]),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  nickname: z.string().trim().optional(),
  country: z.string().trim().optional(),
  worldRank: z.coerce.number().int().positive().optional().or(z.literal("")),
  imageUrl: z.string().url("Ungültige URL.").trim().optional().or(z.literal("")),
});

export type ParticipantState =
  | { errors?: Record<string, string[]>; error?: string }
  | undefined;

export async function createParticipant(
  _prev: ParticipantState,
  formData: FormData
): Promise<ParticipantState> {
  await requireAdmin();

  const parsed = ParticipantSchema.safeParse({
    name: formData.get("name"),
    shortName: formData.get("shortName") || undefined,
    type: formData.get("type"),
    firstName: formData.get("firstName") || undefined,
    lastName: formData.get("lastName") || undefined,
    nickname: formData.get("nickname") || undefined,
    country: formData.get("country") || undefined,
    worldRank: formData.get("worldRank") || undefined,
    imageUrl: formData.get("imageUrl") || undefined,
  });

  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { name, shortName, type, firstName, lastName, nickname, country, worldRank, imageUrl } =
    parsed.data;

  await prisma.participant.create({
    data: {
      name,
      shortName: shortName || null,
      type,
      firstName: firstName || null,
      lastName: lastName || null,
      nickname: nickname || null,
      country: country || null,
      worldRank: typeof worldRank === "number" ? worldRank : null,
      imageUrl: imageUrl && imageUrl !== "" ? imageUrl : null,
    },
  });

  revalidatePath("/admin/participants");
}

export async function deleteParticipant(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    await prisma.participant.delete({ where: { id } });
  } catch {
    return { error: "Teilnehmer konnte nicht gelöscht werden (möglicherweise noch in Verwendung)." };
  }
  revalidatePath("/admin/participants");
  return {};
}
