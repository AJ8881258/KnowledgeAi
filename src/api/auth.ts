import { http } from "@/api/http";

export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponse = {
  id: number;
  username: string;
  role: string;
};

export type RegisterRequest = {
  username: string;
  password: string;
};

export type RegisterResponse = LoginResponse;

export async function login(request: LoginRequest) {
  const response = await http.post<LoginResponse>("/auth/login", request);

  return response.data;
}

export async function register(request: RegisterRequest) {
  const response = await http.post<RegisterResponse>("/auth/register", request);

  return response.data;
}
