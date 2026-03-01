import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, ArrowLeft, Loader2, Mail, Lock, CheckCircle } from "lucide-react";

const API_BASE_URL = "http://localhost:8080/api";

export default function ForgotPasswordPage() {
  const [searchParams] = useSearchParams();
  const resetKey = searchParams.get("key");
  
  // Nếu có key trong URL → hiển thị form đổi mật khẩu
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

      if (response.ok) {
        setSent(true);
      } else {
        setError("Có lỗi xảy ra");
      }
    } catch {
      setError("Không thể kết nối server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <CalendarDays className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-display">Quên mật khẩu</CardTitle>
          <CardDescription>
            {sent ? "Kiểm tra email của bạn" : "Nhập email để nhận link đặt lại mật khẩu"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <Mail className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Đã gửi email đặt lại mật khẩu đến <span className="font-medium">{email}</span>
              </p>
              <Link to="/login">
                <Button variant="outline" className="w-full gap-2 mt-2">
                  <ArrowLeft className="h-4 w-4" /> Quay lại đăng nhập
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleResetRequest} className="space-y-4">
              {error && <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">{error}</div>}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="email@company.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                Gửi link đặt lại
              </Button>
              <Link to="/login" className="block">
                <Button variant="ghost" className="w-full gap-2">
                  <ArrowLeft className="h-4 w-4" /> Quay lại đăng nhập
                </Button>
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
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

      if (response.ok) {
        setSuccess(true);
      } else {
        setError("Có lỗi xảy ra");
      }
    } catch {
      setError("Không thể kết nối server");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-green-600">Đổi mật khẩu thành công!</h2>
            <p className="text-muted-foreground">Bạn có thể đăng nhập với mật khẩu mới.</p>
            <Link to="/login">
              <Button className="w-full">Đăng nhập</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <Lock className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-display">Đặt lại mật khẩu</CardTitle>
          <CardDescription>Nhập mật khẩu mới của bạn</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReset} className="space-y-4">
            {error && <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">{error}</div>}
            <div className="space-y-2">
              <Label htmlFor="newPassword">Mật khẩu mới</Label>
              <Input 
                id="newPassword" 
                type="password" 
                placeholder="••••••••" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                required 
                minLength={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
              <Input 
                id="confirmPassword" 
                type="password" 
                placeholder="••••••••" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                required 
                minLength={4}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
              Đổi mật khẩu
            </Button>
            <Link to="/login" className="block">
              <Button variant="ghost" className="w-full gap-2">
                <ArrowLeft className="h-4 w-4" /> Quay lại đăng nhập
              </Button>
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
