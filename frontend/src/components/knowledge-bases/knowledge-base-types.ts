import type { DocumentResponse } from "@/api/documents";
import type { KnowledgeBaseAccessRole } from "@/api/knowledge-bases";

export type KnowledgeBase = {
  id: string;
  slug: string;
  name: string;
  description: string;
  owner: string;
  docs: number;
  chunks: number;
  sources: number;
  updatedAt: string;
  createdAt: string;
  status: "indexed" | "processing" | "failed";
  theme: {
    icon: string;
    iconClass: string;
    coverClass: string;
    coverAccent: string;
  };
  recent: boolean;
  featured: boolean;
  createdByMe: boolean;
  accessRole: KnowledgeBaseAccessRole;
  ownedByMe: boolean;
  sharedWithMe: boolean;
};

export type KnowledgeBaseTab = "all" | "mine" | "shared" | "featured";
export type KnowledgeBaseViewMode = "card" | "list";
export type KnowledgeBaseSortMode = "recent" | "createdTime";
export type SortDirection = "asc" | "desc";
export type DetailDocumentTab = "all" | "processing" | "failed";

export type KnowledgeBaseThemePreset = {
  id: string;
  label: string;
  iconClass: string;
  coverClass: string;
  coverAccent: string;
};

export type NewKnowledgeBaseForm = {
  title: string;
  description: string;
  featured: boolean;
  themeId: string;
};

export type DetailDocument = DocumentResponse & {
  type: string;
};
