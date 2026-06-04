"use client";

import { useState, useTransition } from "react";
import { deleteParticipant } from "@/app/actions/participants";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface Props {
  participantId: string;
  participantName: string;
}

export function ParticipantActions({ participantId, participantName }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`"${participantName}" wirklich löschen?`)) return;
    startTransition(async () => {
      const result = await deleteParticipant(participantId);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDelete}
        disabled={isPending}
        title="Löschen"
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
