import { http } from "@/api/http";

export type ModelSettingsResponse = {
  configured: boolean;
  model: string | null;
  baseUrl: string | null;
  baseUrlConfigured: boolean;
  apiKeyConfigured: boolean;
  timeoutSeconds: number | null;
  updatedAt: string | null;
};

export type UpdateModelSettingsRequest = {
  baseUrl: string;
  apiKey?: string;
  model: string;
  timeoutSeconds: number;
};

export type ModelListItem = {
  id: string;
  name: string;
};

export type ModelListResponse = {
  models: ModelListItem[];
};

export type FetchModelListRequest = {
  baseUrl?: string;
  apiKey?: string;
};

export type UserPreferenceResponse = {
  language: string;
  timezone: string;
};

export type UpdateUserPreferenceRequest = UserPreferenceResponse;

export type ModelConnectionTestRequest = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type RagSettingsResponse = {
  topK: number;
  maxContextChunks: number;
  temperature: number;
};

export type UpdateRagSettingsRequest = Partial<RagSettingsResponse>;

export async function getModelSettings() {
  const response = await http.get<ModelSettingsResponse>("/settings/model");

  return response.data;
}

export async function updateModelSettings(request: UpdateModelSettingsRequest) {
  const response = await http.patch<ModelSettingsResponse>(
    "/settings/model",
    request,
  );

  return response.data;
}

export async function fetchModelList(request: FetchModelListRequest) {
  const response = await http.post<ModelListResponse>(
    "/settings/model/models",
    request,
  );

  return response.data;
}

export async function getUserPreferences() {
  const response =
    await http.get<UserPreferenceResponse>("/settings/preferences");

  return response.data;
}

export async function updateUserPreferences(
  request: UpdateUserPreferenceRequest,
) {
  const response = await http.patch<UserPreferenceResponse>(
    "/settings/preferences",
    request,
  );

  return response.data;
}

export async function getRagSettings() {
  const response = await http.get<RagSettingsResponse>("/settings/rag");

  return response.data;
}

export async function updateRagSettings(request: UpdateRagSettingsRequest) {
  const response = await http.patch<RagSettingsResponse>(
    "/settings/rag",
    request,
  );

  return response.data;
}
