"use client";

import { useActionState, useState } from "react";
import { updateLeague, type LeagueState } from "@/app/actions/darts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, X, Check } from "lucide-react";

interface Props {
  league: {
    id: string;
    name: string;
    kFactor: number;
    startingElo: number;
    matchConfig: unknown;
  };
}

export function EditLeagueButton({ league }: Props) {
  const cfg = league.matchConfig as { legsToWin?: number; startingScore?: number };
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<LeagueState, FormData>(updateLeague, undefined);

  if (!open) {
    return (
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} title="Liga bearbeiten">
        <Pencil className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <form
      action={async (fd) => {
        await action(fd);
        setOpen(false);
      }}
      className="flex flex-col gap-2 rounded-md border p-3 bg-muted/40 text-sm"
    >
      <input type="hidden" name="id" value={league.id} />

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Name</Label>
          <Input name="name" defaultValue={league.name} className="h-7 text-sm" required />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Legs to Win</Label>
          <Input name="legsToWin" type="number" min={1} defaultValue={cfg.legsToWin ?? 3} className="h-7 text-sm" required />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Start-Punkte</Label>
          <select name="startingScore" defaultValue={cfg.startingScore ?? 501} className="h-7 w-full rounded-md border bg-background px-2 text-sm">
            <option value={301}>301</option>
            <option value={501}>501</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">K-Faktor</Label>
          <Input name="kFactor" type="number" min={1} defaultValue={league.kFactor} className="h-7 text-sm" required />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Start-ELO</Label>
          <Input name="startingElo" type="number" min={1} defaultValue={league.startingElo} className="h-7 text-sm" required />
        </div>
      </div>

      {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
      {state?.errors && (
        <p className="text-xs text-destructive">
          {Object.values(state.errors).flat()[0]}
        </p>
      )}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          <X className="h-3.5 w-3.5 mr-1" /> Abbrechen
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          <Check className="h-3.5 w-3.5 mr-1" /> {pending ? "Speichern…" : "Speichern"}
        </Button>
      </div>
    </form>
  );
}
