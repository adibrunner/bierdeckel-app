"use client";

import { useActionState, useState, useTransition } from "react";
import { addRound, deleteRound } from "@/app/actions/competitions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, ChevronDown, ChevronUp } from "lucide-react";

interface Round {
  id: string;
  name: string;
  order: number;
  matchFormat: "SCORE" | "SETS" | "WINNER_ONLY";
  setsToWin: number | null;
  pointsExact: number;
  pointsWinner: number;
  pointsDraw: number;
}

interface Props {
  competitionId: string;
  rounds: Round[];
}

const formatLabel: Record<string, string> = {
  SCORE: "Ergebnis (Fußball / Hockey)",
  SETS: "Sets / Legs (Darts / Tennis)",
  WINNER_ONLY: "Nur Sieger",
};

export function ManageRoundsPanel({ competitionId, rounds }: Props) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(addRound, undefined);
  const [format, setFormat] = useState("SCORE");
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (!confirm("Runde löschen? Alle verknüpften Spiele verlieren ihre Rundenzuordnung.")) return;
    startTransition(() => deleteRound(id, competitionId));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Runden / Phasen ({rounds.length})</h3>
        <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
          {open ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
          {open ? "Einklappen" : "Verwalten"}
        </Button>
      </div>

      {/* Existing rounds */}
      {rounds.length > 0 && (
        <div className="divide-y rounded-md border">
          {rounds.sort((a, b) => a.order - b.order).map((r) => (
            <div key={r.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="font-medium">{r.name}</span>
                <Badge variant="outline" className="text-xs">{formatLabel[r.matchFormat]}</Badge>
                {r.matchFormat === "SETS" && r.setsToWin && (
                  <span className="text-xs text-muted-foreground">First to {r.setsToWin}</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                <span>Exakt: {r.pointsExact} Pkt.</span>
                <span>Sieger: {r.pointsWinner} Pkt.</span>
                {r.matchFormat === "SCORE" && <span>Unent.: {r.pointsDraw} Pkt.</span>}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(r.id)}
                  disabled={isPending}
                  title="Runde löschen"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add round form */}
      {open && (
        <form action={action} className="rounded-md border p-4 space-y-4 bg-muted/30">
          <input type="hidden" name="competitionId" value={competitionId} />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="rnd-name" className="text-xs">Name *</Label>
              <Input id="rnd-name" name="name" placeholder="z.B. Gruppenphase" required />
              {state?.errors?.name && <p className="text-xs text-destructive">{state.errors.name[0]}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rnd-order" className="text-xs">Reihenfolge</Label>
              <Input id="rnd-order" name="order" type="number" min={0} defaultValue={rounds.length} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rnd-format" className="text-xs">Format *</Label>
              <select
                id="rnd-format"
                name="matchFormat"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="SCORE">Ergebnis (Fußball / Hockey)</option>
                <option value="SETS">Sets / Legs (Darts / Tennis)</option>
                <option value="WINNER_ONLY">Nur Sieger (Knockout)</option>
              </select>
            </div>
            {format === "SETS" && (
              <div className="space-y-1.5">
                <Label htmlFor="rnd-sets" className="text-xs">Sets zum Sieg</Label>
                <Input id="rnd-sets" name="setsToWin" type="number" min={1} defaultValue={3} />
              </div>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="rnd-exact" className="text-xs">Punkte exakt</Label>
              <Input id="rnd-exact" name="pointsExact" type="number" min={0} defaultValue={3} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rnd-winner" className="text-xs">Punkte Sieger</Label>
              <Input id="rnd-winner" name="pointsWinner" type="number" min={0} defaultValue={1} />
            </div>
            {format === "SCORE" && (
              <div className="space-y-1.5">
                <Label htmlFor="rnd-draw" className="text-xs">Punkte Unentschieden</Label>
                <Input id="rnd-draw" name="pointsDraw" type="number" min={0} defaultValue={2} />
              </div>
            )}
          </div>
          {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
          <Button type="submit" size="sm" disabled={pending}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            {pending ? "…" : "Runde erstellen"}
          </Button>
        </form>
      )}
    </div>
  );
}
