"use client";

import { useActionState, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { recordMatch } from "@/app/actions/darts";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface Props {
  challengeId: string;
  legsToWin: number;
  challengerName: string;
  opponentName: string;
}

export function RecordMatchForm({ challengeId, legsToWin, challengerName, opponentName }: Props) {
  const [state, action, pending] = useActionState(recordMatch, undefined);
  const [legsA, setLegsA] = useState<number>(legsToWin);
  const [legsB, setLegsB] = useState<number>(0);
  const router = useRouter();

  // Redirect to /darts on success (no error in state, state is defined after first submit)
  useEffect(() => {
    if (state !== undefined && !state?.error && !state?.errors) {
      router.push("/darts");
    }
  }, [state, router]);

  // Generate valid leg score options: one side must reach legsToWin, no draw
  const options: { a: number; b: number }[] = [];
  for (let a = 0; a <= legsToWin; a++) {
    for (let b = 0; b <= legsToWin; b++) {
      if ((a === legsToWin || b === legsToWin) && a !== b) {
        options.push({ a, b });
      }
    }
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="challengeId" value={challengeId} />
      <input type="hidden" name="legsA" value={legsA} />
      <input type="hidden" name="legsB" value={legsB} />

      <div className="space-y-2">
        <Label className="text-sm">Ergebnis (Legs)</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {options.map((o) => {
            const isSelected = legsA === o.a && legsB === o.b;
            return (
              <button
                key={`${o.a}-${o.b}`}
                type="button"
                onClick={() => { setLegsA(o.a); setLegsB(o.b); }}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input hover:bg-muted"
                }`}
              >
                <span className={o.a > o.b ? "font-bold" : ""}>{challengerName}</span>
                {" "}{o.a} – {o.b}{" "}
                <span className={o.b > o.a ? "font-bold" : ""}>{opponentName}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Format: First to {legsToWin} Legs
        </p>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Wird gespeichert…" : "Ergebnis bestätigen"}
      </Button>
    </form>
  );
}
