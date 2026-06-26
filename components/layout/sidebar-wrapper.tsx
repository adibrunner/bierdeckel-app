import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Sidebar } from "./sidebar";

export async function SidebarWrapper() {
  const session = await auth();
  const userId = session?.user?.id;

  let pendingChallenges = 0;
  if (userId) {
    // Count: open challenges awaiting my response + matches I need to confirm
    const [openChallenges, matchesNeedingConfirmation] = await Promise.all([
      prisma.dartsChallenge.count({
        where: { opponentId: userId, status: "PENDING" },
      }),
      prisma.dartsMatch.count({
        where: {
          status: "PENDING_CONFIRMATION",
          submittedById: { not: userId },
          OR: [{ playerAId: userId }, { playerBId: userId }],
        },
      }),
    ]);
    pendingChallenges = openChallenges + matchesNeedingConfirmation;
  }

  return <Sidebar pendingChallenges={pendingChallenges} />;
}
