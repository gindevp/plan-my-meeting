import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Language = "vi" | "en";

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const I18N_KEY = "app-ui-settings";

const dictionaries: Record<Language, Record<string, string>> = {
  vi: {
    "settings.title": "Cài đặt",
    "settings.subtitle": "Quản lý cài đặt hệ thống",
    "settings.tabs.general": "Chung",
    "settings.tabs.notifications": "Thông báo",
    "settings.tabs.appearance": "Giao diện",
    "settings.tabs.security": "Bảo mật",
    "settings.saved": "Đã lưu",
    "settings.savedAppearance": "Cài đặt giao diện đã được cập nhật.",
    "sidebar.main": "Chính",
    "sidebar.management": "Quản lý",
    "sidebar.dashboard": "Tổng quan",
    "sidebar.calendar": "Lịch",
    "sidebar.plans": "Kế hoạch họp",
    "sidebar.invitations": "Lời mời",
    "sidebar.notifications": "Thông báo",
    "sidebar.schedule": "Thêm cuộc họp",
    "sidebar.rooms": "Phòng họp",
    "sidebar.staff": "Nhân viên",
    "sidebar.departments": "Phòng ban",
    "sidebar.equipment": "Thiết bị",
    "sidebar.incidents": "Quản lý sự cố",
    "sidebar.reports": "Báo cáo",
    "sidebar.settings": "Cài đặt",
    "sidebar.logout": "Đăng xuất"
  },
  en: {
    "settings.title": "Settings",
    "settings.subtitle": "Manage system settings",
    "settings.tabs.general": "General",
    "settings.tabs.notifications": "Notifications",
    "settings.tabs.appearance": "Appearance",
    "settings.tabs.security": "Security",
    "settings.saved": "Saved",
    "settings.savedAppearance": "Appearance settings have been updated.",
    "sidebar.main": "Main",
    "sidebar.management": "Management",
    "sidebar.dashboard": "Dashboard",
    "sidebar.calendar": "Calendar",
    "sidebar.plans": "Meeting Plans",
    "sidebar.invitations": "Invitations",
    "sidebar.notifications": "Notifications",
    "sidebar.schedule": "New Meeting",
    "sidebar.rooms": "Meeting Rooms",
    "sidebar.staff": "Staff",
    "sidebar.departments": "Departments",
    "sidebar.equipment": "Equipment",
    "sidebar.incidents": "Incidents",
    "sidebar.reports": "Reports",
    "sidebar.settings": "Settings",
    "sidebar.logout": "Sign out"
  }
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState<Language>("vi");

  useEffect(() => {
    const raw = localStorage.getItem(I18N_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { language?: Language };
      if (parsed.language === "vi" || parsed.language === "en") {
        setLanguage(parsed.language);
      }
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const t = (key: string) => dictionaries[language][key] || key;
    return { language, setLanguage, t };
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
};
