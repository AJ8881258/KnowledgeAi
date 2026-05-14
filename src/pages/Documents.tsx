import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { isAxiosError } from "axios";
import { useLocation, useNavigate, useParams } from "react-router";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Eye,
  FileText,
  Loader2,
  MessageCircle,
  RefreshCw,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  deleteDocument,
  getDocument,
  getDocumentChunks,
  getKnowledgeBaseDocuments,
  uploadKnowledgeBaseDocument,
  type DocumentChunkResponse,
  type DocumentResponse,
  type DocumentStatus,
} from "@/api/documents";
import {
  getKnowledgeBases,
  type KnowledgeBaseResponse,
} from "@/api/knowledge-bases";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { clearMockAuthSession } from "@/lib/mock-auth";
import { cn } from "@/lib/utils";

type DocumentType = "PDF" | "Markdown" | "TXT" | "Unknown";
type PageSize = 20 | 50 | 100;
type TypeTab = "全部" | "PDF" | "Markdown" | "TXT";
type StatusFilter = "ALL" | DocumentStatus;

type DocumentItem = DocumentResponse & {
  type: DocumentType;
};

const typeFilters: TypeTab[] = ["全部", "PDF", "Markdown", "TXT"];
const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "全部状态" },
  { value: "UPLOADED", label: "已上传" },
  { value: "PROCESSING", label: "处理中" },
  { value: "INDEXED", label: "已索引" },
  { value: "FAILED", label: "失败" },
];
const pageSizeOptions: PageSize[] = [20, 50, 100];
const allowedExtensions = [".txt", ".md", ".markdown", ".pdf"];
const maxFileSize = 10 * 1024 * 1024;

const statusMeta: Record<
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

const typeMeta: Record<
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

function getExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

function getDocumentType(filename: string): DocumentType {
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

  return "Unknown";
}

function mapDocument(item: DocumentResponse): DocumentItem {
  return {
    ...item,
    type: getDocumentType(item.originalFilename),
  };
}

function isAllowedFile(file: File): boolean {
  const ext = getExtension(file.name);
  return (
    allowedExtensions.includes(ext) &&
    file.size > 0 &&
    file.size <= maxFileSize
  );
}

function getFileValidationMessage(file: File) {
  const ext = getExtension(file.name);

  if (!allowedExtensions.includes(ext)) {
    return "仅支持 TXT、Markdown（.md/.markdown）和文本型 PDF 文件";
  }

  if (file.size === 0) {
    return "文件为空，请选择有内容的文本文件";
  }

  if (file.size > maxFileSize) {
    return "单文件最大 10MB";
  }

  return "";
}

function formatFileSize(bytes: number) {
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

function formatDateTime(value: string) {
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

function getApiErrorMessage(error: unknown) {
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
        "请求错误，请检查文件类型、大小、文本内容，或确认 PDF 可提取文本"
      );
    }

    if (error.response?.status === 404) {
      return backendMessage || "知识库或文档不存在，或你没有访问权限";
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

function getPaginationItems(currentPage: number, totalPages: number) {
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

function FileBadge({ type }: { type: DocumentType }) {
  const meta = typeMeta[type];

  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-[3px] text-[8px] font-bold leading-none",
        meta.className,
      )}
      aria-label={meta.label}
    >
      {meta.shortLabel}
    </span>
  );
}

