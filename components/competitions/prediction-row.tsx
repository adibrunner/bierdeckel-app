"use client";

import { useState, useTransition } from "react";
import { submitPrediction } from "@/app/actions/competitions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

type MatchFormat = "SCORE" | "SETS" | "WINNER_ONLY";

interface Props {
  fixtureId: string;
  matchFormat: MatchFormat;
  setsToWin?: number | null;
  homeName: string;
  awayName: string;
  existingHome?: number;
  existingAway?: number;
  existingWinner?: string;
  locked: boolean;
}

export function PredictionRow({
  fixtureId,
  matchFormat,
  setsToWin,
  homeName,
  awayName,
  existingHome,
  existingAway,
  existingWinner,
  locked,
}: Props) {
  const [home, setHome] = useState(existingHome?.toString() ?? "");
  const [away, setAway] = useState(existingAway?.toString() ?? "");
  const [winner, setWinner] = useState(existingWinner ?? "");
  const [saved, setSaved] = useState(false);
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
        setError("Bitte gültige Zahlen eingeben.");
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
        await submitPrediction(fixtureId, h, a);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler beim Speichern.");
      }
    });
  }

  // Locked: show existing tip
  if (locked) {
    if (matchFormat === "WINNER_ONLY") {
      const w = existingWinner ?? (existingHome !== undefined ? (existingHome > (existingAway ?? 0) ? "home" : "away") : undefined);
      if (!w) return <span className="text-xs text-muted-foreground">Kein Tipp</span>;
      return <span className="text-sm font-medium">{w === "home" ? homeName : awayName}</span>;
    }
    if (existingHome !== undefined && existingAway !== undefined) {
      return <span className="text-sm font-medium">{existingHome} : {existingAway}</span>;
    }
    return <span className="text-xs text-muted-foreground">Kein Tipp</span>;
  }

  if (matchFormat === "WINNER_ONLY") {
    return (
      <div className="flex items-center gap-3">
        {["home", "away"].map((side) => (
          <label key={side} className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name={`winner-${fixtureId}`}
              value={side}
              checked={winner === side}
              onChange={() => setWinner(side)}
            />
            <span className="text-sm">{side === "home" ? homeName : awayName}</span>
          </label>
        ))}
        <Button size="icon" variant="outline" onClick={handleSubmit} disabled={isPending}>
          <Check className="h-4 w-4" />
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {saved && <span className="text-xs text-green-600">Gespeichert</span>}
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
        placeholder={matchFormat === "SETS" ? "0" : "0"}
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
      <Button size="icon" variant="outline" onClick={handleSubmit} disabled={isPending}>
        <Check className="h-4 w-4" />
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {saved && <span className="text-xs text-green-600">Gespeichert</span>}
    </div>
  );
}
