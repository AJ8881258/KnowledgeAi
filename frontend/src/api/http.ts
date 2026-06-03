import axios from "axios";

import { useAuthStore } from "@/store/auth";

export const http = axios.create({
  baseURL: "/api",
  timeout: 30000,
});

http.interceptors.request.use((config) => {
  const session = useAuthStore.getState().session;

  if (session?.accessToken) {
    config.headers.Authorization = `${session.tokenType} ${session.accessToken}`;
  }

  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error),
);
