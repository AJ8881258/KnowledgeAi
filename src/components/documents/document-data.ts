import type { DocumentStatus } from "@/api/documents";
import type { DocumentType, PageSize, StatusFilter, TypeTab } from "./document-types";

export const typeFilters: TypeTab[] = ["全部", "PDF", "Markdown", "TXT"];
export const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "全部状态" },
  { value: "UPLOADED", label: "已上传" },
  { value: "PROCESSING", label: "处理中" },
  { value: "INDEXED", label: "已索引" },
  { value: "FAILED", label: "失败" },
];
export const pageSizeOptions: PageSize[] = [20, 50, 100];
export const allowedExtensions = [".txt", ".md", ".markdown", ".pdf"];
export const maxFileSize = 10 * 1024 * 1024;

export const statusMeta: Record<
  DocumentStatus,
  {
    dotClass: string;
    textClass: string;
    badgeClass: string;
    label: string;
  }
> = {
  UPLOADED: {
    dotClass: "bg-slate-500",
    textClass: "text-slate-600",
    badgeClass: "border-slate-200 bg-slate-50 text-slate-700",
    label: "已上传",
  },
  PROCESSING: {
    dotClass: "bg-blue-500",
    textClass: "text-blue-700",
    badgeClass: "border-blue-200 bg-blue-50 text-blue-700",
    label: "处理中",
  },
  INDEXED: {
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-700",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    label: "已索引",
  },
  FAILED: {
    dotClass: "bg-red-500",
    textClass: "text-red-700",
    badgeClass: "border-red-200 bg-red-50 text-red-700",
    label: "失败",
  },
};

export const typeMeta: Record<
  DocumentType,
  {
    className: string;
    shortLabel: string;
    label: string;
  }
> = {
  PDF: {
    className: "bg-red-600 text-white",
    shortLabel: "PDF",
    label: "PDF",
  },
  Markdown: {
    className: "bg-slate-900 text-white",
    shortLabel: "MD",
    label: "Markdown",
  },
  TXT: {
    className: "bg-blue-600 text-white",
    shortLabel: "TXT",
    label: "TXT",
  },
  Unknown: {
    className: "bg-slate-500 text-white",
    shortLabel: "FILE",
    label: "未知",
  },
};
