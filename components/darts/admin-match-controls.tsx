"use client";

import { useActionState, useState, useTransition } from "react";
import { adminOverrideMatch, adminDeleteMatch } from "@/app/actions/darts";
import type { AdminOverrideState } from "@/app/actions/darts";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash2, Pencil } from "lucide-react";

interface Props {
  matchId: string;
  legsToWin: number;
  challengerName: string;
  opponentName: string;
}

export function AdminMatchControls({ matchId, legsToWin, challengerName, opponentName }: Props) {
  const [showOverride, setShowOverride] = useState(false);
  const [overrideState, overrideAction, overridePending] = useActionState<AdminOverrideState, FormData>(
    adminOverrideMatch,
    undefined
  );
  const [deletePending, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const options: { a: number; b: number }[] = [];
  for (let a = 0; a <= legsToWin; a++) {
    for (let b = 0; b <= legsToWin; b++) {
      if ((a === legsToWin || b === legsToWin) && a !== b) {
        options.push({ a, b });
      }
    }
  }

  const [legsA, setLegsA] = useState<number>(legsToWin);
  const [legsB, setLegsB] = useState<number>(0);

  async function handleDelete() {
    if (!confirm("Match wirklich löschen und ELO rückgängig machen?")) return;
    startDelete(async () => {
      const result = await adminDeleteMatch(matchId);
      if (result?.error) setDeleteError(result.error);
    });
  }

  return (
    <div className="space-y-3">
      {!showOverride ? (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => setShowOverride(true)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Ergebnis korrigieren
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="flex-1"
            onClick={handleDelete}
            disabled={deletePending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {deletePending ? "Wird gelöscht…" : "Match löschen"}
          </Button>
        </div>
      ) : (
        <form action={overrideAction} className="space-y-3">
          <input type="hidden" name="matchId" value={matchId} />
          <input type="hidden" name="legsA" value={legsA} />
          <input type="hidden" name="legsB" value={legsB} />

          <Label className="text-sm">Korrektes Ergebnis</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {options.map((o) => {
              const isSelected = legsA === o.a && legsB === o.b;
              return (
                <button
                  key={`${o.a}-${o.b}`}
                  type="button"
                  onClick={() => { setLegsA(o.a); setLegsB(o.b); }}
                  className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
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

          {overrideState?.error && <p className="text-sm text-destructive">{overrideState.error}</p>}

          <div className="flex gap-2">
            <Button type="submit" size="sm" className="flex-1" disabled={overridePending}>
              {overridePending ? "Wird gespeichert…" : "Ergebnis speichern"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowOverride(false)}>
              Abbrechen
            </Button>
          </div>
        </form>
      )}

      {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
    </div>
  );
}
