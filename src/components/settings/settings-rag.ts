export type RagSettings = {
  chunkSize: number;
  chunkOverlap: number;
  topK: number;
  citationLimit: number;
  similarityMetric: "cosine" | "dot" | "euclidean";
};

export type RagNumberKey = "chunkSize" | "chunkOverlap" | "topK" | "citationLimit";

const RAG_SETTINGS_STORAGE_KEY = "knowflow-rag-settings";

export const defaultRagSettings: RagSettings = {
  chunkSize: 800,
  chunkOverlap: 120,
  topK: 6,
  citationLimit: 4,
  similarityMetric: "cosine",
};

export const ragControlConfig: Record<
  RagNumberKey,
  { label: string; min: number; max: number; step?: number }
> = {
  chunkSize: {
    label: "Chunk Size",
    min: 200,
    max: 2000,
  },
  chunkOverlap: {
    label: "Chunk Overlap",
    min: 0,
    max: 400,
  },
  topK: {
    label: "Top K（检索数量）",
    min: 1,
    max: 20,
  },
  citationLimit: {
    label: "Citation Limit",
    min: 1,
    max: 10,
  },
};

export function clampNumber(value: number, min: number, max: number) {
  if (Number.isNaN(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

export function readStoredRagSettings(): RagSettings {
  if (typeof window === "undefined") {
    return defaultRagSettings;
  }

  const storedSettings = window.localStorage.getItem(RAG_SETTINGS_STORAGE_KEY);

  if (!storedSettings) {
    return defaultRagSettings;
  }

  try {
    const parsed = JSON.parse(storedSettings) as Partial<RagSettings>;
    const similarityMetric =
      parsed.similarityMetric === "dot" || parsed.similarityMetric === "euclidean"
        ? parsed.similarityMetric
        : "cosine";

    return {
      chunkSize: clampNumber(
        Number(parsed.chunkSize),
        ragControlConfig.chunkSize.min,
        ragControlConfig.chunkSize.max,
      ),
      chunkOverlap: clampNumber(
        Number(parsed.chunkOverlap),
        ragControlConfig.chunkOverlap.min,
        ragControlConfig.chunkOverlap.max,
      ),
      topK: clampNumber(
        Number(parsed.topK),
        ragControlConfig.topK.min,
        ragControlConfig.topK.max,
      ),
      citationLimit: clampNumber(
        Number(parsed.citationLimit),
        ragControlConfig.citationLimit.min,
        ragControlConfig.citationLimit.max,
      ),
      similarityMetric,
    };
  } catch {
    window.localStorage.removeItem(RAG_SETTINGS_STORAGE_KEY);
    return defaultRagSettings;
  }
}

export function persistRagSettings(settings: RagSettings) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    RAG_SETTINGS_STORAGE_KEY,
    JSON.stringify(settings),
  );
}
