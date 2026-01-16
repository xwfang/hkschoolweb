import api from "./client";
import type { School } from "./schools";

export interface CrawlResult {
  success: boolean;
  message: string;
  data?: {
    application_start?: string;
    application_end?: string;
    open_day?: string;
    scraped_at?: string;
  };
}

export const adminApi = {
  // Get all schools (admin view might need pagination or filters)
  getSchools: async (page = 1, limit = 50) => {
    const response = await api.get<School[]>("/schools", {
      params: { page, limit, sort: "id" } // Admin usually sorts by ID
    });
    return response.data;
  },

  // Create new school
  createSchool: async (data: Omit<School, "id">) => {
    const response = await api.post<School>("/schools", data);
    return response.data;
  },

  // Update school basic info
  updateSchool: async (id: number, data: Partial<School>) => {
    const response = await api.put<School>(`/schools/${id}`, data);
    return response.data;
  },

  // Delete school
  deleteSchool: async (id: number) => {
    await api.delete(`/schools/${id}`);
  },

  // Trigger crawler for a specific school
  crawlSchool: async (schoolId: number) => {
    // If school_id is provided, backend crawls admission details
    const response = await api.post<CrawlResult>("/crawl", null, {
      params: { 
        school_id: schoolId 
      }
    });
    return response.data;
  },

  // Trigger discovery crawler (find new schools)
  crawlDiscover: async () => {
    const response = await api.post<CrawlResult>("/crawl", null, {
      params: { 
        action: "discover" 
      }
    });
    return response.data;
  },

  // Trigger batch crawler for a district and banding
  crawlBatch: async (district: string, banding: string) => {
    const response = await api.post<CrawlResult>("/crawl", null, {
      params: { 
        district,
        banding
      }
    });
    return response.data;
  }
};
