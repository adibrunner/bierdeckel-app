"use client";

import { useActionState, useState } from "react";
import { createSpecialQuestion } from "@/app/actions/special-questions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  competitionId: string;
}

export function AddSpecialQuestionForm({ competitionId }: Props) {
  const [state, action, pending] = useActionState(createSpecialQuestion, undefined);
  const [type, setType] = useState("SINGLE_PARTICIPANT");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Spezialtipp hinzufügen</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <input type="hidden" name="competitionId" value={competitionId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="sq-question">Frage *</Label>
              <Input id="sq-question" name="question" placeholder="z.B. Wer wird Weltmeister?" required />
              {state?.errors?.question && <p className="text-xs text-destructive">{state.errors.question[0]}</p>}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="sq-description">Beschreibung (optional)</Label>
              <Input id="sq-description" name="description" placeholder="Zusätzliche Info…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sq-type">Typ</Label>
              <select
                id="sq-type"
                name="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="SINGLE_PARTICIPANT">Einzelner Teilnehmer</option>
                <option value="MULTIPLE_PARTICIPANTS">Mehrere Teilnehmer</option>
                <option value="NUMBER">Zahl</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sq-points">Punkte *</Label>
              <Input id="sq-points" name="points" type="number" min={1} defaultValue={10} required />
              {state?.errors?.points && <p className="text-xs text-destructive">{state.errors.points[0]}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sq-deadline">Deadline *</Label>
              <Input id="sq-deadline" name="deadline" type="datetime-local" required />
              {state?.errors?.deadline && <p className="text-xs text-destructive">{state.errors.deadline[0]}</p>}
            </div>
            {type === "MULTIPLE_PARTICIPANTS" && (
              <div className="space-y-1.5">
                <Label htmlFor="sq-requiredCount">Anzahl Auswahl *</Label>
                <Input id="sq-requiredCount" name="requiredCount" type="number" min={2} defaultValue={2} />
                {state?.errors?.requiredCount && <p className="text-xs text-destructive">{state.errors.requiredCount[0]}</p>}
              </div>
            )}
            {type === "NUMBER" && (
              <div className="flex items-center gap-2 pt-5">
                <input type="checkbox" id="sq-tolerance" name="usePercentageTolerance" />
                <Label htmlFor="sq-tolerance" className="font-normal">Prozentuale Teilpunkte</Label>
              </div>
            )}
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending} size="sm">
            {pending ? "…" : "Spezialtipp erstellen"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
