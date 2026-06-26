"use client";

import { useActionState, useTransition } from "react";
import { confirmMatch, disputeMatch } from "@/app/actions/darts";
import type { DisputeState } from "@/app/actions/darts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { useState } from "react";

interface Props {
  matchId: string;
  challengeId: string;
  submittedByName: string;
  config: { legsA: number; legsB: number };
  challengerName: string;
  opponentName: string;
}

export function MatchConfirmation({
  matchId,
  challengeId,
  submittedByName,
  config,
  challengerName,
  opponentName,
}: Props) {
  const [showDispute, setShowDispute] = useState(false);
  const [disputeState, disputeAction, disputePending] = useActionState<DisputeState, FormData>(
    disputeMatch,
    undefined
  );
  const [confirmPending, startConfirm] = useTransition();
  const [confirmError, setConfirmError] = useState<string | null>(null);

  async function handleConfirm() {
    startConfirm(async () => {
      const result = await confirmMatch(matchId);
      if (result?.error) setConfirmError(result.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-300">
        <strong>{submittedByName}</strong> hat dieses Ergebnis eingetragen. Bitte bestätige, dass es korrekt ist.
      </div>

      <div className="flex items-center justify-center text-2xl font-bold py-2">
        <span>{challengerName}</span>
        <span className="mx-4 text-muted-foreground">{config.legsA} – {config.legsB}</span>
        <span>{opponentName}</span>
      </div>

      {!showDispute ? (
        <div className="flex gap-3">
          <Button
            className="flex-1"
            onClick={handleConfirm}
            disabled={confirmPending}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {confirmPending ? "Wird bestätigt…" : "Ergebnis bestätigen"}
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
            onClick={() => setShowDispute(true)}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Anfechten
          </Button>
        </div>
      ) : (
        <form action={disputeAction} className="space-y-3">
          <input type="hidden" name="matchId" value={matchId} />
          <div className="space-y-1.5">
            <Label htmlFor="reason">Grund für die Anfechtung</Label>
            <Textarea
              id="reason"
              name="reason"
              rows={3}
              placeholder="Das Ergebnis war anders. Ich habe gewonnen mit …"
              className="text-sm"
            />
            {disputeState?.errors?.reason && (
              <p className="text-xs text-destructive">{disputeState.errors.reason[0]}</p>
            )}
            {disputeState?.error && (
              <p className="text-xs text-destructive">{disputeState.error}</p>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="submit" variant="destructive" className="flex-1" disabled={disputePending}>
              {disputePending ? "Wird eskaliert…" : "An Admin eskalieren"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowDispute(false)}>
              Abbrechen
            </Button>
          </div>
        </form>
      )}

      {confirmError && <p className="text-sm text-destructive">{confirmError}</p>}
    </div>
  );
}
