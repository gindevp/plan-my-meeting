import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, ArrowLeft, Loader2, Mail, Lock, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const API_BASE_URL = "http://localhost:8080/api";

export default function ForgotPasswordPage() {
  const [searchParams] = useSearchParams();
  const resetKey = searchParams.get("key");

  if (resetKey) {
    return <ResetPasswordForm resetKey={resetKey} />;
  }
  return <ForgotPasswordRequestForm />;
}

function AuthLayout({ children, showLogo = true }: { children: React.ReactNode; showLogo?: boolean }) {
  return (
    <div className="min-h-screen flex">
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
            Lên lịch, theo dõi và quản lý cuộc họp hiệu quả.
          </p>
        </div>
        <p className="text-white/60 text-sm">© MeetFlow</p>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-gradient-to-br from-slate-50 via-background to-primary/5">
        <div className="w-full max-w-md">
          {showLogo && (
            <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                <CalendarDays className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-display font-bold">MeetFlow</span>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

function ForgotPasswordRequestForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/account/reset-password/init`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: email.trim(),
      });
      if (response.ok) setSent(true);
      else setError("Có lỗi xảy ra");
    } catch {
      setError("Không thể kết nối server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card className="border-0 shadow-2xl shadow-primary/10 overflow-hidden">
        <CardHeader className="space-y-2 pb-6">
          <CardTitle className="text-2xl font-display font-bold tracking-tight">Quên mật khẩu</CardTitle>
          <CardDescription>
            {sent ? "Kiểm tra email của bạn" : "Nhập email để nhận link đặt lại mật khẩu"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
                  <Mail className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Đã gửi email đặt lại mật khẩu đến <span className="font-semibold text-foreground">{email}</span>
              </p>
              <Link to="/login">
                <Button variant="outline" className="w-full h-11 gap-2">
                  <ArrowLeft className="h-4 w-4" /> Quay lại đăng nhập
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleResetRequest} className="space-y-5">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                  required
                />
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                Gửi link đặt lại
              </Button>
              <Link to="/login" className="block">
                <Button variant="ghost" className="w-full h-11 gap-2">
                  <ArrowLeft className="h-4 w-4" /> Quay lại đăng nhập
                </Button>
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  );
}

function ResetPasswordForm({ resetKey }: { resetKey: string }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }
    if (newPassword.length < 4) {
      setError("Mật khẩu phải có ít nhất 4 ký tự");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/account/reset-password/finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: resetKey, newPassword }),
      });
      if (response.ok) setSuccess(true);
      else setError("Có lỗi xảy ra");
    } catch {
      setError("Không thể kết nối server");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout showLogo={true}>
        <Card className="border-0 shadow-2xl shadow-primary/10 overflow-hidden">
          <CardContent className="pt-10 pb-10 px-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/15">
                <CheckCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
              </div>
            </div>
            <h2 className="text-2xl font-display font-bold tracking-tight text-emerald-700 dark:text-emerald-400">
              Đổi mật khẩu thành công!
            </h2>
            <p className="text-muted-foreground mt-2 max-w-xs mx-auto">
              Bạn có thể đăng nhập với mật khẩu mới ngay bây giờ.
            </p>
            <Link to="/login" className="block mt-8">
              <Button className="w-full h-11 gap-2">
                <ArrowLeft className="h-4 w-4 rotate-180" /> Đăng nhập
              </Button>
            </Link>
          </CardContent>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Card className="border-0 shadow-2xl shadow-primary/10 overflow-hidden">
        <CardHeader className="space-y-3 pb-6">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-4 ring-primary/5">
              <Lock className="h-7 w-7 text-primary" />
            </div>
          </div>
          <div className="space-y-1.5 text-center">
            <CardTitle className="text-2xl font-display font-bold tracking-tight">Đặt lại mật khẩu</CardTitle>
            <CardDescription>
              Nhập mật khẩu mới của bạn. Mật khẩu cần ít nhất 4 ký tự.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <form onSubmit={handleReset} className="space-y-5">
            {error && (
              <Alert variant="destructive" className="py-3">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="newPassword">Mật khẩu mới</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Nhập mật khẩu mới"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-11"
                required
                minLength={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11"
                required
                minLength={4}
              />
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
              Đổi mật khẩu
            </Button>
            <Link to="/login" className="block">
              <Button variant="ghost" className="w-full h-11 gap-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" /> Quay lại đăng nhập
              </Button>
            </Link>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
