import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { schoolsApi } from "@/api/schools";
import { applicationsApi, type Application } from "@/api/applications";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Globe, ExternalLink } from "lucide-react";

export default function SchoolDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentChildId } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: school, isLoading } = useQuery({
    queryKey: ["school", id],
    queryFn: () => schoolsApi.get(id!),
    enabled: !!id,
  });

  const { data: applications } = useQuery({
    queryKey: ["applications", currentChildId],
    queryFn: () => currentChildId ? applicationsApi.list(currentChildId) : null,
    enabled: !!currentChildId,
  });

  const existingApplication = applications?.find(app => app.school_id === Number(id));

  const trackMutation = useMutation({
    mutationFn: applicationsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: number; status: string }) => 
      applicationsApi.update(data.id, { status: data.status as Application["status"] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });

  const handleTrack = () => {
    if (!currentChildId) {
      alert("请先选择一个子女");
      navigate("/app/profile");
      return;
    }
    trackMutation.mutate({
      child_id: currentChildId,
      school_id: Number(id),
      status: "interested",
    });
  };

  if (isLoading) return <div className="p-4 text-center">加载中...</div>;
  if (!school) return (
    <div className="p-4 text-center mt-10">
      <div className="bg-red-50 text-red-800 p-4 rounded-lg mb-4">
        <p className="font-bold">无法加载学校信息</p>
        <p className="text-sm mt-1">可能是该学校 ID ({id}) 不存在，或者后台接口未返回数据。</p>
      </div>
      <Button variant="outline" onClick={() => navigate(-1)}>返回上一页</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-white pb-20">
       {/* Header */}
      <div className="bg-white px-4 h-14 flex items-center gap-3 sticky top-0 z-10 border-b">
        <Button variant="ghost" size="sm" className="p-0 h-8 w-8" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold text-lg truncate flex-1">{school.name_cn}</h1>
      </div>

      <div className="p-4 space-y-6">
        <div>
          <h2 className="text-xl font-bold">{school.name_cn}</h2>
          <p className="text-gray-500 text-sm">{school.name_en}</p>
        </div>

        <div className="flex flex-wrap gap-2">
           {school.banding && <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">{school.banding}</span>}
           <span className="bg-gray-100 px-3 py-1 rounded-full text-sm">{school.district}</span>
           <span className="bg-gray-100 px-3 py-1 rounded-full text-sm">{school.gender}</span>
           <span className="bg-gray-100 px-3 py-1 rounded-full text-sm">{school.category}</span>
           {school.religion && <span className="bg-gray-100 px-3 py-1 rounded-full text-sm">{school.religion}</span>}
           {school.school_net && <span className="bg-gray-100 px-3 py-1 rounded-full text-sm">校网: {school.school_net}</span>}
        </div>

        {school.tags && (
          <div className="flex flex-wrap gap-2">
            {school.tags.split(",").map((tag, i) => (
              <span key={i} className="border border-blue-200 text-blue-600 px-2 py-0.5 rounded text-xs">
                {tag.trim()}
              </span>
            ))}
          </div>
        )}

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold">学校信息</h3>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
             <div>
               <p className="text-gray-500">类型</p>
               <p>{school.category}</p>
             </div>
             <div>
               <p className="text-gray-500">地区</p>
               <p>{school.district}</p>
             </div>
             <div>
               <p className="text-gray-500">授课语言</p>
               <p>{school.moi || "暂无信息"}</p>
             </div>
             <div>
               <p className="text-gray-500">宗教</p>
               <p>{school.religion || "无"}</p>
             </div>
          </div>

          {/* Placeholder for Admission Dates */}
          <div className="bg-yellow-50 p-3 rounded-md border border-yellow-100">
             <h4 className="font-medium text-yellow-800 mb-2 text-sm">📅 插班招生信息</h4>
             <p className="text-xs text-yellow-700">
               目前尚未抓取到该校的最新插班通告。请点击下方“入学申请页面”前往官网查看。
             </p>
          </div>

          <div className="space-y-3">
            {school.website_home && (
              <a href={school.website_home} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                <Globe className="h-4 w-4" />
                学校官网
              </a>
            )}
            {school.website_admission && (
              <a href={school.website_admission} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                <ExternalLink className="h-4 w-4" />
                入学申请页面
              </a>
            )}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t safe-area-pb">
          {existingApplication ? (
            <div className="space-y-2">
              <label className="text-xs text-gray-500">当前状态</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={existingApplication.status}
                onChange={(e) => updateMutation.mutate({ 
                  id: existingApplication.id, 
                  status: e.target.value 
                })}
                disabled={updateMutation.isPending}
              >
                <option value="interested">已关注</option>
                <option value="applied">已报名</option>
                <option value="interview">面试中</option>
                <option value="offer">已录取</option>
                <option value="rejected">未获录</option>
              </select>
            </div>
          ) : (
            <Button 
              className="w-full" 
              size="lg"
              disabled={trackMutation.isPending}
              onClick={handleTrack}
            >
              添加到追踪列表
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
