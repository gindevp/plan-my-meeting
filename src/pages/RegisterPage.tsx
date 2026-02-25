import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerApi } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, UserPlus, Loader2 } from "lucide-react";
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <CalendarDays className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-display">Tạo tài khoản</CardTitle>
          <CardDescription>Đăng ký để sử dụng MeetFlow</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login">Tên đăng nhập</Label>
              <Input id="login" type="text" placeholder="username" value={login} onChange={(e) => setLogin(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="email@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Họ</Label>
                <Input id="firstName" type="text" placeholder="Nguyễn" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Tên</Label>
                <Input id="lastName" type="text" placeholder="Văn An" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input id="password" type="password" placeholder="Tối thiểu 4 ký tự" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={4} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Xác nhận mật khẩu</Label>
              <Input id="confirm" type="password" placeholder="Nhập lại mật khẩu" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
              Đăng ký
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Đã có tài khoản?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">Đăng nhập</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
