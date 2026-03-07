import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarDays, LogIn, Loader2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, login } = useAuth();

  const getLandingPath = (authorities?: string[]) =>
    authorities?.includes("ROLE_ADMIN") ? "/" : "/calendar";

  useEffect(() => {
    if (!authLoading && user) navigate(getLandingPath(user.authorities), { replace: true });
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const account = await login(username, password, rememberMe);
      navigate(getLandingPath(account.authorities), { replace: true });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Đăng nhập thất bại",
        description: err instanceof Error ? err.message : "Lỗi không xác định",
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-background to-primary/5">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" strokeWidth={2} />
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left: Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary to-primary/90 p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <CalendarDays className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-display font-bold text-white tracking-tight">MeetFlow</span>
        </div>
        <div>
          <h2 className="text-3xl font-display font-bold text-white tracking-tight leading-tight">
            Quản lý cuộc họp
            <br />
            <span className="text-white/90">chuyên nghiệp</span>
          </h2>
          <p className="mt-4 text-white/80 text-lg max-w-sm">
            Lên lịch, theo dõi và quản lý cuộc họp hiệu quả. Tất cả trong một nền tảng.
          </p>
        </div>
        <p className="text-white/60 text-sm">© MeetFlow — Hệ thống quản lý cuộc họp</p>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-gradient-to-br from-slate-50 via-background to-primary/5">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <CalendarDays className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-display font-bold">MeetFlow</span>
          </div>

          <Card className="border-0 shadow-2xl shadow-primary/10 overflow-hidden">
            <CardHeader className="space-y-2 pb-6">
              <CardTitle className="text-2xl font-display font-bold tracking-tight">Đăng nhập</CardTitle>
              <CardDescription>Nhập tên đăng nhập và mật khẩu để tiếp tục</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="username">Tên đăng nhập</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="admin hoặc email"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-11"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mật khẩu</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11"
                    required
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="rememberMe" checked={rememberMe} onCheckedChange={(v) => setRememberMe(!!v)} />
                    <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer text-muted-foreground">
                      Ghi nhớ đăng nhập
                    </Label>
                  </div>
                  <Link to="/forgot-password" className="text-sm text-primary hover:underline font-medium">
                    Quên mật khẩu?
                  </Link>
                </div>
                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <LogIn className="h-4 w-4 mr-2" />
                  )}
                  Đăng nhập
                </Button>
              </form>
              <p className="text-center text-sm text-muted-foreground pt-2 border-t">
                Chưa có tài khoản?{" "}
                <Link to="/register" className="text-primary font-semibold hover:underline inline-flex items-center gap-1">
                  Đăng ký <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
