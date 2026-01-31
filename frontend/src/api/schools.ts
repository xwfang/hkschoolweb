import api from "./client";

export interface School {
  id: number;
  name_en: string;
  name_cn: string;
  district: string;
  category: string;
  banding: string;
  gender: string;
  religion?: string; // Optional in API docs but good to have
  school_net?: string; // Not explicitly in updated docs, but good to keep if backend sends it
  moi?: string; // Not explicitly in updated docs
  tags?: string; // Added in v0.6
  popularity?: number; // Added in v0.6
  website_home?: string; // Added in v0.6
  website_admission?: string; // Added in v0.6
}

export interface SchoolSearchParams {
  district?: string;
  category?: string;
  banding?: string;
  gender?: string;
  religion?: string;
  name?: string;
  sort?: "popularity"; // Explicitly supported sort option
}

export const schoolsApi = {
  // 3.1 List Schools (Search)
  list: async (params?: SchoolSearchParams) => {
    const response = await api.get<School[]>("/schools", { params });
    return response.data;
  },

  // 3.1.5 Get School by ID
  get: async (id: string | number) => {
    const response = await api.get<School>(`/schools/${id}`);
    return response.data;
  },

  // 3.2 Create School (Admin)
  create: async (data: Omit<School, "id">) => {
    const response = await api.post<School>("/schools", data);
    return response.data;
  },
  
  // 3.3 Update School (Admin)
  update: async (id: number, data: Partial<School>) => {
    const response = await api.put<School>(`/schools/${id}`, data);
    return response.data;
  }
};
