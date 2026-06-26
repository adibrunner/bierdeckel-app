"use client";

interface Props {
  count: number;
}

export function PendingChallengesBadge({ count }: Props) {
  if (count === 0) return null;
  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-destructive-foreground leading-none">
      {count > 9 ? "9+" : count}
    </span>
  );
}
