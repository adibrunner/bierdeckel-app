"use client";

import { useState, useTransition } from "react";
import { enterResult } from "@/app/actions/competitions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  fixtureId: string;
  existingHome?: number;
  existingAway?: number;
}

export function EnterResultForm({ fixtureId, existingHome, existingAway }: Props) {
  const [home, setHome] = useState(existingHome?.toString() ?? "");
  const [away, setAway] = useState(existingAway?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    const h = parseInt(home);
    const a = parseInt(away);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      setError("Ungültiges Ergebnis.");
      return;
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
      <Button size="sm" onClick={handleSubmit} disabled={isPending}>
        {isPending ? "…" : "Eintragen"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
