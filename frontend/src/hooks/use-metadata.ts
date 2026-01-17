import { useQuery } from "@tanstack/react-query";
import { metadataApi, type MetadataItem } from "@/api/metadata";
import { useTranslation } from "react-i18next";

export function useMetadata() {
  const { i18n } = useTranslation();
  
  // Map i18n language code to metadata field
  // i18n: 'en', 'zh', 'zh-HK' (from config.ts)
  // metadata: 'en', 'sc', 'tc'
  const getLangField = (lang: string): keyof MetadataItem => {
    if (lang.startsWith("en")) return "en";
    if (lang === "zh-HK" || lang === "zh-TW") return "tc";
    return "sc"; // default to simplified chinese for 'zh'
  };

  const langField = getLangField(i18n.language);

  const { data, isLoading } = useQuery({
    queryKey: ["metadata"],
    queryFn: metadataApi.get,
    staleTime: Infinity, // Never stale (static data)
    gcTime: Infinity, // Keep in cache as long as the session is active
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fallback metadata for common values when API data is missing or key mismatch
  const fallbackMetadata: Record<string, Record<string, Record<string, string>>> = {
    genders: {
      "boys": { en: "Boys", tc: "男校", sc: "男校" },
      "girls": { en: "Girls", tc: "女校", sc: "女校" },
      "co-ed": { en: "Co-ed", tc: "男女校", sc: "男女校" },
      // Case sensitive fallbacks if normalization fails
      "Boys": { en: "Boys", tc: "男校", sc: "男校" },
      "Girls": { en: "Girls", tc: "女校", sc: "女校" },
      "Co-ed": { en: "Co-ed", tc: "男女校", sc: "男女校" },
    },
    religions: {
      "christianity": { en: "Christianity", tc: "基督教", sc: "基督教" },
      "catholicism": { en: "Catholicism", tc: "天主教", sc: "天主教" },
      "buddhism": { en: "Buddhism", tc: "佛教", sc: "佛教" },
      "taoism": { en: "Taoism", tc: "道教", sc: "道教" },
      "islam": { en: "Islam", tc: "伊斯蘭教", sc: "伊斯兰教" },
      "protestantism": { en: "Protestantism", tc: "新教", sc: "新教" },
      "none": { en: "None", tc: "無", sc: "无" },
      "n/a": { en: "N/A", tc: "不適用", sc: "不适用" },
      // Common variations
      "protestantism / christianity": { en: "Christianity", tc: "基督教", sc: "基督教" },
    },
    tags: {
      "academic": { en: "Academic", tc: "學術優異", sc: "学术优异" },
      "elite": { en: "Elite", tc: "傳統名校", sc: "传统名校" },
      "music": { en: "Music", tc: "音樂特長", sc: "音乐特长" },
      "sports": { en: "Sports", tc: "體育特長", sc: "体育特长" },
      "chinese": { en: "Chinese", tc: "中文重視", sc: "重视中文" },
      "english": { en: "English", tc: "英文重視", sc: "重视英文" },
      "math": { en: "Math", tc: "數學特長", sc: "数学特长" },
      "science": { en: "Science", tc: "科學特長", sc: "科学特长" },
      "arts": { en: "Arts", tc: "藝術特長", sc: "艺术特长" },
      "stem": { en: "STEM", tc: "STEM強項", sc: "STEM强项" },
      "band 1": { en: "Band 1", tc: "Band 1", sc: "Band 1" },
    }
  };

  const getLabel = (items: MetadataItem[] | undefined, key: string, category?: 'genders' | 'religions' | 'tags') => {
    if (!key) return "";
    
    // 1. Try to find in API data (exact match)
    let item = items?.find((i) => i.key === key);
    
    // 2. Try case-insensitive match in API data
    if (!item && items) {
      item = items.find((i) => i.key.toLowerCase() === key.toLowerCase());
    }

    if (item) {
      return (item[langField] as string) || key;
    }

    // 3. Try fallback metadata
    if (category && fallbackMetadata[category]) {
      const fallbackItem = fallbackMetadata[category][key] || fallbackMetadata[category][key.toLowerCase()];
      if (fallbackItem) {
        return fallbackItem[langField as keyof typeof fallbackItem] || key;
      }
    }

    return key;
  };

  return {
    districts: data?.districts || [],
    genders: data?.genders || [],
    categories: data?.categories || [],
    religions: data?.religions || [],
    isLoading,
    getDistrictLabel: (key: string) => getLabel(data?.districts, key),
    getGenderLabel: (key: string) => getLabel(data?.genders, key, 'genders'),
    getCategoryLabel: (key: string) => getLabel(data?.categories, key),
    getReligionLabel: (key: string) => getLabel(data?.religions, key, 'religions'),
    getTagLabel: (key: string) => getLabel(undefined, key, 'tags'),
  };
}