function SegmentedFilter({
  items,
  activeValue,
  onSelect,
}: {
  items: { value: StatusFilter; label: string }[];
  activeValue: StatusFilter;
  onSelect?: (value: StatusFilter) => void;
}) {
  return (
    <div className="flex h-10 overflow-hidden rounded-[5px] border border-slate-200 bg-white">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onSelect?.(item.value)}
          className={cn(
            "cursor-pointer border-r border-slate-200 px-4 text-sm text-slate-600 transition-colors last:border-r-0 hover:bg-slate-50",
            item.value === activeValue && "bg-blue-50 text-blue-600",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function StatusText({
  status,
  error,
}: {
  status: DocumentStatus;
  error?: string | null;
}) {
  const meta = statusMeta[status];

  return (
    <div className="flex min-w-[120px] flex-col gap-1">
      <div className={cn("flex items-center gap-2 text-sm", meta.textClass)}>
        <span className={cn("size-2 rounded-full", meta.dotClass)} />
        <span>{meta.label}</span>
        {status === "PROCESSING" && <Loader2 className="size-3 animate-spin" />}
      </div>
      {status === "FAILED" && error && (
        <span className="w-fit max-w-[220px] truncate rounded-[5px] border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600">
          {error}
        </span>
      )}
    </div>
  );
}

function IconButton({
  children,
  disabled,
  label,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-xs"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-[5px] border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-300"
    >
      {children}
    </Button>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="min-w-0 text-slate-600">{value}</span>
    </div>
  );
}

function LoadingPanel({ message }: { message: string }) {
  return (
    <div className="flex min-h-[320px] items-center justify-center rounded-[6px] border border-slate-200 bg-white">
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <Loader2 className="size-4 animate-spin text-blue-600" />
        {message}
      </div>
    </div>
  );
}

function EmptyPanel({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[6px] border border-dashed border-slate-300 bg-white px-6 text-center">
      <FileText className="size-9 text-slate-400" />
      <h2 className="mt-4 text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button
          type="button"
          onClick={onAction}
          className="mt-5 h-10 rounded-[6px] bg-blue-600 px-4 text-sm tracking-normal text-white normal-case hover:bg-blue-700"
        >
          {actionLabel}
          <ArrowRight data-icon="inline-end" />
        </Button>
      )}
    </div>
  );
}

function ErrorPanel({
  title,
  description,
  onRetry,
}: {
  title: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[6px] border border-orange-200 bg-orange-50/40 px-6 text-center">
      <TriangleAlert className="size-9 text-orange-500" />
      <h2 className="mt-4 text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
        {description}
      </p>
      {onRetry && (
        <Button
          type="button"
          variant="outline"
          onClick={onRetry}
          className="mt-5 h-10 rounded-[6px] border-orange-200 bg-white px-4 text-sm tracking-normal text-slate-700 normal-case hover:bg-orange-50"
        >
          <RefreshCw data-icon="inline-start" />
          重新加载
        </Button>
      )}
    </div>
  );
}

function DocumentDetails({
  item,
  chunks,
  isLoadingChunks,
  chunkError,
  onLoadChunks,
  onNavigateChat,
  onClose,
}: {
  item: DocumentItem;
  chunks: DocumentChunkResponse[];
  isLoadingChunks: boolean;
  chunkError: string;
  onLoadChunks: () => void;
  onNavigateChat?: () => void;
  onClose?: () => void;
}) {
  const meta = statusMeta[item.status];

  return (
    <aside className="min-h-0 border-t border-slate-200 bg-white xl:border-t-0 xl:border-l">
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between px-5">
          <h2 className="text-lg font-semibold text-slate-900">文档详情</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="关闭详情"
            onClick={onClose}
            className="rounded-[5px] text-slate-500 hover:bg-slate-100"
          >
            <X />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-auto px-5 pb-6">
          <section className="flex flex-col gap-4 border-b border-slate-200 pb-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <FileBadge type={item.type} />
                <span className="truncate text-base font-medium text-slate-900">
                  {item.originalFilename}
                </span>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-[5px] border px-2 py-1 text-xs",
                  meta.badgeClass,
                )}
              >
                {meta.label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                disabled
                className="h-10 rounded-[5px] border-slate-200 bg-white px-4 text-sm font-medium tracking-normal text-slate-500 normal-case"
              >
                <RefreshCw data-icon="inline-start" />
                重新索引待后端支持
              </Button>
              <Button
                type="button"
                onClick={onNavigateChat}
                className="h-10 rounded-[5px] bg-blue-600 px-4 text-sm font-medium tracking-normal text-white normal-case hover:bg-blue-700"
              >
                <MessageCircle data-icon="inline-start" />
                进入问答
              </Button>
            </div>

            <div className="flex flex-col gap-3">
              <DetailRow label="类型" value={typeMeta[item.type].label} />
              <DetailRow label="大小" value={formatFileSize(item.sizeBytes)} />
              <DetailRow label="Content-Type" value={item.contentType || "-"} />
              <DetailRow
                label="状态"
                value={
                  <span
                    className={cn("inline-flex items-center gap-2", meta.textClass)}
                  >
                    <span className={cn("size-2 rounded-full", meta.dotClass)} />
                    {meta.label}
                  </span>
                }
              />
              <DetailRow label="Chunks 数量" value={item.chunkCount} />
              <DetailRow label="上传时间" value={formatDateTime(item.createdAt)} />
              <DetailRow label="更新时间" value={formatDateTime(item.updatedAt)} />
              {item.errorMessage && (
                <DetailRow
                  label="失败原因"
                  value={
                    <span className="text-red-600">{item.errorMessage}</span>
                  }
                />
              )}
            </div>
          </section>

          <section className="border-b border-slate-200 py-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900">
                Chunks 预览
              </h3>
              <span className="text-sm text-slate-500">
                共 {item.chunkCount} 个
              </span>
            </div>

            {chunks.length > 0 ? (
              <div className="flex flex-col gap-3">
                {chunks.slice(0, 5).map((chunk) => (
                  <article
                    key={chunk.chunkIndex}
                    className="rounded-[6px] border border-slate-200 bg-slate-50/60 p-3"
                  >
                    <div className="mb-2 flex items-center gap-2 text-sm">
                      <span className="font-semibold text-blue-600">
                        #{chunk.chunkIndex}
                      </span>
                      <span className="text-slate-600">
                        {chunk.charCount} 字符
                      </span>
                    </div>
                    <p className="line-clamp-4 text-xs leading-5 text-slate-600">
                      {chunk.content}
                    </p>
                    <div className="mt-2 text-xs text-slate-400">
                      {formatDateTime(chunk.createdAt)}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-[6px] border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                {item.chunkCount > 0
                  ? "点击下方按钮查看切片内容。"
                  : "当前文档暂无 chunks。"}
              </div>
            )}

            {chunkError && (
              <p className="mt-3 text-xs leading-5 text-red-600">{chunkError}</p>
            )}
            <Button
              type="button"
              variant="ghost"
              disabled={isLoadingChunks || item.chunkCount === 0}
              onClick={onLoadChunks}
              className="mt-3 h-8 rounded-[5px] px-0 text-sm font-medium tracking-normal text-blue-600 normal-case hover:bg-transparent hover:text-blue-700 disabled:text-slate-400"
            >
              {isLoadingChunks ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <Eye data-icon="inline-start" />
              )}
              查看 chunks
            </Button>
          </section>
        </div>
      </div>
    </aside>
  );
}

function EmptyDocumentDetails() {
  return (
    <aside className="min-h-0 border-t border-slate-200 bg-white xl:border-t-0 xl:border-l">
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 px-6 text-center">
        <FileText className="size-8 text-slate-400" />
        <div>
          <h2 className="text-base font-semibold text-slate-900">暂无文档详情</h2>
          <p className="mt-1 text-sm text-slate-500">
            选择左侧文档后查看状态、大小、上传时间和 chunks 信息。
          </p>
        </div>
      </div>
    </aside>
  );
}

const Documents = () => {
  const { knowledgeBaseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseResponse[]>(
    [],
  );
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [chunks, setChunks] = useState<DocumentChunkResponse[]>([]);
  const [typeTab, setTypeTab] = useState<TypeTab>("全部");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(
    null,
  );
  const [documentToDelete, setDocumentToDelete] = useState<DocumentItem | null>(
    null,
  );
  const [isDragging, setIsDragging] = useState(false);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingKnowledgeBases, setIsLoadingKnowledgeBases] = useState(true);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);
  const [knowledgeBaseLoadError, setKnowledgeBaseLoadError] = useState("");
  const [documentLoadError, setDocumentLoadError] = useState("");
  const [chunkError, setChunkError] = useState("");

  const hasKnowledgeBaseId = Boolean(knowledgeBaseId);
  const currentKnowledgeBase = knowledgeBases.find(
    (item) => String(item.id) === String(knowledgeBaseId),
  );
  const currentKnowledgeBaseLabel = hasKnowledgeBaseId
    ? currentKnowledgeBase?.name ?? `知识库 #${knowledgeBaseId}`
    : "请选择知识库";

  const redirectToLogin = useCallback(() => {
    clearMockAuthSession();
    navigate("/login", {
      replace: true,
      state: { from: location.pathname },
    });
  }, [location.pathname, navigate]);

  const handleApiError = useCallback(
    (error: unknown) => {
      if (isAxiosError(error) && error.response?.status === 401) {
        toast.error("登录状态已失效，请重新登录");
        redirectToLogin();
        return "登录状态已失效，请重新登录";
      }

      const message = getApiErrorMessage(error);
      toast.error(message);
      return message;
    },
    [redirectToLogin],
  );

  const loadKnowledgeBaseOptions = useCallback(async () => {
    setIsLoadingKnowledgeBases(true);
    setKnowledgeBaseLoadError("");

    try {
      const response = await getKnowledgeBases();
      setKnowledgeBases(response);
    } catch (error) {
      setKnowledgeBaseLoadError(handleApiError(error));
    } finally {
      setIsLoadingKnowledgeBases(false);
    }
  }, [handleApiError]);

  const loadDocuments = useCallback(async () => {
    if (!knowledgeBaseId) {
      setDocuments([]);
      setSelectedDocumentId(null);
      setDocumentLoadError("");
      return;
    }

    setIsLoadingDocuments(true);
    setDocumentLoadError("");

    try {
      const response = await getKnowledgeBaseDocuments(knowledgeBaseId);
      const nextDocuments = response.map(mapDocument);

      setDocuments(nextDocuments);
      setSelectedDocumentId((currentId) => {
        if (currentId && nextDocuments.some((doc) => doc.id === currentId)) {
          return currentId;
        }

        return nextDocuments[0]?.id ?? null;
      });
    } catch (error) {
      setDocuments([]);
      setSelectedDocumentId(null);
      setDocumentLoadError(handleApiError(error));
    } finally {
      setIsLoadingDocuments(false);
    }
  }, [handleApiError, knowledgeBaseId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadKnowledgeBaseOptions();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadKnowledgeBaseOptions]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDocuments();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadDocuments]);

  const resetDocumentView = () => {
    setCurrentPage(1);
    setChunks([]);
    setChunkError("");
  };

  const handleTypeTabChange = (value: TypeTab) => {
    setTypeTab(value);
    resetDocumentView();
  };

  const handleStatusFilterChange = (value: StatusFilter) => {
    setStatusFilter(value);
    resetDocumentView();
  };

  const handlePageSizeChange = (value: PageSize) => {
    setPageSize(value);
    resetDocumentView();
  };

  const typeFiltered =
    typeTab === "全部"
      ? documents
      : documents.filter((doc) => doc.type === typeTab);

  const filteredDocuments =
    statusFilter === "ALL"
      ? typeFiltered
      : typeFiltered.filter((doc) => doc.status === statusFilter);

  const totalItems = filteredDocuments.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * pageSize;
  const displayedDocuments = filteredDocuments.slice(
    pageStartIndex,
    pageStartIndex + pageSize,
  );
  const displayStart = totalItems === 0 ? 0 : pageStartIndex + 1;
  const displayEnd = Math.min(pageStartIndex + displayedDocuments.length, totalItems);
  const paginationItems = getPaginationItems(safeCurrentPage, totalPages);
  const selectedDocument =
    documents.find((doc) => doc.id === selectedDocumentId) ??
    displayedDocuments[0] ??
    null;

  const selectDocument = async (doc: DocumentItem) => {
    setSelectedDocumentId(doc.id);
    setChunks([]);
    setChunkError("");

    try {
      const detail = await getDocument(doc.id);
      const nextDocument = mapDocument(detail);
      setDocuments((currentDocuments) =>
        currentDocuments.map((currentDocument) =>
          currentDocument.id === nextDocument.id
            ? nextDocument
            : currentDocument,
        ),
      );
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) {
        handleApiError(error);
        return;
      }

      setChunkError(getApiErrorMessage(error));
    }
  };

  const loadChunks = async () => {
    if (!selectedDocument) {
      return;
    }

    setIsLoadingChunks(true);
    setChunkError("");

    try {
      const response = await getDocumentChunks(selectedDocument.id);
      setChunks(response);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) {
        handleApiError(error);
        return;
      }

      setChunkError(getApiErrorMessage(error));
    } finally {
      setIsLoadingChunks(false);
    }
  };

  const processFiles = async (files: FileList | null) => {
    if (!files?.length || isUploading) return;

    if (!knowledgeBaseId) {
      toast.error("请先选择一个知识库，再上传文档");
      return;
    }

    const fileArray = Array.from(files);
    const invalidMessages = fileArray
      .map(getFileValidationMessage)
      .filter(Boolean);
    const validFiles = fileArray.filter(isAllowedFile);

    if (invalidMessages.length > 0) {
      toast.error(invalidMessages[0]);
    }

    if (validFiles.length === 0) {
      return;
    }

    setIsUploading(true);

    try {
      for (const file of validFiles) {
        await uploadKnowledgeBaseDocument(knowledgeBaseId, file);
      }

      toast.success(`已上传 ${validFiles.length} 个文档`);
      await loadDocuments();
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    void processFiles(event.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    if (!isUploading && knowledgeBaseId) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    void processFiles(event.dataTransfer.files);
  };

  const confirmDeleteDocument = async () => {
    if (!documentToDelete) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteDocument(documentToDelete.id);
      toast.success(`已删除文档：${documentToDelete.originalFilename}`);
      setDocumentToDelete(null);
      setChunks([]);
      await loadDocuments();
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsDeleting(false);
    }
  };

  const renderMainContent = () => {
    if (!hasKnowledgeBaseId) {
      return (
        <EmptyPanel
          title="请先选择一个知识库查看文档"
          description="当前后端没有全局文档列表接口，文档需要按知识库查询。请选择一个知识库后查看、上传或删除文档。"
          actionLabel="前往知识库"
          onAction={() => navigate("/KnowledgeBases")}
        />
      );
    }

    if (isLoadingDocuments) {
      return <LoadingPanel message="正在加载文档..." />;
    }

    if (documentLoadError) {
      return (
        <ErrorPanel
          title="文档加载失败"
          description={documentLoadError}
          onRetry={() => void loadDocuments()}
        />
      );
    }

    return (
      <section className="overflow-hidden rounded-[6px] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left text-sm">
            <thead className="bg-white text-slate-600">
              <tr className="border-b border-slate-200">
                <th className="px-4 py-4 font-medium">文件名</th>
                <th className="px-4 py-4 font-medium">类型</th>
                <th className="px-4 py-4 font-medium">知识库</th>
                <th className="px-4 py-4 font-medium">状态</th>
                <th className="px-4 py-4 font-medium">chunks</th>
                <th className="px-4 py-4 font-medium">大小</th>
                <th className="px-4 py-4 font-medium">上传时间</th>
                <th className="px-4 py-4 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {displayedDocuments.length > 0 ? (
                displayedDocuments.map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={() => void selectDocument(doc)}
                    className={cn(
                      "cursor-pointer border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50",
                      doc.id === selectedDocument?.id && "bg-blue-50/40",
                    )}
                  >
                    <td className="px-4 py-5">
                      <div className="flex min-w-0 items-center gap-3">
                        <FileBadge type={doc.type} />
                        <span className="truncate text-slate-700">
                          {doc.originalFilename}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      <span className="rounded-[4px] border border-slate-200 px-2 py-1 text-xs text-slate-600">
                        {typeMeta[doc.type].label}
                      </span>
                    </td>
                    <td className="px-4 py-5 text-slate-600">
                      {currentKnowledgeBaseLabel}
                    </td>
                    <td className="px-4 py-5">
                      <StatusText
                        status={doc.status}
                        error={doc.errorMessage}
                      />
                    </td>
                    <td className="px-4 py-5 text-slate-600">
                      {doc.chunkCount}
                    </td>
                    <td className="px-4 py-5 text-slate-600">
                      {formatFileSize(doc.sizeBytes)}
                    </td>
                    <td className="px-4 py-5 text-slate-600">
                      {formatDateTime(doc.createdAt)}
                    </td>
                    <td className="px-4 py-5">
                      <div
                        className="flex items-center gap-2"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <IconButton
                          label={`查看 ${doc.originalFilename}`}
                          onClick={() => void selectDocument(doc)}
                        >
                          <Eye />
                        </IconButton>
                        <IconButton label="重新索引待后端支持" disabled>
                          <RefreshCw />
                        </IconButton>
                        <IconButton
                          label={`删除 ${doc.originalFilename}`}
                          disabled={isDeleting}
                          onClick={() => setDocumentToDelete(doc)}
                        >
                          <Trash2 />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-16 text-center text-sm text-slate-500"
                  >
                    当前知识库暂无文档
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-slate-600">
            共 {totalItems} 条，显示 {displayStart}-{displayEnd} 条
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="rounded-[5px] border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                aria-label="上一页"
                disabled={safeCurrentPage === 1}
                onClick={() =>
                  setCurrentPage(Math.max(1, safeCurrentPage - 1))
                }
              >
                <ChevronDown className="rotate-90" />
              </Button>
              {paginationItems.map((item, index) =>
                item === "ellipsis" ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="flex size-9 items-center justify-center text-sm text-slate-400"
                  >
                    ...
                  </span>
                ) : (
                  <Button
                    key={item}
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => setCurrentPage(item)}
                    className={cn(
                      "rounded-[5px] border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
                      item === safeCurrentPage &&
                        "border-blue-600 text-blue-600 hover:bg-blue-50",
                    )}
                    aria-current={item === safeCurrentPage ? "page" : undefined}
                  >
                    {item}
                  </Button>
                ),
              )}
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="rounded-[5px] border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                aria-label="下一页"
                disabled={safeCurrentPage >= totalPages}
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))
                }
              >
                <ChevronDown className="-rotate-90" />
              </Button>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-[5px] border-slate-200 bg-white px-4 text-sm font-normal tracking-normal text-slate-600 normal-case hover:bg-slate-50"
                >
                  {pageSize} 条/页
                  <ChevronDown data-icon="inline-end" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-36">
                <DropdownMenuGroup>
                  {pageSizeOptions.map((option) => (
                    <DropdownMenuItem
                      key={option}
                      onClick={() => handlePageSizeChange(option)}
                      className={cn(
                        "justify-between normal-case tracking-normal",
                        option === pageSize && "bg-blue-50 text-blue-600",
                      )}
                    >
                      {option} 条/页
                      <Check
                        className={cn(
                          "text-blue-600",
                          option !== pageSize && "opacity-0",
                        )}
                      />
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </footer>
      </section>
    );
  };

  return (
    <section className="min-h-0 bg-white text-slate-900 xl:h-[calc(100svh-5rem)] xl:max-h-[calc(100svh-5rem)] xl:overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.markdown,.pdf,text/plain,text/markdown,text/x-markdown,application/pdf"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="grid min-h-0 grid-cols-1 xl:h-full xl:overflow-hidden xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="min-w-0 overflow-auto bg-white px-4 py-4 xl:px-5">
          <div className="flex min-h-full flex-col gap-4">
            <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex h-10 min-w-[230px] cursor-pointer items-center justify-between gap-3 rounded-[5px] border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex size-5 items-center justify-center rounded-[3px] border border-blue-200 bg-blue-50 text-blue-600">
                          <FileText className="size-4" />
                        </span>
                        <span className="truncate">
                          {isLoadingKnowledgeBases
                            ? "正在加载知识库..."
                            : currentKnowledgeBaseLabel}
                        </span>
                      </span>
                      <ChevronDown className="size-4 shrink-0 text-slate-500" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[230px]">
                    <DropdownMenuItem onClick={() => navigate("/Documents")}>
                      <FileText className="size-4 text-slate-500" />
                      选择知识库
                    </DropdownMenuItem>
                    {knowledgeBases.map((kb) => (
                      <DropdownMenuItem
                        key={kb.id}
                        onClick={() => navigate(`/Documents/${kb.id}`)}
                      >
                        <FileText className="size-4 text-slate-500" />
                        {kb.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Tabs
                  value={typeTab}
                  onValueChange={(value) =>
                    handleTypeTabChange(value as TypeTab)
                  }
                >
                  <TabsList variant="line">
                    {typeFilters.map((filter) => (
                      <TabsTrigger
                        key={filter}
                        value={filter}
                        className="px-4 text-xs font-medium tracking-normal normal-case text-slate-600 data-active:text-blue-600 data-active:after:bg-blue-600"
                      >
                        {filter}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>

                <SegmentedFilter
                  items={statusFilters}
                  activeValue={statusFilter}
                  onSelect={handleStatusFilterChange}
                />
              </div>

              <Button
                type="button"
                disabled={!knowledgeBaseId || isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="h-10 w-full rounded-[5px] bg-blue-600 px-5 text-sm font-medium tracking-normal text-white normal-case hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-500 sm:w-fit"
              >
                {isUploading ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <Upload data-icon="inline-start" />
                )}
                上传文档
              </Button>
            </div>

            {knowledgeBaseLoadError ? (
              <ErrorPanel
                title="知识库列表加载失败"
                description={knowledgeBaseLoadError}
                onRetry={() => void loadKnowledgeBaseOptions()}
              />
            ) : (
              <>
                <section
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    "flex min-h-[96px] items-center justify-center rounded-[6px] border border-dashed px-5 py-4 transition-colors",
                    !knowledgeBaseId || isUploading
                      ? "border-slate-200 bg-slate-50"
                      : isDragging
                        ? "border-blue-400 bg-blue-50"
                        : "border-blue-200 bg-white",
                  )}
                >
                  <div className="flex w-full flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
                    <div className="flex flex-col items-center gap-3 sm:flex-row">
                      <Upload
                        className={cn(
                          "size-10",
                          knowledgeBaseId ? "text-slate-600" : "text-slate-300",
                        )}
                        strokeWidth={1.8}
                      />
                      <div>
                        <div className="text-base font-medium text-slate-900">
                          拖拽 TXT、Markdown、PDF 到这里
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          支持 .txt、.md、.markdown、文本型 PDF，单文件最大
                          10MB
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!knowledgeBaseId || isUploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="h-10 rounded-[5px] border-slate-200 bg-white px-6 text-sm font-medium tracking-normal text-slate-700 normal-case hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {isUploading ? "上传中..." : "选择文件"}
                    </Button>
                  </div>
                </section>

                {renderMainContent()}
              </>
            )}
          </div>
        </main>

        {selectedDocument ? (
          <DocumentDetails
            item={selectedDocument}
            chunks={chunks}
            isLoadingChunks={isLoadingChunks}
            chunkError={chunkError}
            onLoadChunks={() => void loadChunks()}
            onNavigateChat={() => navigate("/Chat")}
            onClose={() => setSelectedDocumentId(null)}
          />
        ) : (
          <EmptyDocumentDetails />
        )}
      </div>

      <AlertDialog
        open={Boolean(documentToDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDocumentToDelete(null);
          }
        }}
      >
        <AlertDialogContent className="rounded-[8px]">
          <AlertDialogHeader>
            <AlertDialogTitle>删除文档</AlertDialogTitle>
            <AlertDialogDescription>
              确认删除“{documentToDelete?.originalFilename}”吗？删除后对应
              chunks 也会一并删除，无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              className="rounded-[6px] tracking-normal normal-case"
            >
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              className="rounded-[6px] tracking-normal normal-case"
              onClick={(event) => {
                event.preventDefault();
                void confirmDeleteDocument();
              }}
            >
              {isDeleting ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export default Documents;
