"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { respondToChallenge } from "@/app/actions/darts";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ClipboardList } from "lucide-react";

interface Props {
  challengeId: string;
  status: string;
  isOpponent: boolean;
  hasMatch: boolean;
}

export function ChallengeActions({ challengeId, status, isOpponent, hasMatch }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function accept() {
    startTransition(async () => {
      await respondToChallenge(challengeId, "ACCEPTED");
    });
  }

  function decline() {
    if (!confirm("Herausforderung wirklich ablehnen?")) return;
    startTransition(async () => {
      await respondToChallenge(challengeId, "DECLINED");
    });
  }

  function goToMatch() {
    router.push(`/darts/matches/${challengeId}`);
  }

  if (status === "PENDING" && isOpponent) {
    return (
      <div className="flex gap-2">
        <Button size="sm" onClick={accept} disabled={isPending}>
          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
          Annehmen
        </Button>
        <Button size="sm" variant="outline" onClick={decline} disabled={isPending}>
          <XCircle className="h-3.5 w-3.5 mr-1" />
          Ablehnen
        </Button>
      </div>
    );
  }

  if (status === "ACCEPTED" && !hasMatch) {
    return (
      <Button size="sm" variant="outline" onClick={goToMatch} disabled={isPending}>
        <ClipboardList className="h-3.5 w-3.5 mr-1" />
        Ergebnis eintragen
      </Button>
    );
  }

  if (status === "COMPLETED" && hasMatch) {
    return (
      <Button size="sm" variant="ghost" onClick={goToMatch}>
        <ClipboardList className="h-3.5 w-3.5 mr-1" />
        Details
      </Button>
    );
  }

  return null;
}
