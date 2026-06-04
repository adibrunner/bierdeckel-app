import { prisma } from "@/lib/prisma";
import { CreateParticipantForm } from "@/components/admin/create-participant-form";
import { ParticipantActions } from "@/components/admin/participant-actions";
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

const typeLabel: Record<string, string> = {
  PLAYER: "Spieler",
  COUNTRY: "Land",
  TEAM: "Team",
};

const typeVariant: Record<string, "default" | "secondary" | "outline"> = {
  PLAYER: "default",
  COUNTRY: "secondary",
  TEAM: "outline",
};

export default async function AdminParticipantsPage() {
  const players = await prisma.participant.findMany({
    where: { type: "PLAYER" },
    orderBy: { name: "asc" },
  });
  const countries = await prisma.participant.findMany({
    where: { type: "COUNTRY" },
    orderBy: { name: "asc" },
  });
  const teams = await prisma.participant.findMany({
    where: { type: "TEAM" },
    orderBy: { name: "asc" },
  });

  const all = [...players, ...countries, ...teams];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Teilnehmer</h1>
        <p className="text-muted-foreground mt-1">
          Globaler Pool – Spieler, Länder und Teams für alle Wettbewerbe
        </p>
      </div>

      <CreateParticipantForm />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{all.length} Einträge</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {all.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Noch keine Teilnehmer angelegt.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Kurzname</TableHead>
                  <TableHead>Land / Spitzname</TableHead>
                  <TableHead>Ranking</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {all.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      <Badge variant={typeVariant[p.type] ?? "outline"}>
                        {typeLabel[p.type] ?? p.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.shortName ?? "–"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.nickname ?? p.country ?? "–"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.worldRank ?? "–"}
                    </TableCell>
                    <TableCell>
                      <ParticipantActions participantId={p.id} participantName={p.name} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
