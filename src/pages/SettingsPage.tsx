import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Bell, Shield, Palette, Globe, Loader2, User, ImagePlus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAvatarVersion } from "@/contexts/AvatarVersionContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentUserSettings, saveUserSetting, getSystemSettings, saveSystemSetting, type SettingDTO } from "@/services/api/settings";
import { changePassword, uploadAccountAvatarFromBlob, deleteAccountAvatar } from "@/lib/api";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { AvatarCropModal } from "@/components/ui/AvatarCropModal";
import { useAvatarBlobUrl } from "@/hooks/useAvatarBlobUrl";
import { useDepartments } from "@/hooks/useDepartments";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type ThemeMode = "light" | "dark" | "system";

const SETTINGS_KEY = "app-ui-settings";
const ORG_SETTINGS_KEY = "app-org-settings";
const NOTIFICATION_SETTINGS_KEY = "app-notification-settings";
const MEETING_DEFAULTS_KEY = "app-meeting-defaults";
const API_KEY_ORG = "settings.org";
const API_KEY_NOTIF = "settings.notifications";
const API_KEY_MEETING_DEFAULTS = "settings.meetingDefaults";
const API_KEY_UI = "settings.ui";
const API_KEY_SECURITY = "settings.security";
const SECURITY_SETTINGS_KEY = "app-security-settings";

interface SecuritySettings {
  autoLogout: boolean;
}

interface UiSettings {
  themeMode: ThemeMode;
  language: "vi" | "en";
}

interface OrgSettings {
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface NotificationSettings {
  emailMeetings: boolean;
  reminderMeetings: boolean;
  approvalNotif: boolean;
  taskDeadlineReminder: boolean;
  weeklyReport: boolean; // chỉ admin
}

interface MeetingDefaults {
  defaultDurationMinutes: number;
  reminderBeforeMinutes: number;
}

const defaultUiSettings: UiSettings = {
  themeMode: "light",
  language: "vi",
};

const defaultOrgSettings: OrgSettings = {
  name: "Công ty ABC",
  email: "admin@company.com",
  phone: "028-1234-5678",
  address: "123 Nguyễn Huệ, Q.1, TP.HCM",
};

const defaultNotificationSettings: NotificationSettings = {
  emailMeetings: true,
  reminderMeetings: true,
  approvalNotif: true,
  taskDeadlineReminder: false,
  weeklyReport: false,
};

const defaultMeetingDefaults: MeetingDefaults = {
  defaultDurationMinutes: 60,
  reminderBeforeMinutes: 15,
};

const defaultSecuritySettings: SecuritySettings = {
  autoLogout: true,
};

const roleLabels: Record<string, string> = {
  ROLE_ADMIN: "Quản trị viên",
  ROLE_SECRETARY: "Thư ký",
  ROLE_ROOM_MANAGER: "QL Phòng họp",
  ROLE_USER: "Nhân viên",
};

function getRoleLabel(authorities?: string[]): string {
  if (!authorities?.length) return "Nhân viên";
  if (authorities.includes("ROLE_ADMIN")) return "Quản trị viên";
  if (authorities.includes("ROLE_SECRETARY")) return "Thư ký";
  if (authorities.includes("ROLE_ROOM_MANAGER")) return "QL Phòng họp";
  return "Nhân viên";
}

const getSystemIsDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

const applyThemeMode = (mode: ThemeMode) => {
  const root = document.documentElement;
  const shouldUseDark = mode === "dark" || (mode === "system" && getSystemIsDark());
  root.classList.toggle("dark", shouldUseDark);
};

const loadJson = <T,>(key: string, defaults: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) } as T;
  } catch {
    return defaults;
  }
};

