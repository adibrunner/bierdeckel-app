"use client";

import { useActionState, useState } from "react";
import { createParticipant } from "@/app/actions/participants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const typeOptions = [
  { value: "PLAYER", label: "Spieler (Darts / Tennis / …)" },
  { value: "COUNTRY", label: "Land (Fußball / Eishockey / …)" },
  { value: "TEAM", label: "Team / Verein" },
];

export function CreateParticipantForm() {
  const [state, action, pending] = useActionState(createParticipant, undefined);
  const [type, setType] = useState("TEAM");

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base">Neuer Teilnehmer</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="type">Typ</Label>
              <select
                id="type"
                name="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {typeOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Anzeigename *</Label>
              <Input id="name" name="name" placeholder="z.B. Luke Littler" required />
              {state?.errors?.name && <p className="text-xs text-destructive">{state.errors.name[0]}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shortName">Kurzname</Label>
              <Input id="shortName" name="shortName" placeholder="z.B. Littler" />
            </div>
            {type === "PLAYER" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">Vorname</Label>
                  <Input id="firstName" name="firstName" placeholder="Luke" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Nachname</Label>
                  <Input id="lastName" name="lastName" placeholder="Littler" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nickname">Spitzname</Label>
                  <Input id="nickname" name="nickname" placeholder="The Nuke" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="country">Land</Label>
                  <Input id="country" name="country" placeholder="England" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="worldRank">Weltrangliste</Label>
                  <Input id="worldRank" name="worldRank" type="number" min={1} placeholder="1" />
                </div>
              </>
            )}
            {type === "COUNTRY" && (
              <div className="space-y-1.5">
                <Label htmlFor="imageUrl">Flagge URL</Label>
                <Input id="imageUrl" name="imageUrl" type="url" placeholder="https://…" />
                {state?.errors?.imageUrl && <p className="text-xs text-destructive">{state.errors.imageUrl[0]}</p>}
              </div>
            )}
            {type === "TEAM" && (
              <div className="space-y-1.5">
                <Label htmlFor="country">Liga / Land</Label>
                <Input id="country" name="country" placeholder="z.B. Bundesliga" />
              </div>
            )}
          </div>

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" disabled={pending}>
            {pending ? "Wird erstellt…" : "Teilnehmer erstellen"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
