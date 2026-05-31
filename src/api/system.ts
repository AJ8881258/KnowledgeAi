import { http } from "@/api/http";

export type SystemDiagnosticsResponse = {
  status: string;
  database: {
    reachable: boolean;
  };
  jobs: {
    activeCount: number;
    failedCount: number;
  };
  model: {
    chatFallbackConfigured: boolean;
    embeddingFallbackConfigured: boolean;
  };
  generatedAt: string;
};

export async function getSystemDiagnostics() {
  const response =
    await http.get<SystemDiagnosticsResponse>("/system/diagnostics");

  return response.data;
}
