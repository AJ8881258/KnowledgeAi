import { isAxiosError } from "axios";
import { create } from "zustand";

import { getChatUsageToday, getKnowledgeBaseChatSessions } from "@/api/chat";
import { getKnowledgeBases } from "@/api/knowledge-bases";
import { getUserPreferences } from "@/api/settings";

const DEFAULT_TIMEZONE = "Asia/Shanghai";

function getBrowserTimezone() {
  if (typeof Intl === "undefined") {
    return DEFAULT_TIMEZONE;
  }

  return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
}

function shouldIgnoreStatsError(error: unknown) {
  return isAxiosError(error) && error.response?.status === 401;
}

type ChatStatusState = {
  unreadCount: number;
  todayMessageCount: number;
  timezone: string;
  loadingUnreadCount: boolean;
  loadingTodayUsage: boolean;
  setTimezone: (timezone: string) => void;
  setUnreadCount: (count: number) => void;
  refreshUnreadCount: () => Promise<void>;
  refreshTodayUsage: (timezone?: string) => Promise<void>;
};

export const useChatStatusStore = create<ChatStatusState>((set, get) => ({
  unreadCount: 0,
  todayMessageCount: 0,
  timezone: getBrowserTimezone(),
  loadingUnreadCount: false,
  loadingTodayUsage: false,
  setTimezone: (timezone) => {
    if (timezone.trim()) {
      set({ timezone: timezone.trim() });
    }
  },
  setUnreadCount: (count) => {
    set({ unreadCount: Math.max(0, count) });
  },
  refreshUnreadCount: async () => {
    set({ loadingUnreadCount: true });

    try {
      const knowledgeBases = await getKnowledgeBases();
      const sessionGroups = await Promise.all(
        knowledgeBases.map(async (knowledgeBase) => {
          try {
            return await getKnowledgeBaseChatSessions(knowledgeBase.id);
          } catch (error) {
            if (isAxiosError(error) && [403, 404].includes(error.response?.status ?? 0)) {
              return [];
            }

            throw error;
          }
        }),
      );
      const unreadCount = sessionGroups.flat().filter((session) => session.unread).length;

      set({ unreadCount });
    } catch (error) {
      if (!shouldIgnoreStatsError(error)) {
        set({ unreadCount: get().unreadCount });
      }
    } finally {
      set({ loadingUnreadCount: false });
    }
  },
  refreshTodayUsage: async (timezone) => {
    set({ loadingTodayUsage: true });

    try {
      const preferredTimezone =
        timezone?.trim() ||
        get().timezone ||
        (await getUserPreferences()).timezone ||
        getBrowserTimezone();
      const usage = await getChatUsageToday(preferredTimezone);

      set({
        todayMessageCount: usage.messageCount,
        timezone: usage.timezone || preferredTimezone,
      });
    } catch (error) {
      if (!shouldIgnoreStatsError(error)) {
        set({ todayMessageCount: get().todayMessageCount });
      }
    } finally {
      set({ loadingTodayUsage: false });
    }
  },
}));
