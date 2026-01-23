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
  order_id: number;
  status: string;
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
};
