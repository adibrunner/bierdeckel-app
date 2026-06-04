"use client";

import { useActionState } from "react";
import { addFixture } from "@/app/actions/competitions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Participant {
  id: string;
  name: string;
  shortName: string | null;
}

interface Props {
  competitionId: string;
  participants: Participant[];
}

export function AddFixtureForm({ competitionId, participants }: Props) {
  const [state, action, pending] = useActionState(addFixture, undefined);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="competitionId" value={competitionId} />
      <div className="grid gap-3 sm:grid-cols-5">
        <div className="space-y-1">
          <Label htmlFor="homeParticipantId" className="text-xs">Heim</Label>
          <select
            id="homeParticipantId"
            name="homeParticipantId"
            required
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">– Auswählen –</option>
            {participants.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {state?.errors?.homeParticipantId && <p className="text-xs text-destructive">{state.errors.homeParticipantId[0]}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="awayParticipantId" className="text-xs">Gast</Label>
          <select
            id="awayParticipantId"
            name="awayParticipantId"
            required
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">– Auswählen –</option>
            {participants.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {state?.errors?.awayParticipantId && <p className="text-xs text-destructive">{state.errors.awayParticipantId[0]}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="round" className="text-xs">Runde (optional)</Label>
          <Input id="round" name="round" placeholder="z.B. Finale" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="startsAt" className="text-xs">Anstoß</Label>
          <Input id="startsAt" name="startsAt" type="datetime-local" required />
          {state?.errors?.startsAt && <p className="text-xs text-destructive">{state.errors.startsAt[0]}</p>}
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={pending} size="sm" className="w-full">
            {pending ? "…" : "Hinzufügen"}
          </Button>
        </div>
      </div>
    </form>
  );
}
