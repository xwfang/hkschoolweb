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
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const getLabel = (items: MetadataItem[] | undefined, key: string) => {
    if (!items) return key;
    const item = items.find((i) => i.key === key);
    return item ? (item[langField] as string) : key;
  };

  return {
    districts: data?.districts || [],
    genders: data?.genders || [],
    categories: data?.categories || [],
    isLoading,
    getDistrictLabel: (key: string) => getLabel(data?.districts, key),
    getGenderLabel: (key: string) => getLabel(data?.genders, key),
    getCategoryLabel: (key: string) => getLabel(data?.categories, key),
  };
}
