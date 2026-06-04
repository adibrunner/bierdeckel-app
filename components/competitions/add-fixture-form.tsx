"use client";

import { useActionState } from "react";
import { addFixture } from "@/app/actions/competitions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  competitionId: string;
}

export function AddFixtureForm({ competitionId }: Props) {
  const [state, action, pending] = useActionState(addFixture, undefined);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="competitionId" value={competitionId} />
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="homeTeam" className="text-xs">Heim</Label>
          <Input id="homeTeam" name="homeTeam" placeholder="Heimmannschaft" required />
          {state?.errors?.homeTeam && <p className="text-xs text-destructive">{state.errors.homeTeam[0]}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="awayTeam" className="text-xs">Gast</Label>
          <Input id="awayTeam" name="awayTeam" placeholder="Gastmannschaft" required />
          {state?.errors?.awayTeam && <p className="text-xs text-destructive">{state.errors.awayTeam[0]}</p>}
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
