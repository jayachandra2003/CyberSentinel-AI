import { apiClient } from "./client";
import { ApiResponse, User } from "@/types";

export const userService = {
  async getProfile(): Promise<ApiResponse<User>> {
    const res = await apiClient.get("/users/me");
    return res.data;
  },
};
