import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { applicationsApi, type Application } from "@/api/applications";
import { Link, useNavigate } from "react-router-dom";

const statusMap: Record<string, { label: string; color: string }> = {
  interested: { label: "已关注", color: "bg-gray-100 text-gray-800" },
  applied: { label: "已报名", color: "bg-yellow-100 text-yellow-800" },
  interview: { label: "面试中", color: "bg-blue-100 text-blue-800" },
  offer: { label: "已录取", color: "bg-green-100 text-green-800" },
  rejected: { label: "未获录", color: "bg-red-100 text-red-800" },
};

export default function TrackingPage() {
  const { currentChildId } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { data: applications, isLoading } = useQuery({
    queryKey: ["applications", currentChildId],
    queryFn: () => currentChildId ? applicationsApi.list(currentChildId) : null,
    enabled: !!currentChildId,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => 
      applicationsApi.update(id, { status: status as Application["status"] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });

  if (!currentChildId) {
    return (
      <div className="p-4 text-center mt-10">
        <p className="text-gray-500 mb-4">请先选择一个子女来查看申请进度</p>
        <Link to="/app/profile" className="text-primary underline">前往选择</Link>
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
          暂无关注的学校
        </div>
      ) : (
        <div className="space-y-3">
          {applications?.map((app) => (
            <Card 
              key={app.id} 
              className="cursor-pointer active:bg-gray-50"
              onClick={() => navigate(`/app/school/${app.school_id}`)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex justify-between items-start">
                  <span>{app.school?.name_cn || app.school?.name_en}</span>
                  <div onClick={(e) => e.stopPropagation()}>
                    <select
                      className={`text-xs px-2 py-1 rounded-full font-normal border-0 ${statusMap[app.status]?.color} cursor-pointer focus:ring-0 appearance-none pr-6 relative`}
                      value={app.status}
                      onChange={(e) => {
                        updateMutation.mutate({ id: app.id, status: e.target.value });
                      }}
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
              <CardContent className="text-sm text-gray-500">
                <p>最后更新: {new Date(app.updated_at).toLocaleDateString()}</p>
                {app.notes && <p className="mt-1 text-gray-700 bg-gray-50 p-2 rounded">{app.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
