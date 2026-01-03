import { Outlet } from "react-router-dom";
import { BottomNav } from "@/components/mobile/bottom-nav";

export default function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 pb-16">
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
