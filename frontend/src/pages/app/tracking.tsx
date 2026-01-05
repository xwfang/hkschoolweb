import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { applicationsApi, type Application } from "@/api/applications";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { FileText, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";

function ApplicationCard({ app, statusMap }: { app: Application; statusMap: Record<string, { label: string; color: string }> }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState(app.notes || "");

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Application>) => applicationsApi.update(app.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      setIsEditingNotes(false);
    },
  });

  const handleSaveNotes = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateMutation.mutate({ notes });
  };

  const handleCancelNotes = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNotes(app.notes || "");
    setIsEditingNotes(false);
  };

  const isEnglish = i18n.language === 'en';
  const displayName = isEnglish ? (app.school?.name_en || app.school?.name_cn) : (app.school?.name_cn || app.school?.name_en);
  const secondaryName = isEnglish ? app.school?.name_cn : app.school?.name_en;

  return (
    <Card 
      className="cursor-pointer active:bg-gray-50 transition-all"
      onClick={() => navigate(`/app/school/${app.school_id}`)}
    >
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-base flex justify-between items-start gap-2">
          <div className="flex flex-col items-start min-w-0">
            <span className="line-clamp-1">{displayName}</span>
            <span className="text-xs text-gray-500 font-normal line-clamp-1">{secondaryName}</span>
          </div>
          <div onClick={(e) => e.stopPropagation()} className="shrink-0">
            <select
              className={`text-xs px-2 py-1 rounded-full font-normal border-0 ${statusMap[app.status]?.color || 'bg-gray-100'} cursor-pointer focus:ring-0 appearance-none pr-6 relative`}
              value={app.status}
              onChange={(e) => updateMutation.mutate({ status: e.target.value as Application["status"] })}
              disabled={updateMutation.isPending}
              style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: `right 0.2rem center`,
                  backgroundRepeat: `no-repeat`,
                  backgroundSize: `1.2em 1.2em`,
                  paddingRight: '1.5rem'
              }}
            >
               {Object.entries(statusMap).map(([key, config]) => (
                 <option key={key} value={key} className="text-black bg-white">
                   {config.label}
                 </option>
               ))}
            </select>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 pb-3">
        {isEditingNotes ? (
          <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes..."
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={handleCancelNotes} className="h-7 px-2">
                <X className="h-3.5 w-3.5 mr-1" /> {t('common.cancel') || '取消'}
              </Button>
              <Button size="sm" onClick={handleSaveNotes} disabled={updateMutation.isPending} className="h-7 px-2">
                <Save className="h-3.5 w-3.5 mr-1" /> {t('common.save') || '保存'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-1 flex items-start gap-2 group">
             <div 
               className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
               onClick={(e) => {
                 e.stopPropagation();
                 setIsEditingNotes(true);
               }}
             >
               <FileText className="h-4 w-4" />
             </div>
             {app.notes ? (
               <p className="text-sm text-gray-600 pt-1 line-clamp-2">{app.notes}</p>
             ) : (
               <p 
                 className="text-sm text-gray-400 pt-1 italic cursor-pointer hover:text-gray-500"
                 onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingNotes(true);
                 }}
               >
                 {t('common.add_notes') || '添加备注...'}
               </p>
             )}
          </div>
        )}
        <div className="mt-3 text-[10px] text-gray-400 text-right">
          {t('common.last_updated') || '最后更新'}: {new Date(app.updated_at).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TrackingPage() {
  const { currentChildId } = useAuthStore();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const statusMap: Record<string, { label: string; color: string }> = {
    interested: { label: t('status.interested'), color: "bg-gray-100 text-gray-800" },
    applied: { label: t('status.applied'), color: "bg-yellow-100 text-yellow-800" },
    interview: { label: t('status.interview'), color: "bg-blue-100 text-blue-800" },
    offer: { label: t('status.offer'), color: "bg-green-100 text-green-800" },
    rejected: { label: t('status.rejected'), color: "bg-red-100 text-red-800" },
  };

  const { data: applications, isLoading, isError } = useQuery({
    queryKey: ["applications", currentChildId],
    queryFn: () => currentChildId ? applicationsApi.list(currentChildId) : null,
    enabled: !!currentChildId,
  });

  if (isError) {
    return (
      <div className="p-4 text-center mt-10">
        <p className="text-red-500 mb-4">{t('common.error')}</p>
        <button 
          onClick={() => queryClient.invalidateQueries({ queryKey: ["applications"] })}
          className="text-primary underline"
        >
          {t('common.retry') || 'Retry'}
        </button>
      </div>
    );
  }

  if (!currentChildId) {
    return (
      <div className="p-4 text-center mt-10">
        <p className="text-gray-500 mb-4">{t('tracking.select_child_first') || '请先选择一个子女来查看申请进度'}</p>
        <Link to="/app/profile" className="text-primary underline">{t('tracking.go_to_select') || '前往选择'}</Link>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">{t('nav.tracking')}</h1>
      
      {isLoading ? (
        <div className="text-center text-sm text-gray-500">{t('common.loading')}</div>
      ) : applications?.length === 0 ? (
        <div className="text-center text-gray-500 py-8 border rounded-lg border-dashed">
          {t('tracking.no_schools') || '暂无关注的学校'}
        </div>
      ) : (
        <div className="space-y-3">
          {applications?.map((app) => (
            <ApplicationCard key={app.id} app={app} statusMap={statusMap} />
          ))}
        </div>
      )}
    </div>
  );
}
