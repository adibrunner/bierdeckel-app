"use client";

import { useTransition, useState } from "react";
import { deleteLeague } from "@/app/actions/darts";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface Props {
  leagueId: string;
  leagueName: string;
}

export function DeleteLeagueButton({ leagueId, leagueName }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!confirm(`Liga "${leagueName}" wirklich löschen? Alle zugehörigen Match-Daten bleiben erhalten.`)) return;
    startTransition(async () => {
      try {
        await deleteLeague(leagueId);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Fehler beim Löschen.");
      }
    });
  }

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2"
        onClick={handleDelete}
        disabled={pending}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
