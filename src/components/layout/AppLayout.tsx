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
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(() => {
    try {
      return localStorage.getItem("app.sidebar.desktop.open") !== "0";
    } catch {
      return true;
    }
  });

  const handleToggleDesktopSidebar = () => {
    setIsDesktopSidebarOpen(prev => {
      const next = !prev;
      try {
        localStorage.setItem("app.sidebar.desktop.open", next ? "1" : "0");
      } catch {
        // ignore storage failures
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {!isEmbed && (
        <AppSidebar
          isMobile={isMobile}
          isMobileOpen={isSidebarOpen}
          isDesktopExpanded={isDesktopSidebarOpen}
          onCloseMobile={() => setIsSidebarOpen(false)}
        />
      )}
      <div
        className={`min-h-screen flex flex-col ${
          !isEmbed ? (isDesktopSidebarOpen ? "md:pl-64" : "md:pl-[76px]") : ""
        }`}
      >
        {!isEmbed && (
          <AppHeader
            showMenuButton={isMobile}
            onMenuClick={() => setIsSidebarOpen((prev) => !prev)}
            showSidebarToggle={!isMobile}
            isSidebarOpen={isDesktopSidebarOpen}
            onToggleSidebar={handleToggleDesktopSidebar}
          />
        )}
        <main className="flex-1 overflow-x-hidden p-3 sm:p-4 lg:p-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
