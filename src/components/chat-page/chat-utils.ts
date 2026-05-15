import type { ConversationItem } from "./chat-types";

export function getLatestConversation(items: ConversationItem[]) {
  return [...items].sort(
    (first, second) =>
      new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime(),
  )[0];
}

export function getNowTime() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

export function createLocalId(prefix: string) {
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Date.now());

  return `${prefix}-${randomId}`;
}

export function createEmptyConversation(): ConversationItem {
  const now = new Date();

  return {
    id: createLocalId("chat"),
    title: "新的会话",
    time: getNowTime(),
    updatedAt: now.toISOString(),
    sourceCount: 0,
    favorite: false,
    messages: [],
  };
}
