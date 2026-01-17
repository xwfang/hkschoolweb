import api from "./client";

export interface MetadataItem {
  key: string;
  en: string;
  tc: string;
  sc: string;
}

export interface MetadataResponse {
  districts: MetadataItem[];
  genders: MetadataItem[];
  categories: MetadataItem[];
  religions: MetadataItem[];
}

export const metadataApi = {
  get: async () => {
    const response = await api.get<MetadataResponse>("/metadata");
    return response.data;
  },
};
