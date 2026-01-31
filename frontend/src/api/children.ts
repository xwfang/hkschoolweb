import api from "./client";
import type { School } from "./schools";

export interface Child {
  id: number;
  name: string;
  current_grade: string;
  target_grade?: string;
  gender: "M" | "F";
  target_districts: string; // CSV string
  resume_text?: string;
}

export interface MatchResult {
  child: string;
  matches: School[];
  analysis?: string; // Analysis text explaining the match/expansion
  total_count: number; // Count of strict matches
  page: number;
  limit: number;
}

export const childrenApi = {
  // 2.1 Create Child Profile
  create: async (data: Omit<Child, "id">) => {
    const response = await api.post<Child>("/children", data);
    return response.data;
  },

  // 2.2 List Children
  list: async () => {
    const response = await api.get<Child[]>("/children");
    return response.data;
  },

  // 2.2.1 Analyze Child Profile (AI)
  analyze: async (text: string) => {
    const response = await api.post<Partial<Child>>("/children/analyze", { text });
    return response.data;
  },

  // 2.3 Update Child
  update: async (id: number, data: Partial<Child>) => {
    const response = await api.put<Child>(`/children/${id}`, data);
    return response.data;
  },

  // 2.4 Delete Child
  delete: async (id: number) => {
    await api.delete(`/children/${id}`);
  },

  // 2.5 Get School Matches
  getMatches: async (id: number, params?: { page?: number; limit?: number }) => {
    const response = await api.get<MatchResult>(`/children/${id}/matches`, { params });
    return response.data;
  },
};
