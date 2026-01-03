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
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = path === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-primary",
                isActive && "text-primary"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "fill-current")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
