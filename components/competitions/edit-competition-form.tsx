"use client";

import { useActionState, useTransition, useState } from "react";
import { updateCompetition, deleteCompetition } from "@/app/actions/competitions";
import type { UpdateCompetitionState } from "@/app/actions/competitions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, X, Check } from "lucide-react";

interface Props {
  competition: {
    id: string;
    name: string;
    sport: string;
    description: string | null;
    startDate: Date;
    endDate: Date | null;
    status: string;
  };
}

function toDateInput(d: Date | null): string {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0];
}

export function EditCompetitionForm({ competition }: Props) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<UpdateCompetitionState, FormData>(
    updateCompetition,
    undefined
  );
  const [deletePending, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm(`Wettbewerb "${competition.name}" wirklich löschen? Alle Spiele und Tipps gehen verloren.`)) return;
    startDelete(async () => {
      const res = await deleteCompetition(competition.id);
      if (res?.error) setDeleteError(res.error);
    });
  }

  if (!editing) {
    return (
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Pencil className="h-3.5 w-3.5 mr-1.5" /> Bearbeiten
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-destructive text-destructive hover:bg-destructive/10"
          onClick={handleDelete}
          disabled={deletePending}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          {deletePending ? "Wird gelöscht…" : "Löschen"}
        </Button>
        {deleteError && <span className="text-xs text-destructive self-center">{deleteError}</span>}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4 pt-2">
      <input type="hidden" name="id" value={competition.id} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`name-${competition.id}`} className="text-xs">Name</Label>
          <Input
            id={`name-${competition.id}`}
            name="name"
            defaultValue={competition.name}
            className="h-8 text-sm"
          />
          {state?.errors?.name && <p className="text-xs text-destructive">{state.errors.name[0]}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor={`sport-${competition.id}`} className="text-xs">Sport</Label>
          <Input
            id={`sport-${competition.id}`}
            name="sport"
            defaultValue={competition.sport}
            className="h-8 text-sm"
          />
          {state?.errors?.sport && <p className="text-xs text-destructive">{state.errors.sport[0]}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor={`startDate-${competition.id}`} className="text-xs">Startdatum</Label>
          <Input
            id={`startDate-${competition.id}`}
            name="startDate"
            type="date"
            defaultValue={toDateInput(competition.startDate)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`endDate-${competition.id}`} className="text-xs">Enddatum</Label>
          <Input
            id={`endDate-${competition.id}`}
            name="endDate"
            type="date"
            defaultValue={toDateInput(competition.endDate)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`status-${competition.id}`} className="text-xs">Status</Label>
          <select
            id={`status-${competition.id}`}
            name="status"
            defaultValue={competition.status}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm h-8 shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="ACTIVE">Aktiv</option>
            <option value="FINISHED">Beendet</option>
            <option value="ARCHIVED">Archiviert</option>
          </select>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor={`description-${competition.id}`} className="text-xs">Beschreibung</Label>
          <Input
            id={`description-${competition.id}`}
            name="description"
            defaultValue={competition.description ?? ""}
            className="h-8 text-sm"
          />
        </div>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          <Check className="h-3.5 w-3.5 mr-1.5" />
          {pending ? "Wird gespeichert…" : "Speichern"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
          <X className="h-3.5 w-3.5 mr-1.5" /> Abbrechen
        </Button>
      </div>
    </form>
  );
}
