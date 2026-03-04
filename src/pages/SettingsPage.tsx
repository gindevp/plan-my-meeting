import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Bell, Shield, Palette, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/contexts/I18nContext";

type ThemeMode = "light" | "dark" | "system";

const SETTINGS_KEY = "app-ui-settings";

interface UiSettings {
  themeMode: ThemeMode;
  language: "vi" | "en";
}

const defaultUiSettings: UiSettings = {
  themeMode: "light",
  language: "vi",
};

const getSystemIsDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

const applyThemeMode = (mode: ThemeMode) => {
  const root = document.documentElement;
  const shouldUseDark = mode === "dark" || (mode === "system" && getSystemIsDark());
  root.classList.toggle("dark", shouldUseDark);
};

export default function SettingsPage() {
  const { toast } = useToast();
  const { t, setLanguage: setAppLanguage } = useI18n();
  const [themeMode, setThemeMode] = useState<ThemeMode>(defaultUiSettings.themeMode);
  const [language, setLanguage] = useState<UiSettings["language"]>(defaultUiSettings.language);

  useEffect(() => {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      applyThemeMode(defaultUiSettings.themeMode);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<UiSettings>;
      const nextTheme = parsed.themeMode ?? defaultUiSettings.themeMode;
      const nextLang = parsed.language ?? defaultUiSettings.language;

      setThemeMode(nextTheme);
      setLanguage(nextLang);
      setAppLanguage(nextLang);
      applyThemeMode(nextTheme);
    } catch {
      applyThemeMode(defaultUiSettings.themeMode);
    }
  }, [setAppLanguage]);

  useEffect(() => {
    applyThemeMode(themeMode);

    if (themeMode !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyThemeMode("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [themeMode]);

  const handleSaveAppearance = () => {
    const settings: UiSettings = { themeMode, language };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setAppLanguage(language);
    toast({ title: t("settings.saved"), description: t("settings.savedAppearance") });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">{t("settings.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("settings.subtitle")}</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general"><Globe className="h-4 w-4 mr-1.5" />{t("settings.tabs.general")}</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-1.5" />{t("settings.tabs.notifications")}</TabsTrigger>
          <TabsTrigger value="appearance"><Palette className="h-4 w-4 mr-1.5" />{t("settings.tabs.appearance")}</TabsTrigger>
          <TabsTrigger value="security"><Shield className="h-4 w-4 mr-1.5" />{t("settings.tabs.security")}</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin tổ chức</CardTitle>
              <CardDescription>Cấu hình thông tin cơ bản của tổ chức</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Tên tổ chức</Label><Input defaultValue="Công ty ABC" /></div>
                <div className="space-y-2"><Label>Email liên hệ</Label><Input defaultValue="admin@company.com" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Số điện thoại</Label><Input defaultValue="028-1234-5678" /></div>
                <div className="space-y-2"><Label>Địa chỉ</Label><Input defaultValue="123 Nguyễn Huệ, Q.1, TP.HCM" /></div>
              </div>
              <Button><Save className="h-4 w-4 mr-2" />Lưu thay đổi</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cài đặt cuộc họp</CardTitle>
              <CardDescription>Tùy chỉnh các thông số mặc định cho cuộc họp</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Thời lượng mặc định (phút)</Label><Input type="number" defaultValue="60" /></div>
                <div className="space-y-2"><Label>Thời gian nhắc trước (phút)</Label><Input type="number" defaultValue="15" /></div>
              </div>
              <div className="flex items-center justify-between">
                <div><Label>Yêu cầu phê duyệt cuộc họp</Label><p className="text-sm text-muted-foreground">Cuộc họp cần được duyệt trước khi diễn ra</p></div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div><Label>Cho phép đặt phòng trùng giờ</Label><p className="text-sm text-muted-foreground">Nhiều cuộc họp cùng phòng cùng lúc</p></div>
                <Switch />
              </div>
              <Button><Save className="h-4 w-4 mr-2" />Lưu thay đổi</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cài đặt thông báo</CardTitle>
              <CardDescription>Quản lý cách nhận thông báo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {[
                { label: "Thông báo email", desc: "Gửi email khi có cuộc họp mới hoặc thay đổi", on: true },
                { label: "Nhắc lịch họp", desc: "Nhắc nhở trước khi cuộc họp bắt đầu", on: true },
                { label: "Thông báo phê duyệt", desc: "Thông báo khi cuộc họp được duyệt/từ chối", on: true },
                { label: "Thông báo nhiệm vụ", desc: "Nhắc nhở deadline nhiệm vụ", on: false },
                { label: "Báo cáo tuần", desc: "Gửi báo cáo tổng hợp cuối tuần", on: false },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <div><Label>{item.label}</Label><p className="text-sm text-muted-foreground">{item.desc}</p></div>
                  <Switch defaultChecked={item.on} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Giao diện</CardTitle>
              <CardDescription>Tùy chỉnh giao diện hiển thị</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Chế độ hiển thị</Label>
                <Select value={themeMode} onValueChange={(value) => setThemeMode(value as ThemeMode)}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Sáng</SelectItem>
                    <SelectItem value="dark">Tối</SelectItem>
                    <SelectItem value="system">Theo hệ thống</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ngôn ngữ</Label>
                <Select value={language} onValueChange={(value) => setLanguage(value as UiSettings["language"])}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vi">Tiếng Việt</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSaveAppearance}><Save className="h-4 w-4 mr-2" />Lưu thay đổi</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bảo mật</CardTitle>
              <CardDescription>Cài đặt bảo mật tài khoản</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>Mật khẩu hiện tại</Label><Input type="password" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Mật khẩu mới</Label><Input type="password" /></div>
                <div className="space-y-2"><Label>Xác nhận mật khẩu</Label><Input type="password" /></div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div><Label>Xác thực 2 bước (2FA)</Label><p className="text-sm text-muted-foreground">Tăng cường bảo mật bằng mã OTP</p></div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div><Label>Tự động đăng xuất</Label><p className="text-sm text-muted-foreground">Đăng xuất sau 30 phút không hoạt động</p></div>
                <Switch defaultChecked />
              </div>
              <Button><Save className="h-4 w-4 mr-2" />Lưu thay đổi</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
