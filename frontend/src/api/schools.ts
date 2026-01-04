import api from "./client";

export interface School {
  id: number;
  name_en: string;
  name_cn: string;
  district: string;
  category: string;
  banding: string;
  gender: string;
  religion?: string;
  school_net?: string;
  moi?: string;
  tags?: string;
  popularity?: number;
  website_home?: string;
  website_admission?: string;
  // TODO: Add admission events when ready
}

export interface SchoolSearchParams {
  district?: string;
  category?: string;
  banding?: string;
  gender?: string;
  religion?: string;
  name?: string;
  sort?: string;
}

export const schoolsApi = {
  // 3.1 List Schools (Search)
  list: async (params?: SchoolSearchParams) => {
    const response = await api.get<School[]>("/schools", { params });
    return response.data;
  },

  // 3.1.5 Get School by ID
  get: async (id: string | number) => {
    // If we have a numeric ID, we should try to fetch it from the list if possible
    // But since we need a dedicated endpoint, let's verify if the backend supports GET /schools/:id
    // If not, we might need to search for it by name or handle it differently
    try {
      const response = await api.get<School>(`/schools/${id}`);
      return response.data;
    } catch (error) {
       // Fallback: If GET /schools/:id fails (e.g. 404), try to find it via search if we have enough info,
       // or just return null and let the UI handle it. 
       // For now, let's just return null if it's a 404 to avoid infinite loading.
       console.error("Failed to fetch school detail:", error);
       return null;
    }
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
