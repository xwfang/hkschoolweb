import api from "./client";
import type { School } from "./schools";

export interface ChatResponse {
  message: string;
  schools?: School[];
  action?: "search" | "chat" | "info";
}

export const aiApi = {
  // 5.1 Chat with AI
  chat: async (message: string) => {
    const response = await api.post<ChatResponse>("/chat", { message });
    return response.data;
  },

  // 5.2 Upload Resume (for Chat context)
  uploadResume: async (resumeText: string) => {
    const response = await api.post("/chat/resume", { resume_text: resumeText });
    return response.data;
  }
};
