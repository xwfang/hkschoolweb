import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { childrenApi } from "@/api/children";
import { useMetadata } from "@/hooks/use-metadata";

export default function AddChildPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
      setError("添加失败，请重试");
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
      setSuccessMsg("AI 识别成功！已自动优化地区格式以提高匹配率。");
      setError("");
      // Don't auto-collapse, so user can see what happened or try again
    },
    onError: () => {
      setError("AI 分析失败，请检查网络或稍后重试");
      setSuccessMsg("");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.current_grade) {
      setError("请填写必填项");
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
        <h1 className="font-semibold text-lg">添加子女档案</h1>
      </div>

      <div className="p-4 flex-1 space-y-6">
        {/* AI Analysis Section */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-lg border border-indigo-100">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              AI 智能填写
            </h3>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 text-xs text-indigo-700 hover:text-indigo-900 hover:bg-indigo-100"
              onClick={() => setShowAnalysis(!showAnalysis)}
            >
              {showAnalysis ? "收起" : "展开"}
            </Button>
          </div>
          
          {showAnalysis && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-xs text-indigo-700">
                粘贴孩子的简介、简历或描述，AI 将自动提取信息。
                <button 
                  onClick={fillSample}
                  className="ml-2 underline font-medium hover:text-indigo-900"
                >
                  试一试示例
                </button>
              </p>
              <textarea
                className="w-full min-h-[100px] rounded-md border-indigo-200 bg-white p-3 text-sm focus:border-indigo-400 focus:ring-indigo-400"
                placeholder="在此粘贴描述（例如：我的儿子 Jason，今年读小五，想找九龙城的 Band 1 中学...）"
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
                  <>正在分析...</>
                ) : (
                  <>
                    <Wand2 className="h-3 w-3" />
                    一键提取信息
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
                姓名 <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="请输入姓名"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                性别 <span className="text-red-500">*</span>
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
                  <span>男 (Boy)</span>
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
                  <span>女 (Girl)</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                当前年级 <span className="text-red-500">*</span>
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.current_grade}
                onChange={(e) => setFormData({ ...formData, current_grade: e.target.value })}
              >
                <option value="" disabled>请选择年级</option>
                <option value="K1">K1</option>
                <option value="K2">K2</option>
                <option value="K3">K3</option>
                <option value="P1">P1 (小一)</option>
                <option value="P2">P2 (小二)</option>
                <option value="P3">P3 (小三)</option>
                <option value="P4">P4 (小四)</option>
                <option value="P5">P5 (小五)</option>
                <option value="P6">P6 (小六)</option>
                <option value="S1">S1 (中一)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                目标年级 (选填)
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.target_grade}
                onChange={(e) => setFormData({ ...formData, target_grade: e.target.value })}
              >
                <option value="">自动推断 (Auto)</option>
                <option value="K1">K1</option>
                <option value="K2">K2</option>
                <option value="K3">K3</option>
                <option value="P1">P1 (小一)</option>
                <option value="S1">S1 (中一)</option>
              </select>
              <p className="text-xs text-gray-500">留空则根据当前年级自动推断 (例如 P6 -&gt; S1)</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                目标地区
              </label>
              <Input
                placeholder="例如: 九龙城, 湾仔 (逗号分隔)"
                value={formData.target_districts}
                onChange={(e) => setFormData({ ...formData, target_districts: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                个人简介 / 备注
              </label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="简单的自我介绍或特殊要求..."
                value={formData.resume_text}
                onChange={(e) => setFormData({ ...formData, resume_text: e.target.value })}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" className="w-full" disabled={createMutation.isPending}>
            {createMutation.isPending ? "保存中..." : "保存档案"}
          </Button>
        </form>
      </div>
    </div>
  );
}
