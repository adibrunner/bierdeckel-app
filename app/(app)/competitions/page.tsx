import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CalendarDays, Trophy, Plus } from "lucide-react";

const statusLabel: Record<string, string> = {
  ACTIVE: "Aktiv",
  FINISHED: "Abgeschlossen",
  ARCHIVED: "Archiviert",
};

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  ACTIVE: "default",
  FINISHED: "secondary",
  ARCHIVED: "outline",
  // keep in sync with CompetitionStatus enum
};

export default async function CompetitionsPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const competitions = await prisma.competition.findMany({
    orderBy: { startDate: "desc" },
    include: {
      _count: { select: { fixtures: true, members: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tipps</h1>
          <p className="text-muted-foreground mt-1">Alle Tipp-Wettbewerbe</p>
        </div>
        {isAdmin && (
          <Link href="/admin/competitions/new" className={cn(buttonVariants())}>
            <Plus className="h-4 w-4 mr-2" />
            Neuer Wettbewerb
          </Link>
        )}
      </div>

      {competitions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Trophy className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Noch keine Wettbewerbe.</p>
          {isAdmin && (
            <Link href="/admin/competitions/new" className={cn(buttonVariants({ variant: "outline" }), "mt-4")}>
              Ersten Wettbewerb erstellen
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {competitions.map((c) => (
            <Link key={c.id} href={`/competitions/${c.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">{c.name}</CardTitle>
                    <Badge variant={statusVariant[c.status] ?? "outline"} className="shrink-0">
                      {statusLabel[c.status] ?? c.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.sport}</p>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-1">
                  {c.description && (
                    <p className="line-clamp-2">{c.description}</p>
                  )}
                  <div className="flex items-center gap-1 pt-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>
                      {new Date(c.startDate).toLocaleDateString("de-DE")}
                      {c.endDate
                        ? ` – ${new Date(c.endDate).toLocaleDateString("de-DE")}`
                        : ""}
                    </span>
                  </div>
                  <p>{c._count.fixtures} Spiele · {c._count.members} Teilnehmer</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
