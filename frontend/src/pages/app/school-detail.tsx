import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { schoolsApi } from "@/api/schools";
import { applicationsApi, type Application } from "@/api/applications";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Globe, ExternalLink, Flame, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMetadata } from "@/hooks/use-metadata";

export default function SchoolDetailPage() {
  const { t, i18n } = useTranslation();
  const { getDistrictLabel, getGenderLabel, getCategoryLabel } = useMetadata();
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
  const isEnglish = i18n.language === 'en';
  const displayName = isEnglish ? (school?.name_en || school?.name_cn) : (school?.name_cn || school?.name_en);
  const secondaryName = isEnglish ? school?.name_cn : school?.name_en;

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
      navigate("/app/profile");
      return;
    }
    trackMutation.mutate({
      child_id: currentChildId,
      school_id: Number(id),
      status: "interested",
    });
  };

  const handleBack = () => {
    // Check if there is a history stack to go back to within the app
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      // Fallback to home if no history (e.g. direct link or refresh on first page)
      navigate("/app/home", { replace: true });
    }
  };

  if (isLoading) return <div className="p-4 text-center">{t('common.loading')}</div>;
  if (!school) return (
    <div className="p-4 text-center mt-10">
      <div className="bg-red-50 text-red-800 p-4 rounded-lg mb-4">
        <p className="font-bold">{t('school.not_found')}</p>
        <p className="text-sm mt-1">{t('school.not_found_desc', { id })}</p>
      </div>
      <Button variant="outline" onClick={handleBack}>{t('school.back')}</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-white pb-20">
       {/* Header */}
      <div className="bg-white px-4 h-14 flex items-center gap-3 sticky top-0 z-10 border-b">
        <Button variant="ghost" size="sm" className="p-0 h-8 w-8" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold text-lg truncate flex-1">{displayName}</h1>
      </div>

      <div className="p-4 space-y-6">
        <div>
          <h2 className="text-xl font-bold">{displayName}</h2>
          <p className="text-gray-500 text-sm">{secondaryName}</p>
        </div>

        <div className="flex flex-wrap gap-2">
           {school.banding && <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">{school.banding}</span>}
           <span className="bg-gray-100 px-3 py-1 rounded-full text-sm">{getDistrictLabel(school.district)}</span>
           <span className="bg-gray-100 px-3 py-1 rounded-full text-sm">{getGenderLabel(school.gender)}</span>
           <span className="bg-gray-100 px-3 py-1 rounded-full text-sm">{getCategoryLabel(school.category)}</span>
           {school.religion && <span className="bg-gray-100 px-3 py-1 rounded-full text-sm">{school.religion}</span>}
           {school.school_net && <span className="bg-gray-100 px-3 py-1 rounded-full text-sm">{t('school.net')}: {school.school_net}</span>}
        </div>

        {/* Popularity & Tags */}
        <div className="flex flex-col gap-3">
          {school.popularity !== undefined && (
             <div className="flex items-center gap-1 text-orange-600 font-medium text-sm">
               <Flame className="h-4 w-4 fill-orange-100" />
               {school.popularity} {t('common.popularity') || '热度'}
             </div>
           )}
           
           {school.tags && (
            <div className="flex flex-wrap gap-2">
              {school.tags.split(',').map(tag => (
                <span key={tag} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag.trim()}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold">{t('school.info_title')}</h3>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
             <div>
               <p className="text-gray-500">{t('school.type')}</p>
               <p>{school.category}</p>
             </div>
             <div>
               <p className="text-gray-500">{t('school.district')}</p>
               <p>{school.district}</p>
             </div>
             <div>
               <p className="text-gray-500">{t('school.moi')}</p>
               <p>{school.moi || t('school.no_info')}</p>
             </div>
             <div>
               <p className="text-gray-500">{t('school.religion')}</p>
               <p>{school.religion || t('school.none')}</p>
             </div>
          </div>

          {/* Placeholder for Admission Dates */}
          <div className="bg-yellow-50 p-3 rounded-md border border-yellow-100">
             <h4 className="font-medium text-yellow-800 mb-2 text-sm">📅 {t('school.admission_info')}</h4>
             
             {school.website_admission ? (
               <>
                 <p className="text-xs text-yellow-700 mb-3">
                   {t('school.admission_info_found_desc', '请点击下方按钮查看最新插班/招生资讯。')}
                 </p>
                 <Button 
                   size="sm" 
                   className="w-full bg-yellow-600 hover:bg-yellow-700 text-white border-none shadow-sm"
                   onClick={() => window.open(school.website_admission, "_blank")}
                 >
                   <ExternalLink className="h-4 w-4 mr-2" />
                   {t('school.view_admission_info', '查看招生详情')}
                 </Button>
               </>
             ) : (
               <p className="text-xs text-yellow-700">
                 {t('school.admission_info_desc')}
               </p>
             )}
          </div>

          <div className="space-y-3">
            {school.website_home && (
              <a href={school.website_home} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                <Globe className="h-4 w-4" />
                {t('school.website')}
              </a>
            )}
            {school.website_admission && (
              <a href={school.website_admission} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                <ExternalLink className="h-4 w-4" />
                {t('school.admission_page')}
              </a>
            )}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t safe-area-pb">
          {existingApplication ? (
            <div className="space-y-2">
              <label className="text-xs text-gray-500">{t('school.current_status')}</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={existingApplication.status}
                onChange={(e) => updateMutation.mutate({ 
                  id: existingApplication.id, 
                  status: e.target.value 
                })}
                disabled={updateMutation.isPending}
              >
                <option value="interested">{t('status.interested')}</option>
                <option value="applied">{t('status.applied')}</option>
                <option value="interview">{t('status.interview')}</option>
                <option value="offer">{t('status.offer')}</option>
                <option value="rejected">{t('status.rejected')}</option>
              </select>
            </div>
          ) : (
            <Button 
              className="w-full" 
              size="lg"
              disabled={trackMutation.isPending}
              onClick={handleTrack}
            >
              {t('school.add_to_tracking')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
