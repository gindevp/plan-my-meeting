import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerApi } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, UserPlus, Loader2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
            Bắt đầu với
            <br />
            <span className="text-white/90">MeetFlow ngay hôm nay</span>
          </h2>
          <p className="mt-4 text-white/80 text-lg max-w-sm">
            Tạo tài khoản miễn phí để lên lịch và quản lý cuộc họp hiệu quả.
          </p>
        </div>
        <p className="text-white/60 text-sm">© MeetFlow — Hệ thống quản lý cuộc họp</p>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-gradient-to-br from-slate-50 via-background to-primary/5 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <CalendarDays className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-display font-bold">MeetFlow</span>
          </div>

          <Card className="border-0 shadow-2xl shadow-primary/10 overflow-hidden">
            <CardHeader className="space-y-2 pb-6">
              <CardTitle className="text-2xl font-display font-bold tracking-tight">Tạo tài khoản</CardTitle>
              <CardDescription>Đăng ký để sử dụng MeetFlow</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login">Tên đăng nhập</Label>
                  <Input id="login" type="text" placeholder="username" value={login} onChange={(e) => setLogin(e.target.value)} className="h-11" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="email@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Họ</Label>
                    <Input id="firstName" type="text" placeholder="Nguyễn" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Tên</Label>
                    <Input id="lastName" type="text" placeholder="Văn An" value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-11" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mật khẩu</Label>
                  <Input id="password" type="password" placeholder="Tối thiểu 4 ký tự" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" required minLength={4} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Xác nhận mật khẩu</Label>
                  <Input id="confirm" type="password" placeholder="Nhập lại mật khẩu" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-11" required />
                </div>
                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                  Đăng ký
                </Button>
              </form>
              <p className="text-center text-sm text-muted-foreground mt-5 pt-4 border-t">
                Đã có tài khoản?{" "}
                <Link to="/login" className="text-primary font-semibold hover:underline inline-flex items-center gap-1">
                  Đăng nhập <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
