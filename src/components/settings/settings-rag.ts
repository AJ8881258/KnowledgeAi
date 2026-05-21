import type {
  RagSettingsResponse,
  UpdateRagSettingsRequest,
} from "@/api/settings";

export type RagNumberKey = keyof RagSettingsResponse;

export const defaultRagSettings: RagSettingsResponse = {
  topK: 5,
  maxContextChunks: 5,
  temperature: 0.2,
};

export const ragControlConfig: Record<
  RagNumberKey,
  { label: string; helper: string; min: number; max: number; step?: number }
> = {
  topK: {
    label: "Top K",
    helper: "控制检索阶段最多召回多少个候选片段。",
    min: 1,
    max: 20,
  },
  maxContextChunks: {
    label: "上下文片段数",
    helper: "控制最终放入 Prompt 的片段数量。",
    min: 1,
    max: 20,
  },
  temperature: {
    label: "Temperature",
    helper: "控制模型回答的发散程度，越低越稳定。",
    min: 0,
    max: 2,
    step: 0.1,
  },
};

export function clampNumber(value: number, min: number, max: number) {
  if (Number.isNaN(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

export function normalizeRagSettings(
  settings: Partial<RagSettingsResponse> | null | undefined,
): RagSettingsResponse {
  return {
    topK: Math.round(
      clampNumber(
        Number(settings?.topK ?? defaultRagSettings.topK),
        ragControlConfig.topK.min,
        ragControlConfig.topK.max,
      ),
    ),
    maxContextChunks: Math.round(
      clampNumber(
        Number(
          settings?.maxContextChunks ?? defaultRagSettings.maxContextChunks,
        ),
        ragControlConfig.maxContextChunks.min,
        ragControlConfig.maxContextChunks.max,
      ),
    ),
    temperature: Number(
      clampNumber(
        Number(settings?.temperature ?? defaultRagSettings.temperature),
        ragControlConfig.temperature.min,
        ragControlConfig.temperature.max,
      ).toFixed(1),
    ),
  };
}

export function toUpdateRagSettingsRequest(
  settings: RagSettingsResponse,
): UpdateRagSettingsRequest {
  return {
    topK: settings.topK,
    maxContextChunks: settings.maxContextChunks,
    temperature: settings.temperature,
  };
}
