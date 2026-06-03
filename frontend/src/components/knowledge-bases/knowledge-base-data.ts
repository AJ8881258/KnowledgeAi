import type { DocumentStatus as BackendDocumentStatus } from "@/api/documents";
import type { KnowledgeBaseTab, KnowledgeBaseThemePreset } from "./knowledge-base-types";

export const knowledgeBaseTabs: {
  value: KnowledgeBaseTab;
  label: string;
  title: string;
  empty: string;
}[] = [
  {
    value: "all",
    label: "全部",
    title: "全部知识库",
    empty: "暂无知识库",
  },
  {
    value: "mine",
    label: "我的知识库",
    title: "我的知识库",
    empty: "暂无我的知识库",
  },
  {
    value: "shared",
    label: "共享给我",
    title: "共享给我的知识库",
    empty: "暂无共享给我的知识库",
  },
  {
    value: "featured",
    label: "精选知识库",
    title: "精选知识库",
    empty: "暂无精选知识库",
  },
];

export const knowledgeBaseThemePresets: KnowledgeBaseThemePreset[] = [
  {
    id: "blue",
    label: "蓝色",
    iconClass: "bg-blue-100 text-blue-700 ring-blue-200",
    coverClass: "from-sky-50 via-white to-blue-100",
    coverAccent: "bg-sky-400",
  },
  {
    id: "violet",
    label: "紫色",
    iconClass: "bg-violet-100 text-violet-700 ring-violet-200",
    coverClass: "from-violet-50 via-white to-fuchsia-100",
    coverAccent: "bg-violet-400",
  },
  {
    id: "green",
    label: "绿色",
    iconClass: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    coverClass: "from-emerald-50 via-white to-teal-100",
    coverAccent: "bg-emerald-400",
  },
  {
    id: "amber",
    label: "橙色",
    iconClass: "bg-amber-100 text-amber-700 ring-amber-200",
    coverClass: "from-amber-50 via-white to-orange-100",
    coverAccent: "bg-amber-400",
  },
  {
    id: "rose",
    label: "红色",
    iconClass: "bg-rose-100 text-rose-700 ring-rose-200",
    coverClass: "from-rose-50 via-white to-slate-100",
    coverAccent: "bg-rose-400",
  },
];

export const documentStatusStyles: Record<BackendDocumentStatus, string> = {
  UPLOADED: "border-slate-200 bg-slate-50 text-slate-700",
  PROCESSING: "border-blue-200 bg-blue-50 text-blue-700",
  INDEXED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  FAILED: "border-red-200 bg-red-50 text-red-700",
};

export const documentStatusCopy: Record<BackendDocumentStatus, string> = {
  UPLOADED: "已上传",
  PROCESSING: "处理中",
  INDEXED: "已索引",
  FAILED: "失败",
};

export const kbStatusCopy = {
  indexed: "已索引",
  processing: "处理中",
  failed: "失败",
};
