"use client";

import { useState, useTransition } from "react";
import { enterResult } from "@/app/actions/competitions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type MatchFormat = "SCORE" | "SETS" | "WINNER_ONLY";

interface Props {
  fixtureId: string;
  matchFormat: MatchFormat;
  setsToWin?: number | null;
  homeName: string;
  awayName: string;
  existingHome?: number;
  existingAway?: number;
}

export function EnterResultForm({
  fixtureId,
  matchFormat,
  setsToWin,
  homeName,
  awayName,
  existingHome,
  existingAway,
}: Props) {
  const [home, setHome] = useState(existingHome?.toString() ?? "");
  const [away, setAway] = useState(existingAway?.toString() ?? "");
  const [winner, setWinner] = useState(
    existingHome !== undefined
      ? existingHome > (existingAway ?? 0) ? "home" : "away"
      : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    let h: number, a: number;
    if (matchFormat === "WINNER_ONLY") {
      if (!winner) { setError("Bitte Sieger wählen."); return; }
      h = winner === "home" ? 1 : 0;
      a = winner === "away" ? 1 : 0;
    } else {
      h = parseInt(home);
      a = parseInt(away);
      if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
        setError("Ungültiges Ergebnis.");
        return;
      }
      if (matchFormat === "SETS" && setsToWin) {
        if (h !== setsToWin && a !== setsToWin) {
          setError(`Einer muss ${setsToWin} Sets haben.`);
          return;
        }
        if (h === a) { setError("Kein Unentschieden bei Sets."); return; }
      }
    }
    setError(null);
    startTransition(async () => {
      try {
        await enterResult(fixtureId, h, a);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler.");
      }
    });
  }

  if (matchFormat === "WINNER_ONLY") {
    return (
      <div className="flex items-center gap-3">
        {(["home", "away"] as const).map((side) => (
          <label key={side} className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name={`result-winner-${fixtureId}`}
              value={side}
              checked={winner === side}
              onChange={() => setWinner(side)}
            />
            <span className="text-sm">{side === "home" ? homeName : awayName}</span>
          </label>
        ))}
        <Button size="sm" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "…" : "Eintragen"}
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        className="w-12 text-center px-1"
        value={home}
        onChange={(e) => setHome(e.target.value)}
        type="number"
        min={0}
        placeholder="0"
      />
      <span className="text-muted-foreground text-sm">
        {matchFormat === "SETS" ? "-" : ":"}
      </span>
      <Input
        className="w-12 text-center px-1"
        value={away}
        onChange={(e) => setAway(e.target.value)}
        type="number"
        min={0}
        placeholder="0"
      />
      {matchFormat === "SETS" && setsToWin && (
        <span className="text-xs text-muted-foreground">First to {setsToWin}</span>
      )}
      <Button size="sm" onClick={handleSubmit} disabled={isPending}>
        {isPending ? "…" : "Eintragen"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