const saveJson = (key: string, data: object) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export default function SettingsPage() {
  const { toast } = useToast();
  const { t, setLanguage: setAppLanguage } = useI18n();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { avatarVersion, incAvatarVersion } = useAvatarVersion();
  const queryClient = useQueryClient();
  const isAdmin = user?.authorities?.includes("ROLE_ADMIN") ?? false;
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false);

  const { blobUrl: avatarBlobUrl, loading: loadingAvatarPreview } = useAvatarBlobUrl(null, avatarVersion);

  const [themeMode, setThemeMode] = useState<ThemeMode>(defaultUiSettings.themeMode);
  const [language, setLanguage] = useState<UiSettings["language"]>(defaultUiSettings.language);
  const [org, setOrg] = useState<OrgSettings>(defaultOrgSettings);
  const [notif, setNotif] = useState<NotificationSettings>(defaultNotificationSettings);
  const [meetingDefaults, setMeetingDefaults] = useState<MeetingDefaults>(defaultMeetingDefaults);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [autoLogout, setAutoLogout] = useState(true);
  const [savingSecurity, setSavingSecurity] = useState(false);

  const { data: serverSettings = [], isLoading: loadingSettings } = useQuery({
    queryKey: ["user-settings"],
    queryFn: getCurrentUserSettings,
  });

  const { data: departments = [] } = useDepartments();
  const departmentName =
    user?.departmentId != null
      ? (departments as { id: string | number; name: string }[]).find((d) => Number(d.id) === Number(user.departmentId))?.name ?? ""
      : user?.department ?? "";

  const { data: systemSettings = [] } = useQuery({
    queryKey: ["system-settings"],
    queryFn: getSystemSettings,
    enabled: isAdmin,
  });

  const saveSettingMutation = useMutation({
    mutationFn: (payload: { key: string; value: string }) => saveUserSetting(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-settings"] });
      toast({ title: t("settings.saved"), description: "Đã lưu lên server." });
    },
    onError: (err: Error) => toast({ variant: "destructive", title: "Lỗi", description: err.message }),
  });

  // Đồng bộ từ server vào state (lần đầu load)
  useEffect(() => {
    if (serverSettings.length === 0) return;
    const byKey: Record<string, string> = {};
    serverSettings.forEach((s: SettingDTO) => {
      if (s.key && s.value != null) byKey[s.key] = s.value;
    });
    if (byKey[API_KEY_ORG]) {
      try {
        const parsed = JSON.parse(byKey[API_KEY_ORG]) as Partial<OrgSettings>;
        setOrg((prev) => ({ ...defaultOrgSettings, ...prev, ...parsed }));
      } catch {}
    }
    if (byKey[API_KEY_NOTIF]) {
      try {
        const parsed = JSON.parse(byKey[API_KEY_NOTIF]) as Partial<NotificationSettings>;
        setNotif((prev) => ({ ...defaultNotificationSettings, ...prev, ...parsed }));
      } catch {}
    }
    if (byKey[API_KEY_MEETING_DEFAULTS]) {
      try {
        const parsed = JSON.parse(byKey[API_KEY_MEETING_DEFAULTS]) as Partial<MeetingDefaults>;
        setMeetingDefaults((prev) => ({ ...defaultMeetingDefaults, ...prev, ...parsed }));
      } catch {}
    }
    if (byKey[API_KEY_UI]) {
      try {
        const parsed = JSON.parse(byKey[API_KEY_UI]) as Partial<UiSettings>;
        if (parsed.themeMode) setThemeMode(parsed.themeMode);
        if (parsed.language) {
          setLanguage(parsed.language);
          setAppLanguage(parsed.language);
        }
      } catch {}
    }
    if (byKey[API_KEY_SECURITY]) {
      try {
        const parsed = JSON.parse(byKey[API_KEY_SECURITY]) as Partial<SecuritySettings>;
        if (parsed.autoLogout !== undefined) {
          setAutoLogout(parsed.autoLogout);
          saveJson(SECURITY_SETTINGS_KEY, { ...defaultSecuritySettings, ...parsed });
        }
      } catch {}
    }
  }, [serverSettings, setAppLanguage]);

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
    setOrg(loadJson(ORG_SETTINGS_KEY, defaultOrgSettings));
    setNotif(loadJson(NOTIFICATION_SETTINGS_KEY, defaultNotificationSettings));
    setMeetingDefaults(loadJson(MEETING_DEFAULTS_KEY, defaultMeetingDefaults));
    const sec = loadJson<SecuritySettings>(SECURITY_SETTINGS_KEY, defaultSecuritySettings);
    setAutoLogout(sec.autoLogout);
  }, []);

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
    saveJson(SETTINGS_KEY, settings);
    setAppLanguage(language);
    saveSettingMutation.mutate({ key: API_KEY_UI, value: JSON.stringify(settings) });
    toast({ title: t("settings.saved"), description: t("settings.savedAppearance") });
  };

  const handleSaveOrg = () => {
    saveJson(ORG_SETTINGS_KEY, org);
    saveSettingMutation.mutate({ key: API_KEY_ORG, value: JSON.stringify(org) });
    toast({ title: t("settings.saved"), description: "Đã lưu thông tin tổ chức." });
  };

  const handleSaveNotifications = () => {
    saveJson(NOTIFICATION_SETTINGS_KEY, notif);
    saveSettingMutation.mutate({ key: API_KEY_NOTIF, value: JSON.stringify(notif) });
    toast({ title: t("settings.saved"), description: "Đã lưu cài đặt thông báo. Thông báo được gửi qua email." });
  };

  const handleSaveMeetingDefaults = () => {
    saveJson(MEETING_DEFAULTS_KEY, meetingDefaults);
    saveSettingMutation.mutate({ key: API_KEY_MEETING_DEFAULTS, value: JSON.stringify(meetingDefaults) });
    toast({ title: t("settings.saved"), description: "Đã lưu cài đặt mặc định cuộc họp." });
  };

  const handleSaveSecurity = async () => {
    const securityData: SecuritySettings = { autoLogout };
    saveJson(SECURITY_SETTINGS_KEY, securityData);
    saveSettingMutation.mutate({ key: API_KEY_SECURITY, value: JSON.stringify(securityData) });

    if (currentPassword || newPassword || confirmPassword) {
      if (!currentPassword.trim()) {
        toast({ variant: "destructive", title: "Lỗi", description: "Vui lòng nhập mật khẩu hiện tại." });
        return;
      }
      if (!newPassword.trim()) {
        toast({ variant: "destructive", title: "Lỗi", description: "Vui lòng nhập mật khẩu mới." });
        return;
      }
      if (newPassword.length < 4) {
        toast({ variant: "destructive", title: "Lỗi", description: "Mật khẩu mới tối thiểu 4 ký tự." });
        return;
      }
      if (newPassword !== confirmPassword) {
        toast({ variant: "destructive", title: "Lỗi", description: "Mật khẩu xác nhận không khớp." });
        return;
      }
      setSavingSecurity(true);
      try {
        await changePassword(currentPassword, newPassword);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        toast({ title: t("settings.saved"), description: "Đã đổi mật khẩu và lưu cài đặt bảo mật." });
      } catch (err) {
        toast({ variant: "destructive", title: "Lỗi", description: err instanceof Error ? err.message : "Không thể đổi mật khẩu." });
      } finally {
        setSavingSecurity(false);
      }
    } else {
      toast({ title: t("settings.saved"), description: "Đã lưu cài đặt bảo mật." });
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: "Lỗi", description: "Vui lòng chọn file ảnh." });
      return;
    }
    setCropFile(file);
    setCropModalOpen(true);
  };

  const handleCropSave = async (blob: Blob) => {
    setAvatarUploading(true);
    try {
      await uploadAccountAvatarFromBlob(blob);
      incAvatarVersion();
      toast({ title: "Đã cập nhật", description: "Ảnh đại diện đã được thay đổi." });
      setCropModalOpen(false);
      setCropFile(null);
    } catch (err) {
      toast({ variant: "destructive", title: "Lỗi", description: err instanceof Error ? err.message : "Không thể tải ảnh lên." });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarUploading(true);
    try {
      await deleteAccountAvatar();
      incAvatarVersion();
      toast({ title: "Đã xóa", description: "Ảnh đại diện đã được xóa." });
    } catch (err) {
      toast({ variant: "destructive", title: "Lỗi", description: err instanceof Error ? err.message : "Không thể xóa ảnh." });
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <div className="page-content">
      <div className="opacity-0 animate-auth-fade-in-up">
        <h1 className="text-2xl font-display font-bold text-foreground">{t("settings.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("settings.subtitle")}</p>
      </div>

      <Card className="card-elevated mb-6 opacity-0 animate-auth-fade-in-up auth-stagger-1">
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Thông tin cá nhân
          </CardTitle>
          <CardDescription>Thông tin tài khoản của bạn. Nhấn vào ảnh đại diện để đổi hoặc xóa ảnh.</CardDescription>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              navigate("/login", { replace: true });
            }}
            className="absolute top-4 right-4 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            Đăng xuất
          </button>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-6">
          <input
            ref={avatarFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarFileChange}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="relative rounded-full ring-2 ring-border ring-offset-2 ring-offset-background hover:ring-primary transition-all focus:outline-none focus:ring-2 focus:ring-primary group/avatar disabled:opacity-70"
                disabled={avatarUploading}
              >
                <UserAvatar size={80} />
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 opacity-0 group-hover/avatar:opacity-100 transition-opacity pointer-events-none">
                  <ImagePlus className="h-8 w-8 text-white/80" aria-hidden />
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setAvatarPreviewOpen(true)} disabled={avatarUploading}>
                <User className="h-4 w-4 mr-2" />
                Xem ảnh
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => avatarFileInputRef.current?.click()}
                disabled={avatarUploading}
              >
                <ImagePlus className="h-4 w-4 mr-2" />
                Đổi ảnh
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleRemoveAvatar} disabled={avatarUploading} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Xóa ảnh
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="space-y-1">
            <p className="font-medium text-foreground">
              {user?.firstName || user?.lastName ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : user?.login ?? "—"}
            </p>
            {user?.email && <p className="text-sm text-muted-foreground">{user.email}</p>}
            <p className="text-xs text-muted-foreground">Đăng nhập: {user?.login ?? "—"}</p>
            {departmentName && <p className="text-sm text-muted-foreground">Phòng ban: {departmentName}</p>}
            {user?.position != null && user.position !== "" && <p className="text-sm text-muted-foreground">Chức vụ: {user.position}</p>}
            <p className="text-sm text-muted-foreground">Vai trò: {getRoleLabel(user?.authorities)}</p>
          </div>
        </CardContent>
      </Card>

      <AvatarCropModal
        open={cropModalOpen}
        file={cropFile}
        onClose={() => { setCropModalOpen(false); setCropFile(null); }}
        onSave={handleCropSave}
      />

      <Dialog open={avatarPreviewOpen} onOpenChange={setAvatarPreviewOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Ảnh đại diện</DialogTitle>
            <DialogDescription>
              {user?.firstName || user?.lastName ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : user?.login ?? "Tài khoản"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center">
            {avatarBlobUrl ? (
              <img
                src={avatarBlobUrl}
                alt="Avatar"
                className="max-h-[70vh] w-auto max-w-full rounded-xl border object-contain"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border p-10 text-center">
                <UserAvatar size={96} />
                <p className="text-sm text-muted-foreground">
                  {loadingAvatarPreview ? "Đang tải ảnh..." : "Bạn chưa có ảnh đại diện."}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="general" className="space-y-6 opacity-0 animate-auth-fade-in-up auth-stagger-1">
        <TabsList>
          <TabsTrigger value="general"><Globe className="h-4 w-4 mr-1.5" />{t("settings.tabs.general")}</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-1.5" />{t("settings.tabs.notifications")}</TabsTrigger>
          <TabsTrigger value="appearance"><Palette className="h-4 w-4 mr-1.5" />{t("settings.tabs.appearance")}</TabsTrigger>
          <TabsTrigger value="security"><Shield className="h-4 w-4 mr-1.5" />{t("settings.tabs.security")}</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Thông tin tổ chức</CardTitle>
              <CardDescription>Cấu hình thông tin cơ bản của tổ chức</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Tên tổ chức</Label><Input value={org.name} onChange={e => setOrg(o => ({ ...o, name: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Email liên hệ</Label><Input value={org.email} onChange={e => setOrg(o => ({ ...o, email: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Số điện thoại</Label><Input value={org.phone} onChange={e => setOrg(o => ({ ...o, phone: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Địa chỉ</Label><Input value={org.address} onChange={e => setOrg(o => ({ ...o, address: e.target.value }))} /></div>
              </div>
              {isAdmin && (
                <Button onClick={handleSaveOrg}><Save className="h-4 w-4 mr-2" />Lưu thay đổi</Button>
              )}
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Cài đặt cuộc họp</CardTitle>
              <CardDescription>Tùy chỉnh các thông số mặc định cho cuộc họp</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Thời lượng mặc định (phút)</Label>
                  <Input
                    type="number"
                    value={meetingDefaults.defaultDurationMinutes}
                    onChange={e => setMeetingDefaults(d => ({ ...d, defaultDurationMinutes: parseInt(e.target.value, 10) || 60 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Thời gian nhắc trước (phút)</Label>
                  <Input
                    type="number"
                    value={meetingDefaults.reminderBeforeMinutes}
                    onChange={e => setMeetingDefaults(d => ({ ...d, reminderBeforeMinutes: parseInt(e.target.value, 10) || 15 }))}
                  />
                </div>
              </div>
              {isAdmin && (
                <Button onClick={handleSaveMeetingDefaults}><Save className="h-4 w-4 mr-2" />Lưu thay đổi</Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Cài đặt thông báo</CardTitle>
              <CardDescription>Quản lý cách nhận thông báo. Tất cả thông báo được gửi qua email.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <div><Label>Thông báo email</Label><p className="text-sm text-muted-foreground">Gửi email khi có cuộc họp mới hoặc thay đổi</p></div>
                <Switch checked={notif.emailMeetings} onCheckedChange={v => setNotif(n => ({ ...n, emailMeetings: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <div><Label>Nhắc lịch họp</Label><p className="text-sm text-muted-foreground">Nhắc nhở trước khi cuộc họp bắt đầu</p></div>
                <Switch checked={notif.reminderMeetings} onCheckedChange={v => setNotif(n => ({ ...n, reminderMeetings: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <div><Label>Thông báo phê duyệt</Label><p className="text-sm text-muted-foreground">Thông báo khi cuộc họp được duyệt/từ chối</p></div>
                <Switch checked={notif.approvalNotif} onCheckedChange={v => setNotif(n => ({ ...n, approvalNotif: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <div><Label>Thông báo nhiệm vụ</Label><p className="text-sm text-muted-foreground">Nhắc nhở deadline nhiệm vụ</p></div>
                <Switch checked={notif.taskDeadlineReminder} onCheckedChange={v => setNotif(n => ({ ...n, taskDeadlineReminder: v }))} />
              </div>
              {isAdmin && (
                <div className="flex items-center justify-between">
                  <div><Label>Báo cáo tổng hợp cuối tuần</Label><p className="text-sm text-muted-foreground">Gửi báo cáo tổng hợp cuối tuần qua email (chỉ Admin)</p></div>
                  <Switch checked={notif.weeklyReport} onCheckedChange={v => setNotif(n => ({ ...n, weeklyReport: v }))} />
                </div>
              )}
              <Button onClick={handleSaveNotifications}><Save className="h-4 w-4 mr-2" />Lưu thay đổi</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Giao diện</CardTitle>
              <CardDescription>Tùy chỉnh giao diện hiển thị</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Chế độ hiển thị</Label>
                <SearchableSelect
                  options={[
                    { value: "light", label: "Sáng" },
                    { value: "dark", label: "Tối" },
                    { value: "system", label: "Theo hệ thống" },
                  ]}
                  value={themeMode}
                  onValueChange={(value) => setThemeMode(value as ThemeMode)}
                  placeholder="Chế độ"
                  searchPlaceholder="Tìm chế độ..."
                  emptyText="Không tìm thấy."
                  triggerClassName="w-48"
                />
              </div>
              <div className="space-y-2">
                <Label>Ngôn ngữ</Label>
                <SearchableSelect
                  options={[
                    { value: "vi", label: "Tiếng Việt" },
                    { value: "en", label: "English" },
                  ]}
                  value={language}
                  onValueChange={(value) => setLanguage(value as UiSettings["language"])}
                  placeholder="Ngôn ngữ"
                  searchPlaceholder="Tìm ngôn ngữ..."
                  emptyText="Không tìm thấy."
                  triggerClassName="w-48"
                />
              </div>
              <Button onClick={handleSaveAppearance}><Save className="h-4 w-4 mr-2" />Lưu thay đổi</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Bảo mật</CardTitle>
              <CardDescription>Cài đặt bảo mật tài khoản</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Mật khẩu hiện tại</Label>
                <PasswordInput placeholder="••••••••" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mật khẩu mới</Label>
                  <PasswordInput placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Xác nhận mật khẩu</Label>
                  <PasswordInput
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className={confirmPassword && newPassword !== confirmPassword ? "border-destructive" : ""}
                    error={!!confirmPassword && newPassword !== confirmPassword}
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-destructive">Mật khẩu xác nhận không khớp</p>
                  )}
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div><Label>Tự động đăng xuất</Label><p className="text-sm text-muted-foreground">Đăng xuất sau 10 phút không hoạt động</p></div>
                <Switch checked={autoLogout} onCheckedChange={setAutoLogout} />
              </div>
              <Button onClick={handleSaveSecurity} disabled={savingSecurity || (!!confirmPassword && newPassword !== confirmPassword)}>
                {savingSecurity ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Lưu thay đổi
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
