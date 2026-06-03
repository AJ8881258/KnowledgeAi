import type { KnowledgeBase } from "./knowledge-base-types";

export const knowledgeBaseRoleCopy = {
  OWNER: "拥有者",
  EDITOR: "可编辑",
  VIEWER: "只读",
} as const;

export function canEditKnowledgeBase(item: KnowledgeBase) {
  return item.accessRole === "OWNER" || item.accessRole === "EDITOR";
}

export function canDeleteKnowledgeBase(item: KnowledgeBase) {
  return item.accessRole === "OWNER";
}

export function canManageKnowledgeBaseMembers(item: KnowledgeBase) {
  return item.accessRole === "OWNER";
}

export function canMutateKnowledgeBaseDocuments(item: KnowledgeBase) {
  return item.accessRole === "OWNER" || item.accessRole === "EDITOR";
}
