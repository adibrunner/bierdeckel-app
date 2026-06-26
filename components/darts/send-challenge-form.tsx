"use client";

import { useActionState } from "react";
import { sendChallenge } from "@/app/actions/darts";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Swords } from "lucide-react";

interface Player {
  id: string;
  name: string;
}

interface Props {
  players: Player[];
}

export function SendChallengeForm({ players }: Props) {
  const [state, action, pending] = useActionState(sendChallenge, undefined);

  if (players.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          Keine weiteren registrierten Spieler vorhanden.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Swords className="h-4 w-4" /> Neue Herausforderung senden
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="opponentId" className="text-sm">Gegner auswählen</Label>
            <select
              id="opponentId"
              name="opponentId"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              required
            >
              <option value="">– Spieler wählen –</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {state?.errors?.opponentId && (
              <p className="text-xs text-destructive">{state.errors.opponentId[0]}</p>
            )}
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "…" : "Herausfordern"}
          </Button>
        </form>
        {state?.error && (
          <p className="text-sm text-destructive mt-3">{state.error}</p>
        )}
      </CardContent>
    </Card>
  );
}
