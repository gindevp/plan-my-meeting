import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AvatarVersionProvider } from "@/contexts/AvatarVersionContext";
import { I18nProvider } from "@/contexts/I18nContext";
import { getIsApiLoading, subscribeApiLoading } from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import CalendarPage from "./pages/CalendarPage";
import MeetingPlanPage from "./pages/MeetingPlanPage";
import CreateMeetingPage from "./pages/CreateMeetingPage";
import InvitationsPage from "./pages/InvitationsPage";
import RoomManagementPage from "./pages/RoomManagementPage";
import EquipmentManagementPage from "./pages/EquipmentManagementPage";
import ReportsPage from "./pages/ReportsPage";
import StaffPage from "./pages/StaffPage";
import IncidentsPage from "./pages/IncidentsPage";
import DepartmentsPage from "./pages/DepartmentsPage";
import SettingsPage from "./pages/SettingsPage";
import NotificationsPage from "./pages/NotificationsPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ActivateAccountPage from "./pages/ActivateAccountPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const GlobalApiLoadingOverlay = () => {
  const [isLoading, setIsLoading] = useState<boolean>(getIsApiLoading());

  useEffect(() => {
    return subscribeApiLoading(() => {
      setIsLoading(getIsApiLoading());
    });
  }, []);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-background/60 backdrop-blur-[1px] flex items-center justify-center pointer-events-auto">
      <div className="rounded-lg border bg-card px-6 py-4 shadow-lg flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm font-medium text-foreground">Đang xử lý, vui lòng chờ...</span>
      </div>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <GlobalApiLoadingOverlay />
      <BrowserRouter>
        <I18nProvider>
          <AuthProvider>
            <AvatarVersionProvider>
            <Routes>
              <Route path="/login" element={<ErrorBoundary><LoginPage /></ErrorBoundary>} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/activate" element={<ActivateAccountPage />} />
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/plans" element={<MeetingPlanPage />} />
                <Route path="/invitations" element={<InvitationsPage />} />
                <Route path="/meetings/new" element={<CreateMeetingPage key="create" />} />
                <Route path="/meetings/edit/:id" element={<CreateMeetingPage key="edit" />} />
                <Route path="/rooms" element={<RoomManagementPage />} />
                <Route path="/equipment" element={<EquipmentManagementPage />} />
                <Route path="/reports" element={<ProtectedRoute requiredRoles={["ROLE_ADMIN"]}><ReportsPage /></ProtectedRoute>} />
                <Route path="/incidents" element={<ProtectedRoute requiredRoles={["ROLE_ADMIN"]}><IncidentsPage /></ProtectedRoute>} />
                <Route path="/staff" element={<StaffPage />} />
                <Route path="/departments" element={<DepartmentsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            </AvatarVersionProvider>
          </AuthProvider>
        </I18nProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
