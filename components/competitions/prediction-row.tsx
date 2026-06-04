"use client";

import { useState, useTransition } from "react";
import { submitPrediction } from "@/app/actions/competitions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface Props {
  fixtureId: string;
  existingHome?: number;
  existingAway?: number;
  locked: boolean;
}

export function PredictionRow({ fixtureId, existingHome, existingAway, locked }: Props) {
  const [home, setHome] = useState(existingHome?.toString() ?? "");
  const [away, setAway] = useState(existingAway?.toString() ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    const h = parseInt(home);
    const a = parseInt(away);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      setError("Bitte gültige Zahlen eingeben.");
      return;
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

  if (locked) {
    if (existingHome !== undefined && existingAway !== undefined) {
      return (
        <span className="text-sm font-medium">
          {existingHome} : {existingAway}
        </span>
      );
    }
    return <span className="text-xs text-muted-foreground">Kein Tipp</span>;
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
      <span className="text-muted-foreground text-sm">:</span>
      <Input
        className="w-12 text-center px-1"
        value={away}
        onChange={(e) => setAway(e.target.value)}
        type="number"
        min={0}
        placeholder="0"
      />
      <Button size="icon" variant="outline" onClick={handleSubmit} disabled={isPending}>
        <Check className="h-4 w-4" />
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {saved && <span className="text-xs text-green-600">Gespeichert</span>}
    </div>
  );
}
