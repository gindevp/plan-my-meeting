import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, CalendarDays } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { API_BASE } from "@/lib/api";

const API_BASE_URL = `${API_BASE}/api`;

export default function ActivateAccountPage() {
  const [searchParams] = useSearchParams();
  const key = searchParams.get("key");
  
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!key) {
      setStatus("error");
      return;
    }

    fetch(`${API_BASE_URL}/activate?key=${key}`)
      .then((res) => {
        if (res.ok || res.redirected) {
          setStatus("success");
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }, [key]);

  if (status === "loading") {
    return (
      <AuthLayout title="Kích hoạt" subtitle="tài khoản" description="Đang xử lý yêu cầu của bạn...">
        <Card className="w-full max-w-md shadow-2xl shadow-primary/10 border-0 opacity-0 animate-auth-scale-in" style={{ animationDelay: "1.8s", animationFillMode: "forwards" }}>
          <CardContent className="pt-10 pb-10 text-center">
            <div className="flex justify-center mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 animate-auth-float">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            </div>
            <p className="text-muted-foreground">Đang kích hoạt tài khoản...</p>
            <p className="text-sm text-muted-foreground/80 mt-2">Vui lòng đợi trong giây lát</p>
          </CardContent>
        </Card>
      </AuthLayout>
    );
  }

  if (status === "error") {
    return (
      <AuthLayout title="Kích hoạt" subtitle="thất bại" description="Link không hợp lệ hoặc đã hết hạn.">
        <Card className="w-full max-w-md shadow-2xl shadow-primary/10 border-0 opacity-0 animate-auth-scale-in" style={{ animationDelay: "1.8s", animationFillMode: "forwards" }}>
          <CardContent className="pt-10 pb-10 text-center space-y-6">
            <div className="flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/30 animate-auth-success-pop">
                <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <h2 className="text-xl font-display font-bold text-red-600 dark:text-red-400 opacity-0 animate-auth-fade-in-up auth-stagger-1">Kích hoạt thất bại</h2>
            <p className="text-muted-foreground max-w-xs mx-auto opacity-0 animate-auth-fade-in-up auth-stagger-2">Link kích hoạt không hợp lệ hoặc đã hết hạn.</p>
            <Link to="/register" className="block opacity-0 animate-auth-fade-in-up auth-stagger-3">
              <Button className="w-full h-11 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">Đăng ký mới</Button>
            </Link>
          </CardContent>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Kích hoạt" subtitle="thành công!" description="Tài khoản của bạn đã sẵn sàng.">
      <Card className="w-full max-w-md shadow-2xl shadow-primary/10 border-0 opacity-0 animate-auth-scale-in" style={{ animationDelay: "1.8s", animationFillMode: "forwards" }}>
        <CardContent className="pt-10 pb-10 text-center space-y-6">
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/15 dark:bg-emerald-500/20 animate-auth-success-pop">
              <CheckCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
            </div>
          </div>
          <h2 className="text-xl font-display font-bold text-emerald-700 dark:text-emerald-400 opacity-0 animate-auth-fade-in-up auth-stagger-1">Kích hoạt thành công!</h2>
          <p className="text-muted-foreground max-w-xs mx-auto opacity-0 animate-auth-fade-in-up auth-stagger-2">Tài khoản của bạn đã được kích hoạt. Bây giờ bạn có thể đăng nhập.</p>
          <Link to="/login" className="block opacity-0 animate-auth-fade-in-up auth-stagger-3">
            <Button className="w-full h-11 gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
              <CalendarDays className="h-4 w-4" /> Đăng nhập
            </Button>
          </Link>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
