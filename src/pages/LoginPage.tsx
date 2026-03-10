import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { LogIn, Loader2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AuthLayout } from "@/components/auth/AuthLayout";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, login } = useAuth();

  const getLandingPath = () => "/";

  useEffect(() => {
    if (!authLoading && user) navigate(getLandingPath(), { replace: true });
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password, rememberMe);
      navigate(getLandingPath(), { replace: true });
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
    <AuthLayout
      title="Quản lý cuộc họp"
      subtitle="chuyên nghiệp"
      description="Lên lịch, theo dõi và quản lý cuộc họp hiệu quả. Tất cả trong một nền tảng."
    >
      <Card className="border-0 shadow-2xl shadow-primary/10 overflow-hidden opacity-0 animate-auth-scale-in" style={{ animationDelay: "1.8s", animationFillMode: "forwards" }}>
            <CardHeader className="space-y-2 pb-6">
              <CardTitle className="text-2xl font-display font-bold tracking-tight">Đăng nhập</CardTitle>
              <CardDescription>Nhập tên đăng nhập và mật khẩu để tiếp tục</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2 opacity-0 animate-auth-fade-in-up auth-stagger-1">
                  <Label htmlFor="username">Tên đăng nhập</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="admin hoặc email"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-11 transition-all duration-200 focus:scale-[1.01]"
                    required
                  />
                </div>
                <div className="space-y-2 opacity-0 animate-auth-fade-in-up auth-stagger-2">
                  <Label htmlFor="password">Mật khẩu</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 transition-all duration-200 focus:scale-[1.01]"
                    required
                  />
                </div>
                <div className="flex items-center justify-between opacity-0 animate-auth-fade-in-up auth-stagger-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="rememberMe" checked={rememberMe} onCheckedChange={(v) => setRememberMe(!!v)} />
                    <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer text-muted-foreground">
                      Ghi nhớ đăng nhập
                    </Label>
                  </div>
                  <Link to="/forgot-password" className="text-sm text-primary hover:underline font-medium transition-opacity hover:opacity-80">
                    Quên mật khẩu?
                  </Link>
                </div>
                <div className="opacity-0 animate-auth-fade-in-up auth-stagger-4">
                  <Button type="submit" className="w-full h-11 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]" disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <LogIn className="h-4 w-4 mr-2" />
                    )}
                    Đăng nhập
                  </Button>
                </div>
              </form>
              <p className="text-center text-sm text-muted-foreground pt-2 border-t opacity-0 animate-auth-fade-in-up auth-stagger-5">
                Chưa có tài khoản?{" "}
                <Link to="/register" className="text-primary font-semibold hover:underline inline-flex items-center gap-1 transition-opacity hover:opacity-80">
                  Đăng ký <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </p>
            </CardContent>
          </Card>
    </AuthLayout>
  );
}
