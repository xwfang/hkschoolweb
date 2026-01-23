import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { User, Settings, LogOut, Plus, Trash2, Crown } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { childrenApi } from "@/api/children";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMetadata } from "@/hooks/use-metadata";

export default function ProfilePage() {
  const { user, logout, setCurrentChildId } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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

  const isVip = user?.vip_expire_at && new Date(user.vip_expire_at) > new Date();

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm border relative overflow-hidden">
        {isVip ? (
          <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs px-2 py-1 rounded-bl-lg font-bold flex items-center gap-1">
            <Crown className="w-3 h-3" /> VIP
          </div>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            className="absolute top-3 right-3 h-7 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800"
            onClick={() => navigate("/app/subscription")}
          >
            <Crown className="w-3 h-3 mr-1" />
            {t('profile.upgrade_vip')}
          </Button>
        )}
        <div className={`h-16 w-16 rounded-full flex items-center justify-center ${isVip ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-200 text-gray-500'}`}>
          <User className="h-8 w-8" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold flex items-center gap-2">
            {t('profile.user_title')}
          </h2>
          <p className="text-sm text-gray-500">{user?.identifier}</p>
          
          <div className="mt-2 flex items-center gap-2">
             {isVip && (
               <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                 {t('profile.vip_expire', { date: user?.vip_expire_at ? new Date(user.vip_expire_at).toLocaleDateString() : '' })}
               </span>
             )}
          </div>
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
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/app/profile/edit-child/${child.id}`);
                    }}
                  >
                    {t('profile.edit')}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(t('child.delete_confirm') || 'Are you sure?')) {
                        childrenApi.delete(child.id).then(() => {
                          queryClient.invalidateQueries({ queryKey: ["children"] });
                        });
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
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
