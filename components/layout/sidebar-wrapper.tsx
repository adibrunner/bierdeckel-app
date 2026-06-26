import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Sidebar } from "./sidebar";

export async function SidebarWrapper() {
  const session = await auth();
  const userId = session?.user?.id;

  let pendingChallenges = 0;
  if (userId) {
    pendingChallenges = await prisma.dartsChallenge.count({
      where: { opponentId: userId, status: "PENDING" },
    });
  }

  return <Sidebar pendingChallenges={pendingChallenges} />;
}
