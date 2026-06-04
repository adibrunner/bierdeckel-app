"use client";

import { useState, useTransition } from "react";
import { submitSpecialAnswer, scoreSpecialQuestion, deleteSpecialQuestion } from "@/app/actions/special-questions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Lock, Settings, Trash2 } from "lucide-react";

interface Participant {
  id: string;
  name: string;
}

interface ExistingAnswer {
  answer: string;
  pointsAwarded: number | null;
}

interface Props {
  question: {
    id: string;
    competitionId: string;
    question: string;
    description: string | null;
    type: "SINGLE_PARTICIPANT" | "MULTIPLE_PARTICIPANTS" | "NUMBER";
    points: number;
    deadline: Date;
    requiredCount: number | null;
    usePercentageTolerance: boolean;
    correctAnswer: string | null;
  };
  participants: Participant[];
  existingAnswer?: ExistingAnswer;
  isAdmin: boolean;
}

export function SpecialQuestionCard({ question, participants, existingAnswer, isAdmin }: Props) {
  const locked = question.deadline <= new Date();
  const scored = question.correctAnswer !== null;

  const [singleSelected, setSingleSelected] = useState<string>(
    existingAnswer && question.type === "SINGLE_PARTICIPANT"
      ? JSON.parse(existingAnswer.answer)
      : ""
  );
  const [multiSelected, setMultiSelected] = useState<string[]>(
    existingAnswer && question.type === "MULTIPLE_PARTICIPANTS"
      ? JSON.parse(existingAnswer.answer)
      : []
  );
  const [numberValue, setNumberValue] = useState<string>(
    existingAnswer && question.type === "NUMBER"
      ? String(JSON.parse(existingAnswer.answer))
      : ""
  );
  const [correctInput, setCorrectInput] = useState(question.correctAnswer ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleMulti(id: string) {
    setMultiSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (question.requiredCount && prev.length >= question.requiredCount) return prev;
      return [...prev, id];
    });
  }

  function handleSubmit() {
    let answer: string;
    if (question.type === "SINGLE_PARTICIPANT") answer = JSON.stringify(singleSelected);
    else if (question.type === "MULTIPLE_PARTICIPANTS") answer = JSON.stringify(multiSelected);
    else answer = JSON.stringify(Number(numberValue));

    setError(null);
    startTransition(async () => {
      const result = await submitSpecialAnswer(question.id, answer);
      if (result.error) { setError(result.error); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  function handleScore() {
    startTransition(async () => {
      const result = await scoreSpecialQuestion(question.id, correctInput);
      if (result.error) setError(result.error);
    });
  }

  function handleDelete() {
    if (!confirm("Spezialtipp wirklich löschen?")) return;
    startTransition(() => deleteSpecialQuestion(question.id, question.competitionId));
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-sm font-semibold">{question.question}</CardTitle>
            {question.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{question.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline">{question.points} Pkt.</Badge>
            {locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
            {isAdmin && (
              <Button variant="ghost" size="icon" onClick={handleDelete} disabled={isPending} title="Löschen">
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Deadline: {new Date(question.deadline).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* User answer input */}
        {!locked && (
          <div className="space-y-2">
            {question.type === "SINGLE_PARTICIPANT" && (
              <select
                value={singleSelected}
                onChange={(e) => setSingleSelected(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">– Teilnehmer auswählen –</option>
                {participants.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
            {question.type === "MULTIPLE_PARTICIPANTS" && (
              <div className="flex flex-wrap gap-2">
                {participants.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleMulti(p.id)}
                    className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                      multiSelected.includes(p.id)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input hover:bg-muted"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
                <p className="text-xs text-muted-foreground w-full">
                  {multiSelected.length} / {question.requiredCount ?? "?"} ausgewählt
                </p>
              </div>
            )}
            {question.type === "NUMBER" && (
              <Input
                type="number"
                value={numberValue}
                onChange={(e) => setNumberValue(e.target.value)}
                placeholder="Zahl eingeben…"
                className="max-w-[160px]"
              />
            )}
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSubmit} disabled={isPending}>
                <Check className="h-3.5 w-3.5 mr-1" />
                Speichern
              </Button>
              {saved && <span className="text-xs text-green-600">Gespeichert</span>}
              {error && <span className="text-xs text-destructive">{error}</span>}
            </div>
          </div>
        )}

        {/* Locked: show existing answer */}
        {locked && existingAnswer && (
          <div className="text-sm">
            <span className="text-muted-foreground">Dein Tipp: </span>
            <AnswerDisplay answer={existingAnswer.answer} type={question.type} participants={participants} />
            {existingAnswer.pointsAwarded !== null && (
              <span className="ml-2 font-semibold">{existingAnswer.pointsAwarded} Pkt.</span>
            )}
          </div>
        )}
        {locked && !existingAnswer && (
          <p className="text-xs text-muted-foreground">Kein Tipp abgegeben.</p>
        )}

        {/* Admin: enter correct answer */}
        {isAdmin && locked && (
          <div className="border-t pt-3 space-y-2">
            <p className="text-xs font-medium flex items-center gap-1">
              <Settings className="h-3.5 w-3.5" /> Lösung eintragen
            </p>
            {question.type === "SINGLE_PARTICIPANT" && (
              <select
                value={correctInput}
                onChange={(e) => setCorrectInput(JSON.stringify(e.target.value))}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">– Lösung auswählen –</option>
                {participants.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
            {question.type === "NUMBER" && (
              <Input
                type="number"
                value={correctInput}
                onChange={(e) => setCorrectInput(e.target.value)}
                placeholder="Korrekte Zahl"
                className="max-w-[160px]"
              />
            )}
            <Button size="sm" variant="outline" onClick={handleScore} disabled={isPending || scored}>
              {scored ? "Bereits ausgewertet" : "Auswerten & Punkte vergeben"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AnswerDisplay({
  answer,
  type,
  participants,
}: {
  answer: string;
  type: string;
  participants: Participant[];
}) {
  try {
    const parsed = JSON.parse(answer);
    if (type === "SINGLE_PARTICIPANT") {
      return <span>{participants.find((p) => p.id === parsed)?.name ?? parsed}</span>;
    }
    if (type === "MULTIPLE_PARTICIPANTS") {
      const names = (parsed as string[]).map((id) => participants.find((p) => p.id === id)?.name ?? id);
      return <span>{names.join(", ")}</span>;
    }
    return <span>{String(parsed)}</span>;
  } catch {
    return <span>{answer}</span>;
  }
}
