import { CreateCompetitionForm } from "@/components/competitions/create-competition-form";

export default function NewCompetitionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Neuer Wettbewerb</h1>
        <p className="text-muted-foreground mt-1">Erstelle einen neuen Tipp-Wettbewerb.</p>
      </div>
      <CreateCompetitionForm />
    </div>
  );
}
