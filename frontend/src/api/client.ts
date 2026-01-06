import axios from "axios";
import i18n from "@/i18n/config"; // Import i18n instance

// Create Axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api/v1", // Use env var or default to relative path
  timeout: 60000, // Increased timeout to 60s for AI endpoints
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for adding Auth Token and Language
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add Accept-Language header based on current i18n language
    config.headers["Accept-Language"] = i18n.language || "en";

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling errors (e.g., 401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login if 401
      localStorage.removeItem("token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
