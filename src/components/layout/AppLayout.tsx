import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";

export default function AppLayout() {
  useInactivityLogout();

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="pl-64 min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 p-6 lg:p-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
