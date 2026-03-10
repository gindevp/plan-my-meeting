import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Mail, Lock, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { API_BASE } from "@/lib/api";

const API_BASE_URL = `${API_BASE}/api`;

export default function ForgotPasswordPage() {
  const [searchParams] = useSearchParams();
  const resetKey = searchParams.get("key");

  if (resetKey) {
    return <ResetPasswordForm resetKey={resetKey} />;
  }
  return <ForgotPasswordRequestForm />;
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
    <AuthLayout
      title="MeetViet"
      subtitle="nền tảng quản lý cuộc họp"
      description="Lên lịch, theo dõi và quản lý cuộc họp hiệu quả với MeetViet."
    >
      <Card className="border-0 shadow-2xl shadow-primary/10 overflow-hidden opacity-0 animate-auth-scale-in" style={{ animationDelay: "1.8s", animationFillMode: "forwards" }}>
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
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 animate-auth-success-pop">
                  <Mail className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <p className="text-center text-sm text-muted-foreground opacity-0 animate-auth-fade-in-up auth-stagger-1">
                Đã gửi email đặt lại mật khẩu đến <span className="font-semibold text-foreground">{email}</span>
              </p>
              <Link to="/login" className="block opacity-0 animate-auth-fade-in-up auth-stagger-2">
                <Button variant="outline" className="w-full h-11 gap-2 transition-all duration-200 hover:scale-[1.02]">
                  <ArrowLeft className="h-4 w-4" /> Quay lại đăng nhập
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleResetRequest} className="space-y-5">
              {error && (
                <Alert variant="destructive" className="opacity-0 animate-auth-fade-in-up">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2 opacity-0 animate-auth-fade-in-up auth-stagger-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 transition-all duration-200 focus:scale-[1.01]"
                  required
                />
              </div>
              <div className="opacity-0 animate-auth-fade-in-up auth-stagger-2">
                <Button type="submit" className="w-full h-11 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                  Gửi link đặt lại
                </Button>
              </div>
              <Link to="/login" className="block opacity-0 animate-auth-fade-in-up auth-stagger-3">
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
      <AuthLayout
        title="MeetViet"
        subtitle="nền tảng quản lý cuộc họp"
        description="Lên lịch, theo dõi và quản lý cuộc họp hiệu quả với MeetViet."
      >
        <Card className="border-0 shadow-2xl shadow-primary/10 overflow-hidden opacity-0 animate-auth-scale-in" style={{ animationDelay: "1.8s", animationFillMode: "forwards" }}>
          <CardContent className="pt-10 pb-10 px-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/15 animate-auth-success-pop">
                <CheckCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
              </div>
            </div>
            <h2 className="text-2xl font-display font-bold tracking-tight text-emerald-700 dark:text-emerald-400 opacity-0 animate-auth-fade-in-up auth-stagger-1">
              Đổi mật khẩu thành công!
            </h2>
            <p className="text-muted-foreground mt-2 max-w-xs mx-auto opacity-0 animate-auth-fade-in-up auth-stagger-2">
              Bạn có thể đăng nhập với mật khẩu mới ngay bây giờ.
            </p>
            <Link to="/login" className="block mt-8 opacity-0 animate-auth-fade-in-up auth-stagger-3">
              <Button className="w-full h-11 gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
                <ArrowLeft className="h-4 w-4 rotate-180" /> Đăng nhập
              </Button>
            </Link>
          </CardContent>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="MeetViet"
      subtitle="nền tảng quản lý cuộc họp"
      description="Lên lịch, theo dõi và quản lý cuộc họp hiệu quả với MeetViet."
    >
      <Card className="border-0 shadow-2xl shadow-primary/10 overflow-hidden opacity-0 animate-auth-scale-in" style={{ animationDelay: "1.8s", animationFillMode: "forwards" }}>
        <CardHeader className="space-y-3 pb-6">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-4 ring-primary/5 animate-auth-float">
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
              <Alert variant="destructive" className="py-3 opacity-0 animate-auth-fade-in-up">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2 opacity-0 animate-auth-fade-in-up auth-stagger-1">
              <Label htmlFor="newPassword">Mật khẩu mới</Label>
              <PasswordInput
                id="newPassword"
                placeholder="Nhập mật khẩu mới"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-11 transition-all duration-200 focus:scale-[1.01]"
                required
                minLength={4}
              />
            </div>
            <div className="space-y-2 opacity-0 animate-auth-fade-in-up auth-stagger-2">
              <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
              <PasswordInput
                id="confirmPassword"
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11 transition-all duration-200 focus:scale-[1.01]"
                required
                minLength={4}
              />
            </div>
            <div className="opacity-0 animate-auth-fade-in-up auth-stagger-3">
              <Button type="submit" className="w-full h-11 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
                Đổi mật khẩu
              </Button>
            </div>
            <Link to="/login" className="block opacity-0 animate-auth-fade-in-up auth-stagger-4">
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
