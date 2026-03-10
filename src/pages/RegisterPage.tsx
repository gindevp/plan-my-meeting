import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerApi } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AuthLayout } from "@/components/auth/AuthLayout";

export default function RegisterPage() {
  const [login, setLogin] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ variant: "destructive", title: "Lỗi", description: "Mật khẩu xác nhận không khớp" });
      return;
    }
    if (password.length < 4) {
      toast({ variant: "destructive", title: "Lỗi", description: "Mật khẩu phải có ít nhất 4 ký tự" });
      return;
    }
    setLoading(true);
    try {
      await registerApi({ login: login || email, email, password, firstName: firstName || undefined, lastName: lastName || undefined });
      toast({
        title: "Đăng ký thành công",
        description: "Vui lòng kiểm tra email để kích hoạt tài khoản.",
      });
      navigate("/login");
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Đăng ký thất bại",
        description: err instanceof Error ? err.message : "Lỗi không xác định",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Bắt đầu với"
      subtitle="MeetViet ngay hôm nay"
      description="Tạo tài khoản miễn phí để lên lịch và quản lý cuộc họp hiệu quả với MeetViet."
    >
      <Card className="border-0 shadow-2xl shadow-primary/10 overflow-hidden opacity-0 animate-auth-scale-in py-8 origin-top" style={{ animationDelay: "1.8s", animationFillMode: "forwards" }}>
            <CardHeader className="space-y-2 pb-6">
              <CardTitle className="text-2xl font-display font-bold tracking-tight">Tạo tài khoản</CardTitle>
              <CardDescription>Đăng ký để sử dụng MeetViet</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2 opacity-0 animate-auth-fade-in-up auth-stagger-1">
                  <Label htmlFor="login">Tên đăng nhập</Label>
                  <Input id="login" type="text" placeholder="username" value={login} onChange={(e) => setLogin(e.target.value)} className="h-11 transition-all duration-200 focus:scale-[1.01]" required />
                </div>
                <div className="space-y-2 opacity-0 animate-auth-fade-in-up auth-stagger-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="email@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 transition-all duration-200 focus:scale-[1.01]" required />
                </div>
                <div className="grid grid-cols-2 gap-4 opacity-0 animate-auth-fade-in-up auth-stagger-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Họ</Label>
                    <Input id="firstName" type="text" placeholder="Nguyễn" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-11 transition-all duration-200 focus:scale-[1.01]" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Tên</Label>
                    <Input id="lastName" type="text" placeholder="Văn An" value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-11 transition-all duration-200 focus:scale-[1.01]" />
                  </div>
                </div>
                <div className="space-y-2 opacity-0 animate-auth-fade-in-up auth-stagger-4">
                  <Label htmlFor="password">Mật khẩu</Label>
                  <PasswordInput
                    id="password"
                    placeholder="Tối thiểu 4 ký tự"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 transition-all duration-200 focus:scale-[1.01]"
                    required
                    minLength={4}
                  />
                </div>
                <div className="space-y-2 opacity-0 animate-auth-fade-in-up auth-stagger-5">
                  <Label htmlFor="confirm">Xác nhận mật khẩu</Label>
                  <PasswordInput
                    id="confirm"
                    placeholder="Nhập lại mật khẩu"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-11 transition-all duration-200 focus:scale-[1.01]"
                    required
                  />
                </div>
                <div className="opacity-0 animate-auth-fade-in-up auth-stagger-6">
                  <Button type="submit" className="w-full h-11 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                    Đăng ký
                  </Button>
                </div>
              </form>
              <p className="text-center text-sm text-muted-foreground mt-5 pt-4 border-t opacity-0 animate-auth-fade-in-up auth-stagger-6">
                Đã có tài khoản?{" "}
                <Link to="/login" className="text-primary font-semibold hover:underline inline-flex items-center gap-1 transition-opacity hover:opacity-80">
                  Đăng nhập <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </p>
            </CardContent>
          </Card>
    </AuthLayout>
  );
}
