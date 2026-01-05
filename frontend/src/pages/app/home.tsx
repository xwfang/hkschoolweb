import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Award, BookOpen, School as SchoolIcon, Info } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { childrenApi } from "@/api/children";
import { schoolsApi } from "@/api/schools";
import { applicationsApi } from "@/api/applications";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChildSwitcher } from "@/components/mobile/child-switcher";
import { useTranslation } from "react-i18next";
import { useMetadata } from "@/hooks/use-metadata";

import { User } from "lucide-react";

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const { getDistrictLabel, getGenderLabel, getCategoryLabel, districts, categories, genders } = useMetadata();
  const { currentChildId } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  // activeFilter now stores the 'key' from metadata
  const [activeFilter, setActiveFilter] = useState("");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch all children to determine current child's grade
  const { data: allChildren } = useQuery({
    queryKey: ["children"],
    queryFn: childrenApi.list,
    enabled: !!currentChildId,
  });

  const currentChild = allChildren?.find(c => c.id === currentChildId);
  
  // Determine school level based on grade
  // K1-K3 -> Kindergarten
  // P1-P6 -> Primary
  // S1-S6 -> Secondary
  // Default to Secondary if unknown
  const getLevel = (grade?: string) => {
    if (!grade) return "Secondary";
    if (grade.startsWith("K")) return "Kindergarten";
    if (grade.startsWith("P")) return "Primary";
    return "Secondary";
  };

  const currentLevel = getLevel(currentChild?.current_grade);

  // Dynamic filters based on metadata
  // We can pick some popular ones or show all
  // For demo, we show a mix of popular districts and categories
  const getFilters = () => {
    const filters: Array<{ label: string; icon: React.ElementType; value: string; type: 'district' | 'category' | 'gender' | 'banding' }> = [];

    // Banding (Only for Secondary)
    if (currentLevel === "Secondary") {
      filters.push({ label: t('home.band_1'), icon: Award, value: "Band 1", type: "banding" });
    }

    // Popular Districts (Example: Kowloon City, Wan Chai)
    const popularDistricts = ["kowloon_city", "wan_chai", "central_western"];
    districts.filter(d => popularDistricts.includes(d.key)).forEach(d => {
      filters.push({ label: getDistrictLabel(d.key), icon: MapPin, value: d.key, type: "district" });
    });

    // Categories
    const popularCategories = ["secondary_dss", "primary_aided", "kindergarten_non_profit"];
    categories.filter(c => popularCategories.some(pc => c.key.includes(pc) || c.key === pc)).forEach(c => {
       // Simple filter to show relevant categories for current level
       if (c.key.toLowerCase().includes(currentLevel.toLowerCase())) {
          filters.push({ label: getCategoryLabel(c.key), icon: SchoolIcon, value: c.key, type: "category" });
       }
    });

    // Gender
    if (currentLevel === "Secondary" || currentLevel === "Primary") {
       genders.forEach(g => {
          filters.push({ label: getGenderLabel(g.key), icon: User, value: g.key, type: "gender" });
       });
    }

    return filters;
  };

  const activeFilters = getFilters();

  // Determine filter params
  const getFilterParams = () => {
     const selectedFilter = activeFilters.find(f => f.value === activeFilter);
     if (!selectedFilter) return {};
     return {
        [selectedFilter.type]: selectedFilter.value
     };
  };

  // Fetch matches for current child
  const { data: matchData, isLoading: isLoadingMatches } = useQuery({
    queryKey: ["matches", currentChildId],
    queryFn: () => currentChildId ? childrenApi.getMatches(currentChildId) : null,
    enabled: !!currentChildId && !searchQuery && !activeFilter,
  });

  // Fetch all schools for search/filter or fallback
  const { data: allSchools } = useQuery({
    queryKey: ["schools", searchQuery, activeFilter],
    queryFn: () => schoolsApi.list({ 
      name: searchQuery,
      sort: !searchQuery ? 'popularity' : undefined,
      ...getFilterParams()
    }),
    // Always fetch all schools if we don't have a child selected, or if we are searching/filtering
    enabled: !currentChildId || !!searchQuery || !!activeFilter || (!!currentChildId && !isLoadingMatches && (!matchData?.matches || matchData.matches.length === 0)),
  });

  // Fetch existing applications to check status
  const { data: applications } = useQuery({
    queryKey: ["applications", currentChildId],
    queryFn: () => currentChildId ? applicationsApi.list(currentChildId) : null,
    enabled: !!currentChildId,
  });

  const trackedSchoolIds = new Set(applications?.map(app => app.school_id));

  const trackMutation = useMutation({
    mutationFn: applicationsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });

  const handleTrack = (schoolId: number) => {
    if (!currentChildId) {
      alert(t('common.select_child_alert'));
      return;
    }
    trackMutation.mutate({
      child_id: currentChildId,
      school_id: schoolId,
      status: "interested",
    });
  };

  const handleFilterClick = (filter: string) => {
    if (activeFilter === filter) {
      setActiveFilter(""); // Toggle off
    } else {
      setActiveFilter(filter);
      setSearchQuery(""); // Clear search when filtering
    }
  };

  // Logic: 
  // 1. If searching or filtering, show allSchools result
  // 2. If child selected and has matches, show matches
  // 3. Otherwise (no child, or no matches), show allSchools (fallback)
  const displaySchools = (searchQuery || activeFilter) 
    ? allSchools 
    : (currentChildId && matchData?.matches && matchData.matches.length > 0) 
      ? matchData.matches 
      : allSchools;

  const isFallback = !searchQuery && !activeFilter && currentChildId && (!matchData?.matches || matchData.matches.length === 0);

  return (
    <div className="space-y-6 pb-20">
      {/* Header with Child Switcher */}
      <div className="bg-white px-4 pt-4 pb-2 sticky top-0 z-10 border-b">
        <div className="flex items-center gap-2 mb-4">
          <ChildSwitcher />
          {currentChild && (
            <span className="text-[10px] font-medium px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
              {currentLevel === "Kindergarten" ? t('child.level.kindergarten') : currentLevel === "Primary" ? t('child.level.primary') : t('child.level.secondary')}
            </span>
          )}
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input 
            className="pl-9 bg-gray-50 border-none shadow-sm h-9" 
            placeholder={t('home.search_placeholder')}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setActiveFilter(""); // Clear filter when searching
            }}
          />
        </div>
      </div>

      <div className="px-4 space-y-6">
        {/* Quick Filters */}
        <section>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {activeFilters.map((filter) => (
              <button
                key={filter.label}
                onClick={() => handleFilterClick(filter.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                  activeFilter === filter.value
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                }`}
              >
                <filter.icon className="h-3.5 w-3.5" />
                {filter.label}
              </button>
            ))}
          </div>
        </section>

        {/* AI Recommendation Banner (Only when no search/filter) */}
        {!searchQuery && !activeFilter && matchData?.analysis && (
          <section className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 text-white shadow-lg">
            <div className="flex items-start gap-3">
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm mb-1">{t('home.ai_recommendation')}</h3>
                <p className="text-xs text-indigo-100 leading-relaxed opacity-90 line-clamp-3">
                  {matchData.analysis}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Fallback Hint */}
        {isFallback && (
          <div className="bg-orange-50 text-orange-800 text-xs px-4 py-2 rounded-lg flex items-center gap-2">
            <span className="text-lg">💡</span>
            {t('home.no_matches_fallback', '暂无针对该子女的个性化匹配，为您展示热门学校。')}
          </div>
        )}

        {/* School List */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900">
            {searchQuery || activeFilter ? t('home.filter_results') : (isFallback ? t('home.popular_schools') : t('home.recommended_for_you'))}
          </h2>
          
          <div className="space-y-3">
            {isLoadingMatches ? (
              <div className="text-center text-sm text-gray-500 py-8">
                <div className="animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                {t('home.loading')}
              </div>
            ) : displaySchools?.map((school) => {
              const isTracked = trackedSchoolIds.has(school.id);
              const isEnglish = i18n.language === 'en';
              const displayName = isEnglish ? (school.name_en || school.name_cn) : (school.name_cn || school.name_en);
              const secondaryName = isEnglish ? school.name_cn : school.name_en;

              return (
                <Card key={school.id} className="cursor-pointer active:bg-gray-50 overflow-hidden border-none shadow-sm ring-1 ring-gray-100" onClick={() => navigate(`/app/school/${school.id}`)}>
                  <CardContent className="p-0">
                    <div className="p-3 flex justify-between items-start gap-3">
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2 mb-1">
                           <h3 className="font-bold text-gray-900 line-clamp-1 text-left">{displayName}</h3>
                           {school.banding && (
                             <span className="shrink-0 bg-indigo-50 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">{school.banding}</span>
                           )}
                        </div>
                        <p className="text-xs text-gray-500 mb-2 line-clamp-1 text-left">{secondaryName}</p>
                        
                        <div className="flex flex-wrap gap-2">
                          <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
                            <MapPin className="h-3 w-3" />
                            {getDistrictLabel(school.district)}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
                            <User className="h-3 w-3" />
                            {getGenderLabel(school.gender)}
                          </div>
                        </div>
                      </div>

                      <Button 
                        size="sm" 
                        variant={isTracked ? "secondary" : "outline"}
                        className={`h-8 px-3 shrink-0 transition-all ${isTracked ? "bg-green-50 text-green-700 hover:bg-green-100 border-green-200" : ""}`}
                        disabled={isTracked || trackMutation.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTrack(school.id);
                        }}
                      >
                        {isTracked ? t('common.followed') : t('common.follow')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            
            {displaySchools?.length === 0 && (
              <div className="text-center text-gray-500 py-12 bg-gray-50 rounded-lg border border-dashed">
                <SchoolIcon className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                <p>{t('home.no_matches')}</p>
                {(activeFilter || searchQuery) && (
                  <Button variant="link" onClick={() => { setActiveFilter(""); setSearchQuery(""); }}>
                    {t('home.clear_filters')}
                  </Button>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
