import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Check,
  ChevronDown,
  Eye,
  FileText,
  MessageCircle,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type DocumentType = "PDF" | "Markdown" | "TXT";
type DocumentStatus = "ready" | "processing" | "failed";
type PageSize = 20 | 50 | 100;

type ChunkPreview = {
  id: string;
  score: string;
  excerpt: string;
};

type ProcessStep = {
  label: string;
  time: string;
};

type DocumentItem = {
  name: string;
  type: DocumentType;
  knowledgeBase: string;
  knowledgeBaseSlug: string;
  status: DocumentStatus;
  chunks: number;
  size: string;
  updatedAt: string;
  progress?: number;
  error?: string;
  embeddingModel?: string;
  lastIndexedAt?: string;
  chunkPreviews?: ChunkPreview[];
  processSteps?: ProcessStep[];
};

const typeFilters = ["全部", "PDF", "Markdown", "TXT"];
const statusFilters = ["全部状态", "Ready", "Processing", "Failed"];
const pageSizeOptions: PageSize[] = [20, 50, 100];

const documents: DocumentItem[] = [
  {
    name: "javascript-event-loop.pdf",
    type: "PDF",
    knowledgeBase: "Frontend Interview",
    knowledgeBaseSlug: "frontend-interview",
    status: "ready",
    chunks: 32,
    size: "2.4 MB",
    updatedAt: "今天 14:20",
    embeddingModel: "text-embedding-3-small",
    lastIndexedAt: "2025-05-19 14:20:33",
    chunkPreviews: [
      {
        id: "#01",
        score: "0.92",
        excerpt:
          "事件循环（Event Loop）是 JavaScript 运行时的核心机制，用于处理异步任务和回调执行。它使得 JavaScript 能够在单线程中完成非阻塞操作。",
      },
      {
        id: "#02",
        score: "0.90",
        excerpt:
          "微任务（Microtasks）包括 Promise.then、MutationObserver 等，它们在当前执行栈清空后立即执行，优先级高于宏任务。",
      },
      {
        id: "#03",
        score: "0.87",
        excerpt:
          "宏任务（Macrotasks）包括 setTimeout、setInterval、I/O、UI 渲染等。每次事件循环都会依次取出一个宏任务执行。",
      },
    ],
    processSteps: [
      { label: "Uploaded", time: "2025-05-19 14:20:01" },
      { label: "Parsed", time: "2025-05-19 14:20:03" },
      { label: "Chunked", time: "2025-05-19 14:20:05" },
      { label: "Embedded", time: "2025-05-19 14:20:08" },
      { label: "Indexed", time: "2025-05-19 14:20:33" },
    ],
  },
  {
    name: "react-hooks-notes.md",
    type: "Markdown",
    knowledgeBase: "Frontend Interview",
    knowledgeBaseSlug: "frontend-interview",
    status: "ready",
    chunks: 18,
    size: "86 KB",
    updatedAt: "昨天 22:15",
  },
  {
    name: "graduation-defense-outline.txt",
    type: "TXT",
    knowledgeBase: "Graduation Project",
    knowledgeBaseSlug: "graduation-project",
    status: "processing",
    chunks: 0,
    size: "42 KB",
    updatedAt: "今天 10:11",
    progress: 68,
  },
  {
    name: "database-index-guide.pdf",
    type: "PDF",
    knowledgeBase: "Database Notes",
    knowledgeBaseSlug: "database-notes",
    status: "ready",
    chunks: 45,
    size: "3.1 MB",
    updatedAt: "昨天 16:40",
  },
  {
    name: "scanned-material.pdf",
    type: "PDF",
    knowledgeBase: "English Study",
    knowledgeBaseSlug: "english-study",
    status: "failed",
    chunks: 0,
    size: "5.2 MB",
    updatedAt: "2025-05-17",
    error: "无法提取文本",
  },
];

const statusMeta: Record<
  DocumentStatus,
  {
    dotClass: string;
    textClass: string;
    badgeClass: string;
    label: string;
  }
> = {
  ready: {
    dotClass: "bg-green-500",
    textClass: "text-green-600",
    badgeClass: "border-green-200 bg-green-50 text-green-600",
    label: "ready",
  },
  processing: {
    dotClass: "bg-orange-500",
    textClass: "text-orange-600",
    badgeClass: "border-orange-200 bg-orange-50 text-orange-600",
    label: "processing",
  },
  failed: {
    dotClass: "bg-red-500",
    textClass: "text-red-600",
    badgeClass: "border-red-200 bg-red-50 text-red-600",
    label: "failed",
  },
};

