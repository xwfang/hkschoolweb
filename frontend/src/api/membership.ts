import api from "./client";

export interface Plan {
  id: number;
  name: string;
  price: number;
  duration_days: number;
  description: string;
}

export interface CreateOrderRequest {
  plan_id: number;
  payment_remark: string;
}

export interface CreateOrderResponse {
  message: string;
  order_id: string;
  vip_expire_at?: string;
}

export interface Order {
  id: number; // Internal ID
  order_id: string; // Public ID YYYYMMDDHH-XXXXXX
  user_id: number;
  plan_id: number;
  amount: number;
  status: "pending" | "confirmed" | "rejected";
  payment_remark: string;
  created_at: string;
  user?: {
    identifier: string;
  };
  plan?: Plan;
}

export const membershipApi = {
  getPlans: async () => {
    const response = await api.get<Plan[]>("/plans");
    return response.data;
  },
  
  createOrder: async (data: CreateOrderRequest) => {
    const response = await api.post<CreateOrderResponse>("/orders", data);
    return response.data;
  },

  // Admin Only
  listOrders: async () => {
    const response = await api.get<Order[]>("/orders");
    return response.data;
  },

  reviewOrder: async (id: number, action: "confirm" | "reject") => {
    const response = await api.post(`/orders/${id}/review`, { action });
    return response.data;
  }
};
