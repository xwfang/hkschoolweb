import api from "./client";
import type { School } from "./schools";

export interface Application {
  id: number;
  child_id: number;
  school_id: number;
  status: "interested" | "applied" | "interview" | "offer" | "rejected";
  notes?: string;
  updated_at: string;
  school?: School; // Preloaded by backend
}

export interface CreateApplicationRequest {
  child_id: number;
  school_id: number;
  status: Application["status"];
  notes?: string;
}

export const applicationsApi = {
  // 4.1 Create Application
  create: async (data: CreateApplicationRequest) => {
    const response = await api.post<Application>("/applications", data);
    return response.data;
  },

  // 4.2 List Applications
  list: async (childId: number) => {
    const response = await api.get<Application[]>("/applications", {
      params: { child_id: childId },
    });
    return response.data;
  },

  // 4.3 Update Application Status
  update: async (id: number, data: Partial<Application>) => {
    const response = await api.put<Application>(`/applications/${id}`, data);
    return response.data;
  },
};