const typeMeta: Record<
  DocumentType,
  {
    className: string;
    shortLabel: string;
  }
> = {
  PDF: {
    className: "bg-red-600 text-white",
    shortLabel: "PDF",
  },
  Markdown: {
    className: "bg-slate-900 text-white",
    shortLabel: "M↓",
  },
  TXT: {
    className: "bg-blue-600 text-white",
    shortLabel: "TXT",
  },
};

const ALLOWED_EXTENSIONS = [".pdf", ".md", ".markdown", ".txt"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const recentKnowledgeBases = [
  { slug: "frontend-interview", name: "Frontend Interview" },
  { slug: "database-notes", name: "Database Notes" },
  { slug: "graduation-project", name: "Graduation Project" },
];

function getExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

function isAllowedFile(file: File): boolean {
  const ext = getExtension(file.name);
  return ALLOWED_EXTENSIONS.includes(ext) && file.size <= MAX_FILE_SIZE;
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
      aria-label={type}
    >
      {meta.shortLabel}
    </span>
  );
}

function SegmentedFilter({
  items,
  activeIndex,
  onSelect,
}: {
  items: string[];
  activeIndex: number;
  onSelect?: (index: number) => void;
}) {
  return (
    <div className="flex h-10 overflow-hidden rounded-[5px] border border-slate-200 bg-white">
      {items.map((item, index) => (
        <button
          key={item}
          type="button"
          onClick={() => onSelect?.(index)}
          className={cn(
            "border-r border-slate-200 px-4 text-sm text-slate-600 transition-colors last:border-r-0 hover:bg-slate-50",
            index === activeIndex && "bg-blue-50 text-blue-600",
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function StatusText({
  status,
  progress,
  error,
}: {
  status: DocumentStatus;
  progress?: number;
  error?: string;
}) {
  const meta = statusMeta[status];

  return (
    <div className="flex min-w-[120px] flex-col gap-1">
      <div className={cn("flex items-center gap-2 text-sm", meta.textClass)}>
        <span className={cn("size-2 rounded-full", meta.dotClass)} />
        <span>{meta.label}</span>
      </div>
      {status === "processing" && typeof progress === "number" && (
        <div className="flex items-center gap-2">
          <Progress
            value={progress}
            className="h-1.5 w-24 rounded-full bg-slate-100 [&_[data-slot=progress-indicator]]:bg-orange-500"
          />
          <span className="text-xs text-slate-600">{progress}%</span>
        </div>
      )}
      {status === "failed" && error && (
        <span className="w-fit rounded-[5px] border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600">
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
    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="min-w-0 text-slate-600">{value}</span>
    </div>
  );
}

function DocumentDetails({
  item,
  onNavigateChat,
}: {
  item: DocumentItem;
  onNavigateChat?: () => void;
}) {
  const meta = statusMeta[item.status];
  const previews = item.chunkPreviews ?? [];
  const steps = item.processSteps ?? [];

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
                  {item.name}
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
                className="h-10 rounded-[5px] border-slate-200 bg-white px-4 text-sm font-medium tracking-normal text-slate-700 normal-case hover:bg-slate-50"
              >
                <RefreshCw data-icon="inline-start" />
                重新索引
              </Button>
              <Button
                type="button"
                onClick={onNavigateChat}
                className="h-10 rounded-[5px] bg-blue-600 px-4 text-sm font-medium tracking-normal text-white normal-case hover:bg-blue-700"
              >
                <MessageCircle data-icon="inline-start" />
                进入问答
                <ChevronDown data-icon="inline-end" />
              </Button>
            </div>

            <div className="flex flex-col gap-3">
              <DetailRow label="类型" value={item.type} />
              <DetailRow label="大小" value={item.size} />
              <DetailRow label="知识库" value={item.knowledgeBase} />
              <DetailRow
                label="状态"
                value={
                  <span className={cn("inline-flex items-center gap-2", meta.textClass)}>
                    <span className={cn("size-2 rounded-full", meta.dotClass)} />
                    {meta.label}
                  </span>
                }
              />
              <DetailRow label="已索引 chunks" value={item.chunks} />
              <DetailRow
                label="Embedding 模型"
                value={item.embeddingModel ?? "text-embedding-3-small"}
              />
              <DetailRow
                label="最后索引时间"
                value={item.lastIndexedAt ?? "2025-05-19 14:20:33"}
              />
            </div>
          </section>

          <section className="border-b border-slate-200 py-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900">
                Chunks 预览
              </h3>
              <span className="text-sm text-slate-500">共 {item.chunks} 个</span>
            </div>
            <div className="flex flex-col gap-3">
              {previews.map((chunk) => (
                <article
                  key={chunk.id}
                  className="rounded-[6px] border border-slate-200 bg-slate-50/60 p-3"
                >
                  <div className="mb-2 flex items-center gap-2 text-sm">
                    <span className="font-semibold text-blue-600">{chunk.id}</span>
                    <span className="text-slate-600">Score: {chunk.score}</span>
                  </div>
                  <p className="line-clamp-3 text-xs leading-5 text-slate-600">
                    {chunk.excerpt}
                  </p>
                  <div className="mt-1 text-xs text-slate-400">字符 0 - 256</div>
                </article>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              className="mt-3 h-8 rounded-[5px] px-0 text-sm font-medium tracking-normal text-blue-600 normal-case hover:bg-transparent hover:text-blue-700"
            >
              查看全部 chunks
              <ChevronDown data-icon="inline-end" className="-rotate-90" />
            </Button>
          </section>

          <section className="py-5">
            <h3 className="mb-4 text-base font-semibold text-slate-900">
              处理流程
            </h3>
            <div className="flex flex-col">
              {steps.map((step, index) => (
                <div key={step.label} className="grid grid-cols-[24px_minmax(0,1fr)] gap-3">
                  <div className="flex flex-col items-center">
                    <span className="flex size-4 items-center justify-center rounded-full bg-green-500 text-white">
                      <Check className="size-3" />
                    </span>
                    {index < steps.length - 1 && (
                      <span className="h-6 w-px bg-green-300" />
                    )}
                  </div>
                  <div className="flex min-w-0 items-start justify-between gap-3 pb-3 text-sm">
                    <span className="text-slate-700">{step.label}</span>
                    <span className="shrink-0 text-slate-500">{step.time}</span>
                  </div>
                </div>
              ))}
            </div>
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
            当前知识库还没有可展示的文档。
          </p>
        </div>
      </div>
    </aside>
  );
}

type TypeTab = "全部" | "PDF" | "Markdown" | "TXT";

const Documents = () => {
  const { knowledgeBaseId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [typeTab, setTypeTab] = useState<TypeTab>("全部");
  const [statusIndex, setStatusIndex] = useState(0);
  const [selectedDocName, setSelectedDocName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [currentPage, setCurrentPage] = useState(1);

  const kbFiltered = knowledgeBaseId
    ? documents.filter((doc) => doc.knowledgeBaseSlug === knowledgeBaseId)
    : documents;

  const typeFiltered =
    typeTab === "全部" ? kbFiltered : kbFiltered.filter((doc) => doc.type === typeTab);

  const statusFiltered =
    statusIndex === 0
      ? typeFiltered
      : typeFiltered.filter(
          (doc) => doc.status === statusFilters[statusIndex].toLowerCase(),
        );

  const filteredDocuments = statusFiltered;
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

  useEffect(() => {
    setCurrentPage(1);
  }, [knowledgeBaseId, typeTab, statusIndex, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const selectedDocument =
    displayedDocuments.find((doc) => doc.name === selectedDocName) ??
    displayedDocuments[0];

  const currentKnowledgeBaseLabel =
    documents.find((doc) => doc.knowledgeBaseSlug === knowledgeBaseId)
      ?.knowledgeBase ?? "全部知识库";

  const processFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const fileArray = Array.from(files);
    const valid = fileArray.filter(isAllowedFile);
    const invalidCount = fileArray.length - valid.length;

    if (invalidCount > 0) {
      toast.error("仅支持 PDF、Markdown、TXT 格式，且不超过 10MB");
    }
    if (valid.length > 0) {
      toast.success(`已选择 ${valid.length} 个文件`);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    processFiles(event.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    processFiles(event.dataTransfer.files);
  };

  return (
    <section className="min-h-0 bg-white text-slate-900 xl:h-[calc(100svh-5rem)] xl:max-h-[calc(100svh-5rem)] xl:overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.md,.markdown,.txt"
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
                      className="flex h-10 min-w-[230px] items-center justify-between gap-3 rounded-[5px] border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex size-5 items-center justify-center rounded-[3px] border border-blue-200 bg-blue-50 text-blue-600">
                          <FileText className="size-4" />
                        </span>
                        <span className="truncate">
                          {currentKnowledgeBaseLabel}
                        </span>
                      </span>
                      <ChevronDown className="size-4 shrink-0 text-slate-500" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[230px]">
                    <DropdownMenuItem
                      onClick={() => navigate("/Documents")}
                    >
                      <FileText className="size-4 text-slate-500" />
                      全部知识库
                    </DropdownMenuItem>
                    {recentKnowledgeBases.map((kb) => (
                      <DropdownMenuItem
                        key={kb.slug}
                        onClick={() => navigate(`/Documents/${kb.slug}`)}
                      >
                        <FileText className="size-4 text-slate-500" />
                        {kb.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Tabs
                  value={typeTab}
                  onValueChange={(value) => setTypeTab(value as TypeTab)}
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
                  activeIndex={statusIndex}
                  onSelect={setStatusIndex}
                />
              </div>

              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-10 w-full rounded-[5px] bg-blue-600 px-5 text-sm font-medium tracking-normal text-white normal-case hover:bg-blue-700 sm:w-fit"
              >
                <Upload data-icon="inline-start" />
                上传文档
              </Button>
            </div>

            <section
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "flex min-h-[96px] items-center justify-center rounded-[6px] border border-dashed px-5 py-4 transition-colors",
                isDragging
                  ? "border-blue-400 bg-blue-50"
                  : "border-blue-200 bg-white",
              )}
            >
              <div className="flex w-full flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
                <div className="flex flex-col items-center gap-3 sm:flex-row">
                  <Upload className="size-10 text-slate-600" strokeWidth={1.8} />
                  <div>
                    <div className="text-base font-medium text-slate-900">
                      拖拽 PDF、Markdown、TXT 到这里
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      单文件最大 10MB
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-10 rounded-[5px] border-slate-200 bg-white px-6 text-sm font-medium tracking-normal text-slate-700 normal-case hover:bg-slate-50"
                >
                  选择文件
                </Button>
              </div>
            </section>

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
                      <th className="px-4 py-4 font-medium">更新时间</th>
                      <th className="px-4 py-4 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedDocuments.length > 0 ? (
                      displayedDocuments.map((doc) => (
                        <tr
                          key={doc.name}
                          onClick={() => setSelectedDocName(doc.name)}
                          className={cn(
                            "cursor-pointer border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50",
                            doc.name === selectedDocument?.name &&
                              "bg-blue-50/40",
                          )}
                        >
                          <td className="px-4 py-5">
                            <div className="flex min-w-0 items-center gap-3">
                              <FileBadge type={doc.type} />
                              <span className="truncate text-slate-700">
                                {doc.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-5">
                            <span className="rounded-[4px] border border-slate-200 px-2 py-1 text-xs text-slate-600">
                              {doc.type}
                            </span>
                          </td>
                          <td className="px-4 py-5 text-slate-600">
                            {doc.knowledgeBase}
                          </td>
                          <td className="px-4 py-5">
                            <StatusText
                              status={doc.status}
                              progress={doc.progress}
                              error={doc.error}
                            />
                          </td>
                          <td className="px-4 py-5 text-slate-600">
                            {doc.chunks}
                          </td>
                          <td className="px-4 py-5 text-slate-600">
                            {doc.size}
                          </td>
                          <td className="px-4 py-5 text-slate-600">
                            {doc.updatedAt}
                          </td>
                          <td className="px-4 py-5">
                            <div
                              className="flex items-center gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <IconButton
                                label={`查看 ${doc.name}`}
                                onClick={() => setSelectedDocName(doc.name)}
                              >
                                <Eye />
                              </IconButton>
                              <IconButton
                                label={`重新索引 ${doc.name}`}
                                disabled={doc.status === "failed"}
                              >
                                <RefreshCw />
                              </IconButton>
                              <IconButton label={`删除 ${doc.name}`}>
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
                          暂无文档
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
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
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
                        setCurrentPage((page) => Math.min(totalPages, page + 1))
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
                            onClick={() => setPageSize(option)}
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
          </div>
        </main>

        {selectedDocument ? (
          <DocumentDetails
            item={selectedDocument}
            onNavigateChat={() => navigate("/Chat")}
          />
        ) : (
          <EmptyDocumentDetails />
        )}
      </div>
    </section>
  );
};

export default Documents;
