import type { DocumentResponse } from "@/api/documents";
import type { KnowledgeBaseAccessRole } from "@/api/knowledge-bases";
import type { KnowledgeBaseResponse } from "@/api/knowledge-bases";
import { knowledgeBaseThemePresets } from "./knowledge-base-data";
import type { DetailDocument, DetailDocumentTab, KnowledgeBase, KnowledgeBaseSortMode, SortDirection } from "./knowledge-base-types";

export function getKnowledgeBaseStatus(status: string): KnowledgeBase["status"] {
  const normalizedStatus = status.trim().toUpperCase();

  if (normalizedStatus === "ACTIVE") {
    return "indexed";
  }

  if (normalizedStatus === "FAILED") {
    return "failed";
  }

  return "processing";
}

export function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(value);
}

export function formatCompactDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value || "-";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "-";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function getDocumentType(filename: string) {
  const dot = filename.lastIndexOf(".");
  const extension = dot >= 0 ? filename.slice(dot + 1).toLowerCase() : "";

  return extension || "file";
}

export function mapDetailDocument(item: DocumentResponse): DetailDocument {
  return {
    ...item,
    type: getDocumentType(item.originalFilename),
  };
}

export function getInitials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  return value.trim().slice(0, 2).toUpperCase() || "KB";
}

export function getKnowledgeBaseTheme(themeId: string | null) {
  const normalizedThemeId = themeId?.trim();
  const legacyThemeId =
    normalizedThemeId === "sky"
      ? "blue"
      : normalizedThemeId === "emerald"
        ? "green"
        : normalizedThemeId || "blue";
  const matchedTheme = knowledgeBaseThemePresets.find(
    (preset) => preset.id === legacyThemeId,
  );

  return matchedTheme ?? knowledgeBaseThemePresets[0];
}

function getAccessRole(item: KnowledgeBaseResponse): KnowledgeBaseAccessRole {
  if (
    item.accessRole === "OWNER" ||
    item.accessRole === "EDITOR" ||
    item.accessRole === "VIEWER"
  ) {
    return item.accessRole;
  }

  return item.ownedByMe === false ? "VIEWER" : "OWNER";
}

export function mapKnowledgeBaseResponse(
  item: KnowledgeBaseResponse,
): KnowledgeBase {
  const themePreset = getKnowledgeBaseTheme(item.themeId);
  const updatedAtDate = new Date(item.updatedAt);
  const accessRole = getAccessRole(item);
  const ownedByMe = item.ownedByMe === true || accessRole === "OWNER";
  const sharedWithMe = item.sharedWithMe === true || !ownedByMe;

  return {
    id: String(item.id),
    slug: String(item.id),
    name: item.name,
    description: item.description ?? "",
    owner: ownedByMe ? "我创建的知识库" : "共享给我的知识库",
    docs: 0,
    chunks: 0,
    sources: 0,
    updatedAt: Number.isNaN(updatedAtDate.getTime())
      ? item.updatedAt
      : formatDateTime(updatedAtDate),
    createdAt: item.createdAt,
    status: getKnowledgeBaseStatus(item.status),
    theme: {
      icon: getInitials(item.name),
      iconClass: themePreset.iconClass,
      coverClass: themePreset.coverClass,
      coverAccent: themePreset.coverAccent,
    },
    recent: true,
    featured: item.featured,
    createdByMe: ownedByMe,
    accessRole,
    ownedByMe,
    sharedWithMe,
  };
}

export function getCreatedTime(item: KnowledgeBase) {
  return new Date(item.createdAt).getTime();
}

export function sortKnowledgeBases(
  items: KnowledgeBase[],
  mode: KnowledgeBaseSortMode,
  direction: SortDirection,
) {
  return [...items].sort((first, second) => {
    if (mode === "recent" && first.recent !== second.recent) {
      return first.recent ? -1 : 1;
    }

    const firstTime = getCreatedTime(first);
    const secondTime = getCreatedTime(second);

    return direction === "desc" ? secondTime - firstTime : firstTime - secondTime;
  });
}

export function getDocumentCountByTab(
  items: DetailDocument[],
  tab: DetailDocumentTab,
) {
  if (tab === "all") {
    return items.length;
  }

  if (tab === "processing") {
    return items.filter(
      (item) => item.status === "PROCESSING" || item.status === "UPLOADED",
    ).length;
  }

  return items.filter((item) => item.status === "FAILED").length;
}

export function getFilteredDocuments(
  items: DetailDocument[],
  tab: DetailDocumentTab,
) {
  if (tab === "all") {
    return items;
  }

  if (tab === "processing") {
    return items.filter(
      (item) => item.status === "PROCESSING" || item.status === "UPLOADED",
    );
  }

  return items.filter((item) => item.status === "FAILED");
}

export function searchKnowledgeBases(items: KnowledgeBase[], keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return items;
  }

  return items.filter((item) =>
    [item.name, item.description, item.owner, item.slug]
      .join(" ")
      .toLowerCase()
      .includes(normalizedKeyword),
  );
}
