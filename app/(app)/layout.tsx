import { SidebarWrapper } from "@/components/layout/sidebar-wrapper";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarWrapper />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
