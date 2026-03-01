import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

const API_BASE_URL = "http://localhost:8080/api";

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
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">Đang kích hoạt tài khoản...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-red-600">Kích hoạt thất bại</h2>
            <p className="text-muted-foreground">Link kích hoạt không hợp lệ hoặc đã hết hạn.</p>
            <Link to="/register">
              <Button>Đăng ký mới</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-green-600">Kích hoạt thành công!</h2>
          <p className="text-muted-foreground">Tài khoản của bạn đã được kích hoạt. Bây giờ bạn có thể đăng nhập.</p>
          <Link to="/login">
            <Button className="w-full">Đăng nhập</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
