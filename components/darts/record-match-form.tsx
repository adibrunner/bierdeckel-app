"use client";

import { useActionState, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { recordMatch } from "@/app/actions/darts";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";

interface Props {
  challengeId: string;
  legsToWin: number;
  challengerName: string;
  opponentName: string;
}

type LegEntry = { winner: "A" | "B" | null; checkout: string };

export function RecordMatchForm({ challengeId, legsToWin, challengerName, opponentName }: Props) {
  const [state, action, pending] = useActionState(recordMatch, undefined);
  const [legsA, setLegsA] = useState<number>(legsToWin);
  const [legsB, setLegsB] = useState<number>(0);
  const [step, setStep] = useState<"score" | "legs">("score");
  const [legEntries, setLegEntries] = useState<LegEntry[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (state !== undefined && !state?.error && !state?.errors) {
      router.push("/darts");
    }
  }, [state, router]);

  // Reset leg entries when score changes
  useEffect(() => {
    const total = legsA + legsB;
    setLegEntries(Array.from({ length: total }, () => ({ winner: null, checkout: "" })));
  }, [legsA, legsB]);

  const options: { a: number; b: number }[] = [];
  for (let a = 0; a <= legsToWin; a++) {
    for (let b = 0; b <= legsToWin; b++) {
      if ((a === legsToWin || b === legsToWin) && a !== b) {
        options.push({ a, b });
      }
    }
  }

  function setLegWinner(i: number, winner: "A" | "B") {
    setLegEntries((prev) => prev.map((e, idx) => idx === i ? { ...e, winner } : e));
  }
  function setLegCheckout(i: number, val: string) {
    setLegEntries((prev) => prev.map((e, idx) => idx === i ? { ...e, checkout: val } : e));
  }

  if (step === "legs") {
    return (
      <form action={action} className="space-y-5">
        <input type="hidden" name="challengeId" value={challengeId} />
        <input type="hidden" name="legsA" value={legsA} />
        <input type="hidden" name="legsB" value={legsB} />
        {legEntries.map((e, i) => (
          <input key={i} type="hidden" name={`leg_winner_${i + 1}`} value={e.winner ?? ""} />
        ))}
        {legEntries.map((e, i) => (
          e.checkout ? <input key={i} type="hidden" name={`leg_checkout_${i + 1}`} value={e.checkout} /> : null
        ))}

        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setStep("score")}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-3 w-3" /> Zurück zum Ergebnis ({legsA}–{legsB})
          </button>
          <p className="text-sm font-medium">Wer hat welches Leg gewonnen?</p>
          <p className="text-xs text-muted-foreground">Checkout optional — hilft für Statistiken.</p>
        </div>

        <div className="space-y-3">
          {legEntries.map((e, i) => (
            <div key={i} className="rounded-md border p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Leg {i + 1}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLegWinner(i, "A")}
                  className={`flex-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                    e.winner === "A"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input hover:bg-muted"
                  }`}
                >
                  {challengerName}
                </button>
                <button
                  type="button"
                  onClick={() => setLegWinner(i, "B")}
                  className={`flex-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                    e.winner === "B"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input hover:bg-muted"
                  }`}
                >
                  {opponentName}
                </button>
              </div>
              {e.winner && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs shrink-0 text-muted-foreground">Checkout</Label>
                  <Input
                    type="number"
                    min={1}
                    max={170}
                    placeholder="z.B. 170"
                    value={e.checkout}
                    onChange={(ev) => setLegCheckout(i, ev.target.value)}
                    className="h-7 text-sm w-24"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

        <Button
          type="submit"
          disabled={pending || legEntries.some((e) => e.winner === null)}
          className="w-full"
        >
          {pending
            ? "Wird gespeichert…"
            : legEntries.some((e) => e.winner === null)
            ? `Noch ${legEntries.filter((e) => e.winner === null).length} Leg(s) ausstehend`
            : "Ergebnis bestätigen"}
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-5">
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
                {" "}{o.a}–{o.b}{" "}
                <span className={o.b > o.a ? "font-bold" : ""}>{opponentName}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">Format: First to {legsToWin} Legs</p>
      </div>

      <Button className="w-full" onClick={() => setStep("legs")}>
        Weiter → Legs eintragen
      </Button>
    </div>
  );
}
