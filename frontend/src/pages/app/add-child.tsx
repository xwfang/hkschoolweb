import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { childrenApi } from "@/api/children";
import { useMetadata } from "@/hooks/use-metadata";
import { useTranslation } from "react-i18next";

export default function AddChildPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { districts } = useMetadata();
  const [formData, setFormData] = useState({
    name: "",
    gender: "M" as "M" | "F",
    current_grade: "",
    target_grade: "",
    target_districts: "",
    resume_text: "",
  });
  const [analysisText, setAnalysisText] = useState("");
  const [showAnalysis, setShowAnalysis] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const createMutation = useMutation({
    mutationFn: childrenApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["children"] });
      navigate("/app/profile");
    },
    onError: () => {
      setError(t('child.add_error'));
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: childrenApi.analyze,
    onSuccess: (data) => {
      console.log("AI Analysis Result:", data);
      
      // Map gender variants to "M" | "F"
      let gender: "M" | "F" = formData.gender;
      if (data.gender) {
        const g = data.gender.toUpperCase();
        if (g.includes("F") || g.includes("G") || g.includes("女")) gender = "F";
        else if (g.includes("M") || g.includes("B") || g.includes("男")) gender = "M";
      }

      // Smart District Mapping (Chinese <-> English) to improve match rate
      const districtsInput = data.target_districts || "";
      
      // Try to find matching district keys from metadata
      const mappedDistricts: string[] = [];
      
      // If the input contains known district names (en, tc, sc), map them to keys
      if (districts && districts.length > 0) {
        // Create a map of all possible names to keys
        const nameToKey: Record<string, string> = {};
        districts.forEach(d => {
            nameToKey[d.en.toLowerCase()] = d.key;
            nameToKey[d.tc] = d.key;
            nameToKey[d.sc] = d.key;
            // Also partial matches for common short names
            if (d.tc.endsWith("区")) nameToKey[d.tc.replace("区", "")] = d.key;
            if (d.sc.endsWith("区")) nameToKey[d.sc.replace("区", "")] = d.key;
        });

        // Split input by common separators
        const parts = districtsInput.split(/[,，、\s]+/).filter(Boolean);
        
        parts.forEach(part => {
            const lowerPart = part.toLowerCase();
            // Exact match check
            if (nameToKey[lowerPart]) {
                mappedDistricts.push(nameToKey[lowerPart]);
            } else {
                // Fuzzy match: check if any key contains the part or vice versa
                // This is a bit risky but helpful for AI output
                const found = Object.keys(nameToKey).find(k => k.includes(lowerPart) || lowerPart.includes(k));
                if (found) {
                    mappedDistricts.push(nameToKey[found]);
                }
            }
        });
      }

      // If we found mapped keys, join them with commas. Otherwise keep original (fallback)
      const finalDistricts = mappedDistricts.length > 0 
          ? [...new Set(mappedDistricts)].join(",") 
          : districtsInput;

      setFormData(prev => ({
        ...prev,
        // Update name if present
        name: data.name || prev.name,
        // Update grade if present
        current_grade: data.current_grade || prev.current_grade,
        // Update target districts if present
        target_districts: finalDistricts || prev.target_districts,
        gender,
        resume_text: data.resume_text || analysisText || prev.resume_text
      }));
      setSuccessMsg(t('child.ai_success'));
      setError("");
      // Don't auto-collapse, so user can see what happened or try again
    },
    onError: () => {
      setError(t('child.ai_error'));
      setSuccessMsg("");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.current_grade) {
      setError(t('child.validation_error'));
      return;
    }
    createMutation.mutate(formData);
  };

  const handleAnalyze = () => {
    if (!analysisText.trim()) return;
    setSuccessMsg("");
    setError("");
    analyzeMutation.mutate(analysisText);
  };

  const fillSample = () => {
    setAnalysisText("我的女儿 Alice，今年读小六 (P6)，性格开朗，钢琴八级，想在九龙城找一所合适的 Band 1 女校。");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 h-14 flex items-center gap-3 sticky top-0 z-10">
        <Button variant="ghost" size="sm" className="p-0 h-8 w-8" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold text-lg">{t('child.add_title')}</h1>
      </div>

      <div className="p-4 flex-1 space-y-6">
        {/* AI Analysis Section */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-lg border border-indigo-100">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              {t('child.ai_title')}
            </h3>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 text-xs text-indigo-700 hover:text-indigo-900 hover:bg-indigo-100"
              onClick={() => setShowAnalysis(!showAnalysis)}
            >
              {showAnalysis ? t('child.collapse') : t('child.expand')}
            </Button>
          </div>
          
          {showAnalysis && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-xs text-indigo-700">
                {t('child.ai_desc')}
                <button 
                  onClick={fillSample}
                  className="ml-2 underline font-medium hover:text-indigo-900"
                >
                  {t('child.try_sample')}
                </button>
              </p>
              <textarea
                className="w-full min-h-[100px] rounded-md border-indigo-200 bg-white p-3 text-sm focus:border-indigo-400 focus:ring-indigo-400"
                placeholder={t('child.ai_placeholder')}
                value={analysisText}
                onChange={(e) => setAnalysisText(e.target.value)}
              />
              
              {successMsg && (
                <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  {successMsg}
                </div>
              )}

              <Button 
                size="sm" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                onClick={handleAnalyze}
                disabled={analyzeMutation.isPending || !analysisText.trim()}
              >
                {analyzeMutation.isPending ? (
                  <>{t('child.ai_button_analyzing')}</>
                ) : (
                  <>
                    <Wand2 className="h-3 w-3" />
                    {t('child.ai_button')}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4 bg-white p-4 rounded-lg shadow-sm border">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                {t('child.name')} <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder={t('child.name')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                {t('child.gender')} <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 border rounded-md px-4 py-2 flex-1 cursor-pointer hover:bg-gray-50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                  <input
                    type="radio"
                    name="gender"
                    value="M"
                    checked={formData.gender === "M"}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as "M" | "F" })}
                    className="accent-blue-600"
                  />
                  <span>{t('child.boy')}</span>
                </label>
                <label className="flex items-center gap-2 border rounded-md px-4 py-2 flex-1 cursor-pointer hover:bg-gray-50 has-[:checked]:border-pink-500 has-[:checked]:bg-pink-50">
                  <input
                    type="radio"
                    name="gender"
                    value="F"
                    checked={formData.gender === "F"}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as "M" | "F" })}
                    className="accent-pink-600"
                  />
                  <span>{t('child.girl')}</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                {t('child.current_grade')} <span className="text-red-500">*</span>
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.current_grade}
                onChange={(e) => setFormData({ ...formData, current_grade: e.target.value })}
              >
                <option value="" disabled>{t('child.select_grade')}</option>
                <option value="K1">K1</option>
                <option value="K2">K2</option>
                <option value="K3">K3</option>
                <option value="P1">P1 ({t('child.level.primary')} 1)</option>
                <option value="P2">P2 ({t('child.level.primary')} 2)</option>
                <option value="P3">P3 ({t('child.level.primary')} 3)</option>
                <option value="P4">P4 ({t('child.level.primary')} 4)</option>
                <option value="P5">P5 ({t('child.level.primary')} 5)</option>
                <option value="P6">P6 ({t('child.level.primary')} 6)</option>
                <option value="S1">S1 ({t('child.level.secondary')} 1)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                {t('child.target_grade')}
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.target_grade}
                onChange={(e) => setFormData({ ...formData, target_grade: e.target.value })}
              >
                <option value="">{t('child.auto_infer')}</option>
                <option value="K1">K1</option>
                <option value="K2">K2</option>
                <option value="K3">K3</option>
                <option value="P1">P1 ({t('child.level.primary')} 1)</option>
                <option value="S1">S1 ({t('child.level.secondary')} 1)</option>
              </select>
              <p className="text-xs text-gray-500">{t('child.auto_infer_hint')}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                {t('child.target_districts')}
              </label>
              <Input
                placeholder={t('child.target_districts_placeholder')}
                value={formData.target_districts}
                onChange={(e) => setFormData({ ...formData, target_districts: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                {t('child.resume')}
              </label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder={t('child.resume_placeholder')}
                value={formData.resume_text}
                onChange={(e) => setFormData({ ...formData, resume_text: e.target.value })}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" className="w-full" disabled={createMutation.isPending}>
            {createMutation.isPending ? t('child.saving') : t('child.save')}
          </Button>
        </form>
      </div>
    </div>
  );
}
