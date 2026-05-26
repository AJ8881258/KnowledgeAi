import { isAxiosError } from "axios";

import type { DocumentResponse } from "@/api/documents";
import { allowedExtensions, maxFileSize } from "./document-data";
import type { DocumentItem, DocumentType } from "./document-types";

export function getExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

export function getDocumentType(filename: string): DocumentType {
  const ext = getExtension(filename);

  if (ext === ".pdf") {
    return "PDF";
  }

  if (ext === ".md" || ext === ".markdown") {
    return "Markdown";
  }

  if (ext === ".txt") {
    return "TXT";
  }

  if (ext === ".docx") {
    return "DOCX";
  }

  if (ext === ".html" || ext === ".htm") {
    return "HTML";
  }

  return "Unknown";
}

export function mapDocument(item: DocumentResponse): DocumentItem {
  return {
    ...item,
    type: getDocumentType(item.originalFilename),
  };
}

export function isAllowedFile(file: File): boolean {
  const ext = getExtension(file.name);
  return (
    allowedExtensions.includes(ext) &&
    file.size > 0 &&
    file.size <= maxFileSize
  );
}

export function getFileValidationMessage(file: File) {
  const ext = getExtension(file.name);

  if (!allowedExtensions.includes(ext)) {
    return "仅支持 TXT、Markdown、文本型 PDF、DOCX、HTML；暂不支持 .doc、PPT、Excel 和扫描版 PDF OCR";
  }

  if (file.size === 0) {
    return "文件为空，请选择有内容的文档";
  }

  if (file.size > maxFileSize) {
    return "单文件最大 10MB";
  }

  return "";
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

export function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value || "-";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function getApiErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const responseMessage = error.response?.data as
      | { message?: unknown }
      | undefined;
    const backendMessage =
      typeof responseMessage?.message === "string"
        ? responseMessage.message
        : "";

    if (error.response?.status === 400) {
      return (
        backendMessage ||
        "请求错误，请检查文件类型、大小、文本内容，或确认 PDF/DOCX/HTML 可提取有效文本；扫描版 PDF 暂不支持 OCR"
      );
    }

    if (error.response?.status === 404) {
      return backendMessage || "知识库或文档不存在，或你没有访问权限";
    }

    if (error.response?.status === 403) {
      return backendMessage || "当前角色无权执行此操作";
    }

    if (!error.response) {
      return "无法连接文档服务，请确认后端已启动";
    }

    if (error.response.status >= 500) {
      return backendMessage || "文档服务异常，请稍后重试";
    }
  }

  return "操作失败，请稍后重试";
}

export function getPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage]);

  if (currentPage > 1) pages.add(currentPage - 1);
  if (currentPage < totalPages) pages.add(currentPage + 1);
  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 3);
    pages.add(totalPages - 2);
    pages.add(totalPages - 1);
  }

  const sortedPages = Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  return sortedPages.reduce<Array<number | "ellipsis">>((items, page, index) => {
    const previous = sortedPages[index - 1];
    if (previous && page - previous > 1) {
      items.push("ellipsis");
    }
    items.push(page);
    return items;
  }, []);
}
