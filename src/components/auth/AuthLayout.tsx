import { CalendarDays } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  description?: string;
  showMobileLogo?: boolean;
}

export function AuthLayout({ children, title, subtitle, description, showMobileLogo = true }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex overflow-hidden">
      {/* Left: Branding - full screen initially, shrinks to 50% (slide left then return) */}
      <div className="hidden lg:flex lg:min-h-screen lg:flex-shrink-0 lg:flex-col lg:items-center lg:justify-center lg:relative lg:overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/90 animate-auth-panel-split lg:w-full">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-white/10 blur-3xl animate-auth-orb-float" />
          <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full bg-white/8 blur-2xl animate-auth-orb-float" style={{ animationDelay: "-5s" }} />
          <div className="absolute top-1/2 right-1/3 w-32 h-32 rounded-full bg-white/5 blur-xl animate-auth-orb-float" style={{ animationDelay: "-10s" }} />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 z-10">
          <div className="flex h-16 w-16 lg:h-20 lg:w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm mb-6 lg:mb-8 animate-auth-float">
            <CalendarDays className="h-8 w-8 lg:h-10 lg:w-10 text-white" />
          </div>
          <h1 className="text-2xl lg:text-4xl xl:text-5xl font-display font-bold text-white tracking-tight leading-tight">
            {title}
            <br />
            <span className="text-white/90">{subtitle}</span>
          </h1>
          {description && (
            <p className="mt-4 lg:mt-6 text-white/80 text-sm lg:text-lg max-w-xs lg:max-w-md">
              {description}
            </p>
          )}
        </div>
        <p className="absolute bottom-6 lg:bottom-8 left-0 right-0 text-center text-white/50 text-xs lg:text-sm">© MeetFlow</p>
      </div>

      {/* Right: Form - 50%, scroll khi form dài, không đẩy layout */}
      <div className="flex-1 h-screen min-w-0 overflow-y-auto overflow-x-hidden">
        <div className="min-h-full flex items-center justify-center p-6 lg:p-12 bg-gradient-to-br from-slate-50 via-background to-primary/5 relative">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl animate-auth-orb-float" />
            <div className="absolute bottom-20 -left-20 w-60 h-60 rounded-full bg-primary/5 blur-2xl animate-auth-orb-float" style={{ animationDelay: "-5s" }} />
            <div className="absolute top-1/2 -left-32 w-72 h-72 rounded-full bg-primary/[0.03] blur-3xl animate-auth-orb-float" style={{ animationDelay: "-8s" }} />
            <div className="absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full bg-primary/[0.04] blur-3xl animate-auth-orb-float" style={{ animationDelay: "-12s" }} />
            <div className="absolute top-1/3 right-0 w-48 h-48 rounded-full bg-primary/[0.02] blur-2xl animate-auth-orb-float" style={{ animationDelay: "-3s" }} />
          </div>
          <div className="w-full max-w-md relative py-8">
          {showMobileLogo && (
            <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary animate-auth-float">
                <CalendarDays className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-display font-bold">MeetFlow</span>
            </div>
          )}
          {children}
          </div>
        </div>
      </div>
    </div>
  );
}
