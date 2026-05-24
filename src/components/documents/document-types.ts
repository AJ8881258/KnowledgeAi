import type { DocumentResponse, DocumentStatus } from "@/api/documents";

export type DocumentType = "PDF" | "Markdown" | "TXT" | "DOCX" | "HTML" | "Unknown";
export type PageSize = 20 | 50 | 100;
export type TypeTab = "全部" | "PDF" | "Markdown" | "TXT" | "DOCX" | "HTML";
export type StatusFilter = "ALL" | DocumentStatus;

export type DocumentItem = DocumentResponse & {
  type: DocumentType;
};
