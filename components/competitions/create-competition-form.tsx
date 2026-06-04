"use client";

import { useActionState } from "react";
import { createCompetition } from "@/app/actions/competitions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CreateCompetitionForm() {
  const [state, action, pending] = useActionState(createCompetition, undefined);

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Neuer Wettbewerb</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="z.B. EM 2026" required />
              {state?.errors?.name && <p className="text-xs text-destructive">{state.errors.name[0]}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sport">Sport</Label>
              <Input id="sport" name="sport" placeholder="z.B. Fußball" required />
              {state?.errors?.sport && <p className="text-xs text-destructive">{state.errors.sport[0]}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="participantType">Teilnehmertyp</Label>
              <select
                id="participantType"
                name="participantType"
                defaultValue="TEAM"
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="TEAM">Teams / Vereine</option>
                <option value="COUNTRY">Länder</option>
                <option value="PLAYER">Spieler</option>
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="description">Beschreibung (optional)</Label>
              <Input id="description" name="description" placeholder="Kurze Beschreibung…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="startDate">Startdatum</Label>
              <Input id="startDate" name="startDate" type="date" required />
              {state?.errors?.startDate && <p className="text-xs text-destructive">{state.errors.startDate[0]}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">Enddatum (optional)</Label>
              <Input id="endDate" name="endDate" type="date" />
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-3">Punkteregeln</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="correctScore">Exaktes Ergebnis</Label>
                <Input id="correctScore" name="correctScore" type="number" defaultValue={3} min={0} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="correctWinner">Richtiger Gewinner</Label>
                <Input id="correctWinner" name="correctWinner" type="number" defaultValue={1} min={0} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="correctDraw">Richtiges Unentschieden</Label>
                <Input id="correctDraw" name="correctDraw" type="number" defaultValue={2} min={0} />
              </div>
            </div>
          </div>

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" disabled={pending}>
            {pending ? "Wird erstellt…" : "Wettbewerb erstellen"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
