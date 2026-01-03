import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Globe, Check } from "lucide-react";
import { useSettingsStore } from "@/store/settings";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { language, setLanguage } = useSettingsStore();

  const languages = [
    { code: "zh", name: "简体中文" },
    { code: "zh-HK", name: "繁體中文" },
    { code: "en", name: "English" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 px-4 py-3 flex items-center gap-3 border-b shadow-sm">
        <button 
          onClick={() => navigate(-1)} 
          className="p-1 rounded-full hover:bg-gray-100"
        >
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">{t("settings.title")}</h1>
      </div>

      <div className="flex-1 p-4 space-y-6">
        {/* Language Section */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              {t("settings.language")}
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors"
              >
                <span className={`text-sm ${language === lang.code ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                  {lang.name}
                </span>
                {language === lang.code && (
                  <Check className="w-5 h-5 text-indigo-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
