"use client";

import { deleteUser, updateUserRole } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface UserActionsProps {
  userId: string;
  currentRole: "ADMIN" | "USER";
  isSelf: boolean;
}

export function UserActions({ userId, currentRole, isSelf }: UserActionsProps) {
  const newRole = currentRole === "ADMIN" ? "USER" : "ADMIN";

  return (
    <div className="flex items-center gap-2">
      <form
        action={async () => {
          await updateUserRole(userId, newRole);
        }}
      >
        <Button variant="outline" size="sm" type="submit" disabled={isSelf}>
          Make {newRole === "ADMIN" ? "Admin" : "User"}
        </Button>
      </form>

      <form
        action={async () => {
          if (confirm("Delete this user? This cannot be undone.")) {
            await deleteUser(userId);
          }
        }}
      >
        <Button variant="destructive" size="icon" type="submit" disabled={isSelf} title="Delete user">
          <Trash2 className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
