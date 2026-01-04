import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { User, Settings, LogOut, Plus } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useQuery } from "@tanstack/react-query";
import { childrenApi } from "@/api/children";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMetadata } from "@/hooks/use-metadata";

export default function ProfilePage() {
  const { user, logout, setCurrentChildId } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { getGenderLabel } = useMetadata();

  const { data: children, isLoading } = useQuery({
    queryKey: ["children"],
    queryFn: childrenApi.list,
  });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm border">
        <div className="h-16 w-16 bg-gray-200 rounded-full flex items-center justify-center">
          <User className="h-8 w-8 text-gray-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold">{t('profile.user_title')}</h2>
          <p className="text-sm text-gray-500">{user?.identifier}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-md font-semibold">{t('profile.children')}</h3>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate("/app/profile/add-child")}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center text-sm text-gray-500 py-4">{t('common.loading')}</div>
        ) : children?.length === 0 ? (
          <div className="text-center text-sm text-gray-500 py-4 border rounded-lg border-dashed">
            {t('profile.add_child')}
          </div>
        ) : (
          children?.map((child) => (
            <Card key={child.id} onClick={() => setCurrentChildId(child.id)} className="cursor-pointer active:bg-gray-50">
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium flex items-center gap-2">
                    {child.name}
                    <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                      {getGenderLabel(child.gender)}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {t('profile.grade')}: {child.current_grade} {child.target_grade ? `-> ${child.target_grade}` : ""} | {t('profile.target')}: {child.target_districts}
                  </p>
                </div>
                <Button variant="outline" size="sm">{t('profile.edit')}</Button>
              </CardContent>
            </Card>
          ))
        )}
        
        <Button className="w-full" variant="outline" onClick={() => navigate("/app/profile/add-child")}>{t('profile.add_child')}</Button>
      </div>

      <div className="space-y-2 pt-4">
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-2"
          onClick={() => navigate("/app/profile/settings")}
        >
          <Settings className="h-4 w-4" />
          {t('profile.settings')}
        </Button>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          {t('profile.logout')}
        </Button>
      </div>
    </div>
  );
}
