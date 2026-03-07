import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, FileQuestion } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
            <FileQuestion className="h-10 w-10 text-muted-foreground" />
          </div>
        </div>
        <h1 className="text-6xl font-display font-bold tracking-tight text-primary mb-2">404</h1>
        <p className="text-lg text-muted-foreground mb-6">Trang không tồn tại hoặc đã bị di chuyển.</p>
        <Link to="/">
          <Button className="gap-2">
            <Home className="h-4 w-4" /> Về trang chủ
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
