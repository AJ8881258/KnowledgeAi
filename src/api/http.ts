import axios from "axios";

import { getAuthSession } from "@/lib/mock-auth";

export const http = axios.create({
  baseURL: "/api",
  timeout: 30000,
});

http.interceptors.request.use((config) => {
  const token = getAuthSession()?.token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error),
);
