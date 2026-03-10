import { Outlet, useSearchParams } from "react-router-dom";
import { useState } from "react";
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import { useIsMobile } from "@/hooks/use-mobile";

export default function AppLayout() {
  useInactivityLogout();
  const [searchParams] = useSearchParams();
  const isEmbed = searchParams.get("embed") === "1";
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {!isEmbed && (
        <AppSidebar isMobile={isMobile} isMobileOpen={isSidebarOpen} onCloseMobile={() => setIsSidebarOpen(false)} />
      )}
      <div className={`min-h-screen flex flex-col ${!isEmbed ? "md:pl-64" : ""}`}>
        {!isEmbed && <AppHeader showMenuButton={isMobile} onMenuClick={() => setIsSidebarOpen((prev) => !prev)} />}
        <main className="flex-1 overflow-x-hidden p-3 sm:p-4 lg:p-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
