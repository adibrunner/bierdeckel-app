"use client";

import { useActionState } from "react";
import { createLeague } from "@/app/actions/darts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";

export function CreateLeagueForm() {
  const [state, action, pending] = useActionState(createLeague, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Plus className="h-4 w-4" /> Neue Liga erstellen
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <Label htmlFor="league-name" className="text-sm">Name *</Label>
            <Input id="league-name" name="name" placeholder="Double-Trouble-Liga" required />
            {state?.errors?.name && (
              <p className="text-xs text-destructive">{state.errors.name[0]}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="league-starting-score" className="text-sm">Spielmodus</Label>
            <select
              id="league-starting-score"
              name="startingScore"
              defaultValue="501"
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="501">501</option>
              <option value="301">301</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="league-legs" className="text-sm">Legs zum Sieg</Label>
            <Input id="league-legs" name="legsToWin" type="number" min={1} defaultValue={3} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="league-k" className="text-sm">K-Faktor</Label>
            <Input id="league-k" name="kFactor" type="number" min={1} defaultValue={32} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="league-elo" className="text-sm">Start-ELO</Label>
            <Input id="league-elo" name="startingElo" type="number" min={1} defaultValue={1000} />
          </div>
          <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "…" : "Liga erstellen"}
            </Button>
            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
