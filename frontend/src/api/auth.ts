import api from "./client";

export interface LoginRequest {
  identifier: string; // Phone or Email
}

export interface VerifyRequest {
  identifier: string;
  code: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    identifier: string;
    role: "parent" | "admin";
  };
}

export const authApi = {
  // Step 1: Request OTP
  login: async (identifier: string) => {
    const response = await api.post("/auth/login", { identifier });
    return response.data;
  },

  // Step 2: Verify OTP & Get Token
  verify: async (data: VerifyRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/auth/verify", data);
    return response.data;
  },
};
