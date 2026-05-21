import { http } from "@/api/http";

export type ModelSettingsResponse = {
  configured: boolean;
  mode: string;
  model: string | null;
  baseUrlConfigured: boolean;
  apiKeyConfigured: boolean;
  timeoutSeconds: number | null;
  editable: boolean;
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
