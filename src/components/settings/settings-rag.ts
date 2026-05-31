import type {
  RagRetrievalMode,
  RagSettingsResponse,
  UpdateRagSettingsRequest,
} from "@/api/settings";

export type RagNumberKey = "topK" | "maxContextChunks" | "temperature";

export const defaultRagSettings: RagSettingsResponse = {
  topK: 5,
  maxContextChunks: 5,
  temperature: 0.2,
  retrievalMode: "HYBRID",
  semanticWeight: 0.7,
  fulltextWeight: 0.3,
};

export const ragRetrievalModes: Array<{
  value: RagRetrievalMode;
  label: string;
  helper: string;
}> = [
  {
    value: "HYBRID",
    label: "HYBRID",
    helper: "语义向量和全文关键词混合检索，适合大多数问答场景。",
  },
  {
    value: "FULLTEXT",
    label: "FULLTEXT",
    helper: "仅使用全文关键词检索，适合调试语义索引或禁用向量检索时使用。",
  },
];

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

function normalizeRetrievalMode(
  retrievalMode?: string | null,
): RagRetrievalMode {
  return retrievalMode === "FULLTEXT" ? "FULLTEXT" : "HYBRID";
}

export function normalizeRagSettings(
  settings: Partial<RagSettingsResponse> | null | undefined,
): RagSettingsResponse {
  const retrievalMode = normalizeRetrievalMode(settings?.retrievalMode);
  const semanticWeight =
    retrievalMode === "FULLTEXT"
      ? 0
      : Number(
          clampNumber(
            Number(settings?.semanticWeight ?? defaultRagSettings.semanticWeight),
            0,
            1,
          ).toFixed(2),
        );

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
    retrievalMode,
    semanticWeight,
    fulltextWeight: Number((1 - semanticWeight).toFixed(2)),
  };
}

export function toUpdateRagSettingsRequest(
  settings: RagSettingsResponse,
): UpdateRagSettingsRequest {
  const normalizedSettings = normalizeRagSettings(settings);

  return {
    topK: normalizedSettings.topK,
    maxContextChunks: normalizedSettings.maxContextChunks,
    temperature: normalizedSettings.temperature,
    retrievalMode: normalizedSettings.retrievalMode,
    semanticWeight: normalizedSettings.semanticWeight,
    fulltextWeight: normalizedSettings.fulltextWeight,
  };
}
