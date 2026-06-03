import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type KnowledgeBaseUsageState = {
  recentKnowledgeBaseId: string | null;
  rememberKnowledgeBase: (knowledgeBaseId: number | string) => void;
  clearRecentKnowledgeBase: () => void;
};

export const useKnowledgeBaseUsageStore = create<KnowledgeBaseUsageState>()(
  persist(
    (set) => ({
      recentKnowledgeBaseId: null,
      rememberKnowledgeBase: (knowledgeBaseId) =>
        set({ recentKnowledgeBaseId: String(knowledgeBaseId) }),
      clearRecentKnowledgeBase: () => set({ recentKnowledgeBaseId: null }),
    }),
    {
      name: "knowflow-recent-knowledge-base",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
