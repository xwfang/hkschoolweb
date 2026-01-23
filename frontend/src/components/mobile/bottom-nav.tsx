import { Link, useLocation } from "react-router-dom";
import { Compass, MessageSquare, BookOpen, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function BottomNav() {
  const location = useLocation();
  const path = location.pathname;
  const { t } = useTranslation();

  const navItems = [
    { label: t("nav.home"), icon: Compass, path: "/app" },
    { label: t("nav.chat"), icon: MessageSquare, path: "/app/chat" },
    { label: t("nav.tracking"), icon: BookOpen, path: "/app/tracking" },
    { label: t("nav.profile"), icon: User, path: "/app/profile" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm shadow-lg">
      <div className="flex h-16 items-center justify-around px-2 safe-area-pb">
        {navItems.map((item) => {
          const isActive = path === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-all duration-200 relative",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-primary active:scale-95"
              )}
            >
              <div className={cn(
                "absolute inset-0 rounded-lg transition-all duration-200",
                isActive && "bg-primary/10"
              )} />
              <item.icon className={cn(
                "h-5 w-5 relative z-10 transition-transform duration-200",
                isActive && "fill-current scale-110"
              )} />
              <span className={cn(
                "relative z-10 transition-all duration-200",
                isActive && "font-semibold"
              )}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
