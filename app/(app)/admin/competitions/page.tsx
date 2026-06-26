import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EditCompetitionForm } from "@/components/competitions/edit-competition-form";
import { Trophy, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const statusLabel: Record<string, string> = {
  ACTIVE: "Aktiv",
  FINISHED: "Beendet",
  ARCHIVED: "Archiviert",
};

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  ACTIVE: "default",
  FINISHED: "secondary",
  ARCHIVED: "outline",
};

export default async function AdminCompetitionsPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") notFound();

  const competitions = await prisma.competition.findMany({
    orderBy: { startDate: "desc" },
    include: {
      _count: { select: { fixtures: true, members: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Trophy className="h-6 w-6" /> Wettbewerbe verwalten
          </h1>
          <p className="text-muted-foreground mt-1">
            {competitions.length} {competitions.length === 1 ? "Wettbewerb" : "Wettbewerbe"}
          </p>
        </div>
        <Link
          href="/admin/competitions/new"
          className={cn(buttonVariants({ size: "sm" }))}
        >
          <Plus className="h-4 w-4 mr-2" /> Neuer Wettbewerb
        </Link>
      </div>

      {competitions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            Noch keine Wettbewerbe. Erstelle den ersten!
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {competitions.map((c) => (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base">{c.name}</CardTitle>
                      <Badge variant={statusVariant[c.status] ?? "outline"}>
                        {statusLabel[c.status] ?? c.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {c.sport} ·{" "}
                      {new Date(c.startDate).toLocaleDateString("de-DE")}
                      {c.endDate ? ` – ${new Date(c.endDate).toLocaleDateString("de-DE")}` : ""}
                      {" · "}{c._count.fixtures} Spiele · {c._count.members} Mitglieder
                    </p>
                    {c.description && (
                      <p className="text-xs text-muted-foreground">{c.description}</p>
                    )}
                  </div>
                  <Link
                    href={`/competitions/${c.id}`}
                    className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-xs shrink-0")}
                  >
                    Ansehen
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <EditCompetitionForm competition={c} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
