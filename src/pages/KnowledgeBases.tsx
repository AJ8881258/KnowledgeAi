import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  FileText,
  Grid2X2,
  Info,
  LayoutList,
  Loader2,
  Maximize2,
  MessageCircle,
  Minimize2,
  MoreVertical,
  Paperclip,
  Plus,
  Search,
  Send,
  Star,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  TriangleAlert,
  Upload,
  UserRound,
  X,
} from "lucide-react";

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
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type KnowledgeBase = {
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
};

type KnowledgeBaseTab = "all" | "mine" | "featured";
type KnowledgeBaseViewMode = "card" | "list";
type KnowledgeBaseSortMode = "recent" | "createdTime";
type SortDirection = "asc" | "desc";
type DetailDocumentStatus = "ready" | "processing" | "failed";
type DetailDocumentTab = "all" | "processing" | "failed";

type KnowledgeBaseThemePreset = {
  id: string;
  label: string;
  iconClass: string;
  coverClass: string;
  coverAccent: string;
};

type NewKnowledgeBaseForm = {
  title: string;
  description: string;
  featured: boolean;
  themeId: string;
};

type DetailDocument = {
  name: string;
  meta: string;
  type: string;
  status: DetailDocumentStatus;
  error?: string;
};

type ChatAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
};

const MAX_CHAT_MESSAGE_LENGTH = 4000;
const ALLOWED_ATTACHMENT_EXTENSIONS = [".pdf", ".md", ".markdown", ".txt"];

const knowledgeBaseTabs: {
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
    value: "featured",
    label: "精选知识库",
    title: "精选知识库",
    empty: "暂无精选知识库",
  },
];

const knowledgeBaseThemePresets: KnowledgeBaseThemePreset[] = [
  {
    id: "sky",
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
    id: "emerald",
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

const initialKnowledgeBases: KnowledgeBase[] = [
  {
    id: "kb-frontend",
    slug: "frontend-interview",
    name: "Frontend Interview",
    description: "浏览器、React、工程化与常见面试题整理",
    owner: "Google Research",
    docs: 12,
    chunks: 168,
    sources: 71,
    updatedAt: "2026年4月11日",
    createdAt: "2026-04-02T09:00:00.000Z",
    status: "indexed",
    theme: {
      icon: "FI",
      iconClass: "bg-blue-100 text-blue-700 ring-blue-200",
      coverClass: "from-sky-50 via-white to-blue-100",
      coverAccent: "bg-sky-400",
    },
    recent: true,
    featured: true,
    createdByMe: true,
  },
  {
    id: "kb-graduation",
    slug: "graduation-project",
    name: "Graduation Project",
    description: "RAG 毕设方案、项目文档与实验记录",
    owner: "Yahoo Sports",
    docs: 28,
    chunks: 326,
    sources: 89,
    updatedAt: "2026年2月27日",
    createdAt: "2026-02-11T11:30:00.000Z",
    status: "indexed",
    theme: {
      icon: "GP",
      iconClass: "bg-violet-100 text-violet-700 ring-violet-200",
      coverClass: "from-violet-50 via-white to-fuchsia-100",
      coverAccent: "bg-violet-400",
    },
    recent: true,
    featured: true,
    createdByMe: true,
  },
  {
    id: "kb-database",
    slug: "database-notes",
    name: "Database Notes",
    description: "MySQL、索引、事务与数据库系统笔记",
    owner: "Business",
    docs: 16,
    chunks: 214,
    sources: 267,
    updatedAt: "2025年4月18日",
    createdAt: "2025-04-03T08:15:00.000Z",
    status: "processing",
    theme: {
      icon: "DB",
      iconClass: "bg-emerald-100 text-emerald-700 ring-emerald-200",
      coverClass: "from-emerald-50 via-white to-teal-100",
      coverAccent: "bg-emerald-400",
    },
    recent: true,
    featured: true,
    createdByMe: true,
  },
  {
    id: "kb-english",
    slug: "english-study",
    name: "English Study",
    description: "阅读材料、语法记录与口语表达库",
    owner: "The Atlantic",
    docs: 18,
    chunks: 192,
    sources: 36,
    updatedAt: "2025年7月10日",
    createdAt: "2025-06-28T14:00:00.000Z",
    status: "indexed",
    theme: {
      icon: "EN",
      iconClass: "bg-amber-100 text-amber-700 ring-amber-200",
      coverClass: "from-amber-50 via-white to-orange-100",
      coverAccent: "bg-amber-400",
    },
    recent: false,
    featured: true,
    createdByMe: false,
  },
  {
    id: "kb-backend",
    slug: "backend-architecture",
    name: "Backend Architecture",
    description: "鉴权、缓存、消息队列与系统设计资料",
    owner: "KnowFlow AI",
    docs: 24,
    chunks: 301,
    sources: 58,
    updatedAt: "2026年3月3日",
    createdAt: "2026-02-22T16:40:00.000Z",
    status: "failed",
    theme: {
      icon: "BA",
      iconClass: "bg-rose-100 text-rose-700 ring-rose-200",
      coverClass: "from-rose-50 via-white to-slate-100",
      coverAccent: "bg-rose-400",
    },
    recent: false,
    featured: false,
    createdByMe: true,
  },
];

const documents: DetailDocument[] = [
  {
    name: "JavaScript 高级程序设计.pdf",
    meta: "128 页 · 4.2 MB",
    type: "pdf",
    status: "ready",
  },
  {
    name: "React 官方文档.md",
    meta: "256 KB",
    type: "md",
    status: "ready",
  },
  {
    name: "浏览器工作原理.txt",
    meta: "1.1 MB",
    type: "txt",
    status: "processing",
  },
  {
    name: "计算机网络（谢希仁）.pdf",
    meta: "32.8 MB",
    type: "pdf",
    status: "failed",
    error: "解析失败，请检查文件格式",
  },
  {
    name: "面试题汇总.md",
    meta: "88 KB",
    type: "md",
    status: "ready",
  },
];

const sources = [
  {
    id: 1,
    file: "JavaScript 高级程序设计.pdf",
    type: "pdf",
    meta: "Chunk 23 · 页码 105",
    score: "0.92",
    excerpt:
      "事件循环是 JavaScript 运行时环境的重要组成部分。JS 引擎通过调用栈和任务队列的协作，实现了单线程的异步处理模型...",
  },
  {
    id: 2,
    file: "浏览器工作原理.txt",
    type: "txt",
    meta: "Chunk 78 · 字符 5123",
    score: "0.87",
    excerpt:
      "浏览器的事件循环机制与 JS 运行时紧密相关。宏任务如 setTimeout 进入任务队列，微任务如 Promise.then 进入微任务队列...",
  },
  {
    id: 3,
    file: "面试题汇总.md",
    type: "md",
    meta: "Chunk 45 · 字符 2891",
    score: "0.76",
    excerpt:
      "请解释事件循环的执行顺序。答：事件循环分为宏任务和微任务两个队列，微任务的优先级高于宏任务...",
  },
];

const statusStyles = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
  processing: "border-blue-200 bg-blue-50 text-blue-700",
  failed: "border-orange-200 bg-orange-50 text-orange-700",
};

const kbStatusCopy = {
  indexed: "已索引",
  processing: "处理中",
  failed: "失败",
};

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(value);
}

function getInitials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  return value.trim().slice(0, 2).toUpperCase() || "KB";
}

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `knowledge-base-${Date.now()}`;
}

function getCreatedTime(item: KnowledgeBase) {
  return new Date(item.createdAt).getTime();
}

function sortKnowledgeBases(
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

function getDocumentCountByTab(
  items: DetailDocument[],
  tab: DetailDocumentTab,
) {
  if (tab === "all") {
    return items.length;
  }

  return items.filter((item) => item.status === tab).length;
}

function getFilteredDocuments(
  items: DetailDocument[],
  tab: DetailDocumentTab,
) {
  if (tab === "all") {
    return items;
  }

  return items.filter((item) => item.status === tab);
}

function getAttachmentExtension(name: string) {
  const dotIndex = name.lastIndexOf(".");

  if (dotIndex === -1) {
    return "";
  }

  return name.slice(dotIndex).toLowerCase();
}

function isAllowedAttachment(file: File) {
  return ALLOWED_ATTACHMENT_EXTENSIONS.includes(
    getAttachmentExtension(file.name),
  );
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function searchKnowledgeBases(items: KnowledgeBase[], keyword: string) {
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

function FileBadge({ type }: { type: string }) {
  const isPdf = type === "pdf";

  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-[4px] text-[9px] font-bold text-white",
        isPdf ? "bg-red-600" : type === "md" ? "bg-slate-900" : "bg-blue-500",
      )}
    >
      {isPdf ? "PDF" : type.toUpperCase()}
    </span>
  );
}

function DocumentStatus({ status }: { status: DetailDocumentStatus }) {
  if (status === "processing") {
    return (
      <span
        className={cn(
          "flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px]",
          statusStyles[status],
        )}
      >
        processing
        <Loader2 className="size-3 animate-spin" />
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span
        className={cn(
          "flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px]",
          statusStyles[status],
        )}
      >
        failed
        <TriangleAlert className="size-3" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px]",
        statusStyles[status],
      )}
    >
      ready
      <CheckCircle2 className="size-3" />
    </span>
  );
}

function KnowledgeBaseMark({
  item,
  size = "md",
}: {
  item: KnowledgeBase;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[8px] text-xs font-bold ring-1",
        size === "sm"
          ? "size-8"
          : size === "lg"
            ? "size-14 text-base"
            : "size-10",
        item.theme.iconClass,
      )}
    >
      {item.theme.icon}
    </span>
  );
}

function StatusPill({ status }: { status: KnowledgeBase["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium",
        status === "indexed" && "bg-emerald-50 text-emerald-700",
        status === "processing" && "bg-blue-50 text-blue-700",
        status === "failed" && "bg-orange-50 text-orange-700",
      )}
    >
      {kbStatusCopy[status]}
    </span>
  );
}

function getFilteredKnowledgeBases(
  items: KnowledgeBase[],
  tab: KnowledgeBaseTab,
) {
  if (tab === "mine") {
    return items.filter((item) => item.createdByMe);
  }

  if (tab === "featured") {
    return items.filter((item) => item.featured);
  }

  return items;
}

function FeaturedCard({
  item,
  onOpen,
}: {
  item: KnowledgeBase;
  onOpen: (slug: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item.slug)}
      className={cn(
        "group relative min-h-[184px] overflow-hidden rounded-[8px] border border-slate-200 bg-gradient-to-br p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md",
        item.theme.coverClass,
      )}
    >
      <div className="absolute -right-10 -top-10 size-32 rounded-full bg-white/60" />
      <div
        className={cn(
          "absolute bottom-0 left-0 h-1 w-full",
          item.theme.coverAccent,
        )}
      />
      <div className="relative flex h-full flex-col justify-between gap-8">
        <div className="flex items-center gap-3">
          <KnowledgeBaseMark item={item} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">
              {item.owner}
            </div>
            <div className="text-xs text-slate-500">{item.docs} 个文档</div>
          </div>
        </div>
        <div>
          <h3 className="max-w-[15rem] text-xl font-semibold leading-8 text-slate-950">
            {item.name}
          </h3>
          <div className="mt-4 flex items-center justify-between gap-3 text-xs font-medium text-slate-600">
            <span>
              {item.updatedAt} · {item.sources} 个来源
            </span>
            <span className="flex size-8 items-center justify-center rounded-full border border-white bg-white/80 text-slate-700 shadow-sm transition-transform group-hover:translate-x-0.5">
              <ArrowRight className="size-4" />
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function KnowledgeBaseActionsMenu({
  item,
  onOpen,
  onToggleFeatured,
  onDelete,
}: {
  item: KnowledgeBase;
  onOpen: (slug: string) => void;
  onToggleFeatured: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const stopCardClick = (event: React.MouseEvent | Event) => {
    event.stopPropagation();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="知识库操作"
            className="rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            onClick={stopCardClick}
          >
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-44 rounded-[8px]"
          onClick={stopCardClick}
        >
          <DropdownMenuGroup>
            <DropdownMenuItem
              onSelect={(event) => {
                stopCardClick(event);
                onOpen(item.slug);
              }}
            >
              <MessageCircle />
              使用对话
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(event) => {
                stopCardClick(event);
                onToggleFeatured(item.id);
              }}
            >
              <Star />
              {item.featured ? "取消精选知识库" : "标记为精选知识库"}
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={(event) => {
                stopCardClick(event);
                event.preventDefault();
                setDeleteOpen(true);
              }}
            >
              <Trash2 />
              删除知识库
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent
          onClick={(event) => event.stopPropagation()}
          className="rounded-[8px]"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>删除知识库</AlertDialogTitle>
            <AlertDialogDescription>
              确认删除“{item.name}”吗？当前只会从本地列表移除，刷新页面后会恢复 mock
              数据。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-[6px] tracking-normal normal-case">
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="rounded-[6px] tracking-normal normal-case"
              onClick={() => onDelete(item.id)}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function RecentCard({
  item,
  onOpen,
  onToggleFeatured,
  onDelete,
}: {
  item: KnowledgeBase;
  onOpen: (slug: string) => void;
  onToggleFeatured: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen(item.slug);
    }
  };

  return (
    <>
      <article
        tabIndex={0}
        onClick={() => onOpen(item.slug)}
        onKeyDown={handleCardKeyDown}
        className="group flex min-h-[160px] cursor-pointer flex-col rounded-[8px] border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
      >
        <div className="flex items-start justify-between gap-3">
          <KnowledgeBaseMark item={item} size="lg" />
          <KnowledgeBaseActionsMenu
            item={item}
            onOpen={onOpen}
            onToggleFeatured={onToggleFeatured}
            onDelete={onDelete}
          />
        </div>
        <div className="mt-5 min-w-0">
          <div className="truncate text-base font-semibold text-slate-900">
            {item.name}
          </div>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
            {item.description}
          </p>
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 pt-5 text-xs text-slate-500">
          <span>{item.docs} 个文档</span>
          <StatusPill status={item.status} />
        </div>
      </article>
    </>
  );
}

function KnowledgeBaseListItem({
  item,
  onOpen,
  onToggleFeatured,
  onDelete,
}: {
  item: KnowledgeBase;
  onOpen: (slug: string) => void;
  onToggleFeatured: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen(item.slug);
    }
  };

  return (
    <article
      tabIndex={0}
      onClick={() => onOpen(item.slug)}
      onKeyDown={handleKeyDown}
      className="group flex cursor-pointer flex-col gap-4 rounded-[8px] border border-slate-200 bg-white p-4 text-left shadow-sm transition-all duration-300 hover:border-sky-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 md:flex-row md:items-center"
    >
      <div
        className={cn(
          "relative flex h-24 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-gradient-to-br md:w-40",
          item.theme.coverClass,
        )}
      >
        <div className="absolute -right-8 -top-8 size-24 rounded-full bg-white/60" />
        <div
          className={cn(
            "absolute bottom-0 left-0 h-1 w-full",
            item.theme.coverAccent,
          )}
        />
        <KnowledgeBaseMark item={item} size="lg" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-base font-semibold text-slate-950">
            {item.name}
          </h3>
          {item.featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
              <Star />
              精选
            </span>
          )}
          <StatusPill status={item.status} />
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
          {item.description}
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
          <span>{item.docs} 个文档</span>
          <span>{item.sources} 个来源</span>
          <span>创建于 {formatDateTime(new Date(item.createdAt))}</span>
          <span>更新于 {item.updatedAt}</span>
        </div>
      </div>
      <KnowledgeBaseActionsMenu
        item={item}
        onOpen={onOpen}
        onToggleFeatured={onToggleFeatured}
        onDelete={onDelete}
      />
    </article>
  );
}

function NewKnowledgeBaseCard({ onCreate }: { onCreate: () => void }) {
  return (
    <button
      type="button"
      onClick={onCreate}
      className="flex min-h-[160px] flex-col items-center justify-center gap-4 rounded-[8px] border border-dashed border-slate-300 bg-white text-slate-500 transition-all duration-300 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-sky-100 text-sky-700">
        <Plus />
      </span>
      <span className="text-sm font-semibold">新建知识库</span>
    </button>
  );
}

function NewKnowledgeBaseListRow({ onCreate }: { onCreate: () => void }) {
  return (
    <button
      type="button"
      onClick={onCreate}
      className="flex min-h-[96px] items-center justify-center gap-3 rounded-[8px] border border-dashed border-slate-300 bg-white px-4 text-sm font-semibold text-slate-500 transition-all duration-300 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-sky-100 text-sky-700">
        <Plus />
      </span>
      新建知识库
    </button>
  );
}

// 知识库列表视图
function KnowledgeBaseListView({
  items,
  onCreate,
  onToggleFeatured,
  onDelete,
}: {
  items: KnowledgeBase[];
  onCreate: (item: KnowledgeBase) => void;
  onToggleFeatured: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<KnowledgeBaseTab>("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<KnowledgeBaseViewMode>("card");
  const [sortMode, setSortMode] = useState<KnowledgeBaseSortMode>("recent");
  const [createdTimeDirection, setCreatedTimeDirection] =
    useState<SortDirection>("desc");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<NewKnowledgeBaseForm>({
    title: "",
    description: "",
    featured: false,
    themeId: knowledgeBaseThemePresets[0].id,
  });
  const [formErrors, setFormErrors] = useState<
    Partial<Record<"title" | "description", string>>
  >({});
  const searchInputRef = useRef<HTMLInputElement>(null);
  const activeTabMeta =
    knowledgeBaseTabs.find((item) => item.value === activeTab) ??
    knowledgeBaseTabs[0];
  const tabItems = getFilteredKnowledgeBases(items, activeTab);
  const visibleItems = sortKnowledgeBases(
    searchKnowledgeBases(tabItems, searchTerm),
    sortMode,
    sortMode === "createdTime" ? createdTimeDirection : "desc",
  );
  const featuredItems = items
    .filter((item) => item.featured)
    .slice(0, 4);
  const sortLabel =
    sortMode === "recent"
      ? "最近"
      : `创建时间 ${createdTimeDirection === "desc" ? "倒序" : "正序"}`;
  const hasSearchTerm = searchTerm.trim().length > 0;

  const openKnowledgeBase = (slug: string) => {
    navigate(`/KnowledgeBases/${slug}`);
  };

  const openCreateSheet = () => {
    setCreateOpen(true);
  };

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      featured: false,
      themeId: knowledgeBaseThemePresets[0].id,
    });
    setFormErrors({});
  };

  const handleCreateOpenChange = (open: boolean) => {
    setCreateOpen(open);

    if (!open) {
      resetForm();
    }
  };

  const handleSearchButtonClick = () => {
    if (!searchOpen) {
      setSearchOpen(true);
      return;
    }

    if (!searchTerm.trim()) {
      setSearchOpen(false);
    }
  };

  const handleRecentSort = () => {
    setSortMode("recent");
    setCreatedTimeDirection("desc");
  };

  const handleCreatedTimeSort = () => {
    if (sortMode !== "createdTime") {
      setSortMode("createdTime");
      setCreatedTimeDirection("desc");
      return;
    }

    setCreatedTimeDirection((current) => (current === "desc" ? "asc" : "desc"));
  };

  const handleCreateSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = form.title.trim();
    const description = form.description.trim();
    const nextErrors: Partial<Record<"title" | "description", string>> = {};

    if (!title) {
      nextErrors.title = "请输入知识库标题";
    }

    if (!description) {
      nextErrors.description = "请输入知识库介绍";
    }

    setFormErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const now = new Date();
    const themePreset =
      knowledgeBaseThemePresets.find((item) => item.id === form.themeId) ??
      knowledgeBaseThemePresets[0];
    const slug = `${slugify(title)}-${now.getTime().toString(36)}`;

    onCreate({
      id: `kb-${now.getTime().toString(36)}`,
      slug,
      name: title,
      description,
      owner: "我创建的知识库",
      docs: 0,
      chunks: 0,
      sources: 0,
      updatedAt: formatDateTime(now),
      createdAt: now.toISOString(),
      status: "indexed",
      theme: {
        icon: getInitials(title),
        iconClass: themePreset.iconClass,
        coverClass: themePreset.coverClass,
        coverAccent: themePreset.coverAccent,
      },
      recent: true,
      featured: form.featured,
      createdByMe: true,
    });

    setCreateOpen(false);
    resetForm();
  };

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  return (
    <section className="min-h-[calc(100svh-5rem)] bg-slate-50/60 px-3 py-4 text-slate-900 sm:px-5">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as KnowledgeBaseTab)}
        className="mx-auto flex max-w-[1440px] flex-col gap-10"
      >
        <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <TabsList
            variant="line"
            className="flex h-auto flex-wrap justify-start gap-3 p-0"
          >
            {knowledgeBaseTabs.map((item) => (
              <TabsTrigger
                key={item.value}
                value={item.value}
                className="h-10 flex-none rounded-full px-5 text-sm font-semibold tracking-normal normal-case text-slate-600 hover:bg-white hover:text-slate-950 data-active:bg-white data-active:text-slate-950 data-active:shadow-sm data-active:hover:bg-white data-active:hover:text-slate-950 group-data-[variant=line]/tabs-list:data-active:after:opacity-0"
              >
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-row-reverse items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-full border-slate-200 bg-white text-slate-700"
                aria-label={searchOpen ? "收起搜索" : "搜索知识库"}
                onClick={handleSearchButtonClick}
              >
                <Search />
              </Button>
              <div
                className={cn(
                  "grid transition-all duration-300",
                  searchOpen
                    ? "w-64 opacity-100"
                    : "pointer-events-none w-0 opacity-0",
                )}
              >
                <div className="flex h-10 min-w-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 shadow-sm">
                  <Input
                    ref={searchInputRef}
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="搜索知识库"
                    aria-label="搜索知识库"
                    className="h-8 border-b-transparent py-0 text-sm focus-visible:border-b-transparent"
                  />
                  {searchTerm && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label="清空搜索"
                      className="rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      onClick={() => setSearchTerm("")}
                    >
                      <X />
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex overflow-hidden rounded-full border border-slate-200 bg-white">
              <Button
                type="button"
                variant={viewMode === "card" ? "default" : "ghost"}
                className={cn(
                  "h-10 rounded-none px-3",
                  viewMode === "card"
                    ? "bg-sky-300 text-white hover:bg-sky-400"
                    : "text-slate-600",
                )}
                aria-label="网格视图"
                onClick={() => setViewMode("card")}
              >
                {viewMode === "card" && <Check />}
                <Grid2X2 />
              </Button>
              <Button
                type="button"
                variant={viewMode === "list" ? "default" : "ghost"}
                className={cn(
                  "h-10 rounded-none px-3",
                  viewMode === "list"
                    ? "bg-sky-300 text-white hover:bg-sky-400"
                    : "text-slate-600",
                )}
                aria-label="列表视图"
                onClick={() => setViewMode("list")}
              >
                {viewMode === "list" && <Check />}
                <LayoutList />
              </Button>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-full border-slate-200 bg-white px-5 text-sm tracking-normal normal-case"
                >
                  {sortLabel}
                  <ChevronDown data-icon="inline-end" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 rounded-[8px]">
                <DropdownMenuGroup>
                  <DropdownMenuItem onSelect={handleRecentSort}>
                    {sortMode === "recent" && <Check />}
                    最近
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={handleCreatedTimeSort}>
                    {sortMode === "createdTime" && <Check />}
                    创建时间
                    <span className="ml-auto text-xs text-slate-400">
                      {sortMode === "createdTime"
                        ? createdTimeDirection === "desc"
                          ? "倒序"
                          : "正序"
                        : "倒序"}
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              type="button"
              className="h-10 rounded-full bg-white px-5 text-sm tracking-normal text-slate-900 shadow-sm hover:bg-slate-50 normal-case"
              onClick={openCreateSheet}
            >
              <Plus data-icon="inline-start" />
              新建
            </Button>
          </div>
        </header>

        {activeTab === "all" && (
          <section>
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold tracking-normal text-slate-950">
              精选知识库
            </h2>
            <Button
              variant="outline"
              className="hidden h-10 rounded-full border-slate-200 bg-white px-5 text-sm tracking-normal normal-case sm:flex"
              onClick={() => setActiveTab("mine")}
            >
              查看全部
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {featuredItems.map((item) => (
              <FeaturedCard
                key={item.id}
                item={item}
                onOpen={openKnowledgeBase}
              />
            ))}
          </div>
          </section>
        )}

        <TabsContent value={activeTab} forceMount className="m-0">
          <section>
          <h2 className="mb-5 text-2xl font-semibold tracking-normal text-slate-950">
            {activeTabMeta.title}
          </h2>
          {viewMode === "card" ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {activeTab !== "featured" && (
                <NewKnowledgeBaseCard onCreate={openCreateSheet} />
              )}
              {visibleItems.map((item) => (
                <RecentCard
                  key={item.id}
                  item={item}
                  onOpen={openKnowledgeBase}
                  onToggleFeatured={onToggleFeatured}
                  onDelete={onDelete}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {activeTab !== "featured" && (
                <NewKnowledgeBaseListRow onCreate={openCreateSheet} />
              )}
              {visibleItems.map((item) => (
                <KnowledgeBaseListItem
                  key={item.id}
                  item={item}
                  onOpen={openKnowledgeBase}
                  onToggleFeatured={onToggleFeatured}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
          {visibleItems.length === 0 && (
            <div className="rounded-[8px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm font-medium text-slate-500">
              {hasSearchTerm ? "未找到相关知识库" : activeTabMeta.empty}
            </div>
          )}
          </section>
        </TabsContent>
      </Tabs>
      <Sheet open={createOpen} onOpenChange={handleCreateOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <form
            onSubmit={handleCreateSubmit}
            className="flex min-h-0 flex-1 flex-col"
          >
            <SheetHeader>
              <SheetTitle>新建知识库</SheetTitle>
              <SheetDescription>
                创建后仅保存到当前页面状态，刷新页面后会恢复 mock 数据。
              </SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-auto px-8">
              <FieldGroup className="gap-7">
                <Field data-invalid={!!formErrors.title}>
                  <FieldLabel htmlFor="knowledge-base-title">标题</FieldLabel>
                  <Input
                    id="knowledge-base-title"
                    value={form.title}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }));
                      setFormErrors((current) => ({
                        ...current,
                        title: undefined,
                      }));
                    }}
                    aria-invalid={!!formErrors.title}
                    placeholder="例如：产品需求库"
                  />
                  <FieldError>{formErrors.title}</FieldError>
                </Field>
                <Field data-invalid={!!formErrors.description}>
                  <FieldLabel htmlFor="knowledge-base-description">
                    介绍
                  </FieldLabel>
                  <Textarea
                    id="knowledge-base-description"
                    value={form.description}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }));
                      setFormErrors((current) => ({
                        ...current,
                        description: undefined,
                      }));
                    }}
                    aria-invalid={!!formErrors.description}
                    placeholder="简要描述这个知识库包含的内容"
                    className="min-h-24"
                  />
                  <FieldError>{formErrors.description}</FieldError>
                </Field>
                <FieldSet>
                  <FieldLegend>封面</FieldLegend>
                  <div className="grid grid-cols-2 gap-3">
                    {knowledgeBaseThemePresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            themeId: preset.id,
                          }))
                        }
                        className={cn(
                          "relative h-20 overflow-hidden rounded-[8px] border bg-gradient-to-br text-left transition-all duration-200",
                          preset.coverClass,
                          form.themeId === preset.id
                            ? "border-sky-300 ring-2 ring-sky-200"
                            : "border-slate-200 hover:border-sky-200",
                        )}
                      >
                        <span className="absolute -right-5 -top-5 size-16 rounded-full bg-white/60" />
                        <span
                          className={cn(
                            "absolute bottom-0 left-0 h-1 w-full",
                            preset.coverAccent,
                          )}
                        />
                        <span className="relative flex h-full items-center px-3 text-sm font-semibold text-slate-800">
                          {preset.label}
                        </span>
                      </button>
                    ))}
                  </div>
                  <FieldDescription>
                    封面使用本地预设样式，不上传图片。
                  </FieldDescription>
                </FieldSet>
                <Field orientation="horizontal">
                  <Checkbox
                    id="knowledge-base-featured"
                    checked={form.featured}
                    onCheckedChange={(checked) =>
                      setForm((current) => ({
                        ...current,
                        featured: checked === true,
                      }))
                    }
                  />
                  <FieldLabel htmlFor="knowledge-base-featured">
                    是否设置精选
                  </FieldLabel>
                </Field>
              </FieldGroup>
            </div>
            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-[6px] tracking-normal normal-case"
                onClick={() => setCreateOpen(false)}
              >
                取消
              </Button>
              <Button
                type="submit"
                className="rounded-[6px] tracking-normal normal-case"
              >
                创建知识库
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </section>
  );
}

function RecentSwitcher({
  current,
  items,
}: {
  current: KnowledgeBase;
  items: KnowledgeBase[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const recentItems = items.filter((item) => item.recent).slice(0, 3);

  return (
    <div className="relative z-20 min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="flex h-10 w-full min-w-0 items-center gap-3 rounded-[6px] border border-slate-200 bg-white px-3 text-left text-sm transition-colors hover:bg-slate-50"
      >
        <KnowledgeBaseMark item={current} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-slate-900">
            {current.name}
          </span>
          <span className="block truncate text-xs text-slate-500">
            最近使用
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-slate-500 transition-transform duration-300",
            isOpen && "rotate-180",
          )}
        />
      </button>
      <div
        className={cn(
          "absolute left-0 right-0 top-12 grid overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-lg transition-all duration-300 ease-out",
          isOpen
            ? "grid-rows-[1fr] opacity-100 translate-y-0"
            : "pointer-events-none grid-rows-[0fr] -translate-y-1 opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-1 p-2">
            {recentItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  navigate(`/KnowledgeBases/${item.slug}`);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex min-w-0 items-center gap-3 rounded-[6px] px-2 py-2 text-left text-sm transition-colors hover:bg-slate-50",
                  item.slug === current.slug &&
                    "bg-blue-50 text-blue-700 hover:bg-blue-50",
                )}
              >
                <KnowledgeBaseMark item={item} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {item.name}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {item.docs} 个文档 · {item.chunks} 个 Chunk
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KnowledgeBaseChatView({
  current,
  items,
}: {
  current: KnowledgeBase;
  items: KnowledgeBase[];
}) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documentTab, setDocumentTab] = useState<DetailDocumentTab>("all");
  const [chatInput, setChatInput] = useState("");
  const [ragEnabled, setRagEnabled] = useState(true);
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [attachmentSheetOpen, setAttachmentSheetOpen] = useState(false);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState("");
  const filteredDocuments = getFilteredDocuments(documents, documentTab);
  const hasMessageContent =
    chatInput.trim().length > 0 || attachments.length > 0;
  const chatLineCount = Math.max(
    2,
    chatInput.split("\n").length + Math.floor(chatInput.length / 72),
  );
  const chatInputHeight = isInputExpanded
    ? "30vh"
    : `min(30vh, ${Math.min(168, chatLineCount * 24 + 24)}px)`;

  const handleRagToggle = () => {
    setRagEnabled((currentValue) => {
      const nextValue = !currentValue;
      toast.success(nextValue ? "RAG 已启用" : "RAG 已关闭");
      return nextValue;
    });
  };

  const removeAttachment = (id: string) => {
    setAttachments((currentAttachments) =>
      currentAttachments.filter((attachment) => attachment.id !== id),
    );
  };

  const addFiles = (files: FileList | null) => {
    if (!files?.length) {
      return;
    }

    const nextFiles = Array.from(files);
    const invalidFiles = nextFiles.filter((file) => !isAllowedAttachment(file));
    const validFiles = nextFiles.filter(isAllowedAttachment);

    if (invalidFiles.length > 0) {
      const message = "仅支持 PDF、Markdown、TXT 格式文件";
      setAttachmentError(message);
      toast.error(message);
    } else {
      setAttachmentError("");
    }

    if (validFiles.length > 0) {
      setAttachments((currentAttachments) => [
        ...currentAttachments,
        ...validFiles.map((file) => ({
          id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
          name: file.name,
          size: file.size,
          type: getAttachmentExtension(file.name).replace(".", "").toUpperCase(),
        })),
      ]);
      toast.success(`已添加 ${validFiles.length} 个附件`);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(event.target.files);
  };

  const handleSendMessage = () => {
    if (!hasMessageContent) {
      return;
    }

    toast.success("消息已添加到本地对话");
    setChatInput("");
    setAttachments([]);
    setIsInputExpanded(false);
  };

  const handleChatKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <section className="h-[calc(100svh-5rem)] min-h-[720px] overflow-hidden bg-white text-slate-900">
      <div className="grid h-full grid-cols-1 overflow-hidden border border-slate-200 bg-white shadow-sm xl:grid-cols-[280px_minmax(520px,1fr)_360px]">
        <aside className="flex min-h-0 flex-col border-b border-slate-200 bg-white xl:border-r xl:border-b-0">
          <div className="shrink-0 border-b border-slate-200 px-3 py-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-[6px] text-slate-600 hover:bg-slate-100"
                aria-label="返回知识库列表"
                onClick={() => navigate("/KnowledgeBases")}
              >
                <ArrowLeft className="size-4" />
              </Button>
              <RecentSwitcher current={current} items={items} />
            </div>
          </div>

          <section className="flex max-h-[420px] min-h-[320px] flex-col px-4 py-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">文档处理状态</h3>
              <Button
                variant="ghost"
                size="icon-xs"
                className="rounded-[6px] text-slate-500"
                aria-label="刷新"
              >
                <Loader2 className="size-4" />
              </Button>
            </div>
            <Tabs
              value={documentTab}
              onValueChange={(value) =>
                setDocumentTab(value as DetailDocumentTab)
              }
              className="min-h-0 flex-1 gap-3"
            >
              <TabsList className="h-9 w-full justify-start rounded-[6px] bg-slate-100 p-1">
                {[
                  { value: "all", label: "全部" },
                  { value: "processing", label: "处理中" },
                  { value: "failed", label: "失败" },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="h-7 flex-none rounded-[5px] px-3 text-xs tracking-normal text-slate-500 normal-case hover:bg-white hover:text-slate-950 data-active:bg-white data-active:text-slate-950"
                  >
                    {tab.label}
                    <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-700">
                      {getDocumentCountByTab(
                        documents,
                        tab.value as DetailDocumentTab,
                      )}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value={documentTab} className="min-h-0 flex-1">
                <div className="h-full min-h-0 overflow-auto">
                  {filteredDocuments.length > 0 ? (
                    filteredDocuments.map((doc) => (
                      <div
                        key={doc.name}
                        className="flex min-w-0 gap-3 border-b border-slate-100 py-3"
                      >
                        <FileBadge type={doc.type} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-medium text-slate-800">
                            {doc.name}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {doc.meta}
                          </div>
                          {doc.error && (
                            <div className="mt-1 truncate text-xs text-orange-600">
                              {doc.error}
                            </div>
                          )}
                        </div>
                        <DocumentStatus status={doc.status} />
                      </div>
                    ))
                  ) : (
                    <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 rounded-[6px] border border-dashed border-slate-200 text-center">
                      <FileText className="size-6 text-slate-400" />
                      <p className="text-xs text-slate-500">
                        {documentTab === "all"
                          ? "暂无文档"
                          : documentTab === "processing"
                            ? "暂无处理中 文档"
                            : "暂无失败 文档"}
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
            <Button
              variant="outline"
              className="mt-4 h-10 rounded-[6px] border-slate-200 text-xs font-medium tracking-normal text-slate-600 normal-case"
              onClick={() => navigate(`/Documents/${current.slug}`)}
            >
              查看全部文档
              <ArrowRight data-icon="inline-end" />
            </Button>
          </section>
        </aside>

        <main className="flex min-h-0 flex-col bg-white">
          <div className="min-h-0 flex-1 overflow-auto bg-white px-5 py-6">
            <div className="mx-auto flex max-w-[760px] flex-col gap-5">
              <div className="flex justify-end gap-3">
                <div className="rounded-[8px] border border-blue-100 bg-blue-50 px-5 py-4 text-sm font-medium text-slate-800 shadow-sm">
                  事件循环是什么？
                </div>
                <div className="flex flex-col items-center gap-1 text-xs text-slate-500">
                  <span className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <UserRound className="size-5" />
                  </span>
                  10:21
                </div>
              </div>

              <div className="flex items-start gap-4">
                <span className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                  <Bot className="size-5" />
                </span>
                <article className="rounded-[8px] border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-700 shadow-sm">
                  <p>
                    事件循环（Event Loop）是 JavaScript
                    运行时的核心机制，用于处理异步任务和回调执行。它使得
                    JavaScript 能够在单线程环境中处理并发操作而不阻塞主线程。
                  </p>

                  <h3 className="mt-4 text-base font-semibold text-slate-900">
                    核心概念
                  </h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>
                      调用栈（Call Stack）：执行同步代码的栈结构，遵循 LIFO
                      原则。
                    </li>
                    <li>
                      任务队列（Task Queue）：存放待执行的宏任务，如
                      setTimeout、I/O、UI 渲染等。
                    </li>
                    <li>
                      微任务队列（Microtask Queue）：存放
                      Promise.then、MutationObserver
                      等微任务，优先级高于宏任务。
                    </li>
                  </ul>

                  <h3 className="mt-4 text-base font-semibold text-slate-900">
                    工作流程
                  </h3>
                  <ol className="mt-2 list-decimal space-y-1 pl-5">
                    <li>执行调用栈中的同步代码，直到栈为空。</li>
                    <li>检查微任务队列，执行所有微任务，直到队列为空。</li>
                    <li>从任务队列中取出一个宏任务，放入调用栈执行。</li>
                    <li>重复步骤 2 和 3。</li>
                  </ol>

                  <h3 className="mt-4 text-base font-semibold text-slate-900">
                    示意图
                  </h3>
                  <div className="mt-3 rounded-[6px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col items-center gap-3 text-xs text-slate-700 sm:flex-row">
                      <div className="rounded-[6px] border border-violet-300 bg-violet-50 px-5 py-3 text-center">
                        调用栈
                        <br />
                        <span className="text-slate-500">(Call Stack)</span>
                      </div>
                      <ArrowRight className="size-5 shrink-0 text-slate-500" />
                      <div className="rounded-[6px] border border-emerald-300 bg-emerald-50 px-5 py-3 text-center">
                        微任务队列
                        <br />
                        <span className="text-slate-500">
                          (Microtask Queue)
                        </span>
                      </div>
                      <ArrowRight className="size-5 shrink-0 text-slate-500" />
                      <div className="rounded-[6px] border border-blue-300 bg-blue-50 px-5 py-3 text-center">
                        任务队列
                        <br />
                        <span className="text-slate-500">(Task Queue)</span>
                      </div>
                    </div>
                    <div className="mt-3 border-t border-dashed border-slate-300 pt-2 text-center text-xs text-slate-500">
                      循环执行
                    </div>
                  </div>

                  <h3 className="mt-4 text-base font-semibold text-slate-900">
                    总结
                  </h3>
                  <p className="mt-2">
                    事件循环通过合理调度任务队列和微任务队列，实现了 JavaScript
                    的非阻塞 I/O 模型，保证了页面的流畅性和响应性。
                  </p>

                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    引用：
                    {[1, 2, 3].map((item) => (
                      <span
                        key={item}
                        className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-blue-700"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </article>
              </div>

              <div className="ml-14 flex items-center gap-4 text-slate-500">
                <Copy className="size-4" />
                <ThumbsUp className="size-4" />
                <ThumbsDown className="size-4" />
              </div>
            </div>
          </div>

          <footer className="shrink-0 border-t border-slate-100 px-5 py-4">
            <div className="mx-auto max-w-[760px] rounded-[8px] border border-slate-200 bg-white p-3 shadow-sm">
              {attachments.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {attachments.map((attachment) => (
                    <span
                      key={attachment.id}
                      className="inline-flex max-w-full items-center gap-2 rounded-[6px] border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600"
                    >
                      <FileText className="size-3.5 shrink-0" />
                      <span className="max-w-[180px] truncate">
                        {attachment.name}
                      </span>
                      <span className="shrink-0 text-slate-400">
                        {formatFileSize(attachment.size)}
                      </span>
                      <button
                        type="button"
                        className="rounded text-slate-400 transition-colors hover:text-slate-700"
                        aria-label={`移除 ${attachment.name}`}
                        onClick={() => removeAttachment(attachment.id)}
                      >
                        <X className="size-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-start gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="mt-1 rounded-[6px] text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="添加附件"
                  onClick={() => setAttachmentSheetOpen(true)}
                >
                  <Paperclip />
                </Button>
                <Textarea
                  value={chatInput}
                  maxLength={MAX_CHAT_MESSAGE_LENGTH}
                  onChange={(event) => setChatInput(event.target.value)}
                  onKeyDown={handleChatKeyDown}
                  className="min-h-12 flex-1 resize-none rounded-[6px] border-transparent px-2 py-2 text-sm leading-6 placeholder:text-slate-400 focus-visible:border-transparent focus-visible:ring-0"
                  style={{ height: chatInputHeight, maxHeight: "30vh" }}
                  placeholder="添加文档或输入问题，Enter 发送，Shift + Enter 换行"
                  aria-label="输入问题"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="mt-1 rounded-[6px] text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  aria-label={isInputExpanded ? "收起输入框" : "展开输入框"}
                  onClick={() =>
                    setIsInputExpanded((currentValue) => !currentValue)
                  }
                >
                  {isInputExpanded ? <Minimize2 /> : <Maximize2 />}
                </Button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-[6px] border-slate-200 px-3 text-xs font-medium tracking-normal normal-case"
                  aria-pressed={ragEnabled}
                  onClick={handleRagToggle}
                >
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      ragEnabled ? "bg-emerald-500" : "bg-slate-300",
                    )}
                  />
                  {ragEnabled ? "RAG 已启用" : "RAG 已关闭"}
                </Button>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>
                    {chatInput.length}/{MAX_CHAT_MESSAGE_LENGTH}
                  </span>
                  <Button
                    type="button"
                    size="icon-sm"
                    className="rounded-[6px] bg-blue-600 text-white hover:bg-blue-700"
                    aria-label="发送"
                    disabled={!hasMessageContent}
                    onClick={handleSendMessage}
                  >
                    <Send className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          </footer>
        </main>

        <aside className="flex min-h-0 flex-col border-t border-slate-200 bg-white xl:border-t-0 xl:border-l">
          <header className="flex h-16 shrink-0 items-center gap-2 px-6">
            <h2 className="text-base font-semibold">引用来源</h2>
            <Info className="size-4 text-slate-400" />
          </header>
          <div className="min-h-0 flex-1 overflow-auto px-5 pb-5">
            <div className="flex flex-col gap-4">
              {sources.map((source) => (
                <article
                  key={source.id}
                  className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-3 flex gap-3">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded bg-blue-600 text-xs font-semibold text-white">
                      {source.id}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <FileBadge type={source.type} />
                        <span className="truncate text-xs font-medium text-slate-800">
                          {source.file}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        {source.meta}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">相似度</div>
                      <div className="text-lg font-semibold text-emerald-600">
                        {source.score}
                      </div>
                    </div>
                  </div>
                  <p className="rounded-[6px] border border-slate-200 bg-slate-50 p-3 text-xs leading-6 text-slate-600">
                    {source.excerpt}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 h-7 rounded-[6px] px-0 text-xs font-medium tracking-normal text-blue-700 normal-case hover:bg-transparent"
                  >
                    查看原文
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                </article>
              ))}
            </div>
            <Button
              variant="outline"
              className="mt-6 h-10 w-full rounded-[6px] border-slate-200 text-xs font-medium tracking-normal text-slate-600 normal-case"
            >
              查看全部来源 (3)
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </aside>
      </div>
      <Sheet open={attachmentSheetOpen} onOpenChange={setAttachmentSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>上传附件</SheetTitle>
            <SheetDescription>
              仅用于当前对话输入，支持 PDF、Markdown、TXT 格式。
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-4 px-8 pb-8">
            <button
              type="button"
              className="flex min-h-[160px] flex-col items-center justify-center gap-3 rounded-[8px] border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition-colors hover:border-blue-300 hover:bg-blue-50"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-8 text-slate-600" />
              <span className="text-sm font-medium text-slate-900">
                选择 PDF、Markdown 或 TXT 文件
              </span>
              <span className="text-xs text-slate-500">
                支持 .pdf、.md、.markdown、.txt，可多选
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.md,.markdown,.txt,application/pdf,text/plain,text/markdown"
              className="hidden"
              onChange={handleFileChange}
            />
            {attachmentError && (
              <p className="rounded-[6px] border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
                {attachmentError}
              </p>
            )}
            {attachments.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="text-xs font-medium text-slate-500">
                  已添加附件
                </div>
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-3 rounded-[6px] border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <FileText className="size-4 shrink-0 text-slate-500" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-slate-800">
                        {attachment.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {attachment.type} · {formatFileSize(attachment.size)}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="rounded-[5px] text-slate-500 hover:bg-slate-100"
                      aria-label={`移除 ${attachment.name}`}
                      onClick={() => removeAttachment(attachment.id)}
                    >
                      <X />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-[6px] tracking-normal normal-case"
              onClick={() => setAttachmentSheetOpen(false)}
            >
              完成
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </section>
  );
}

const KnowledgeBases = () => {
  const { knowledgeBaseId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState(initialKnowledgeBases);
  const current =
    items.find((item) => item.slug === knowledgeBaseId) ?? items[0];

  const toggleFeatured = (id: string) => {
    const target = items.find((item) => item.id === id);

    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id ? { ...item, featured: !item.featured } : item,
      ),
    );

    if (target) {
      toast.success(
        target.featured ? "已取消精选知识库" : "已标记为精选知识库",
      );
    }
  };

  const createKnowledgeBase = (item: KnowledgeBase) => {
    setItems((currentItems) => [item, ...currentItems]);
    toast.success(`已新建知识库：${item.name}`);
  };

  const deleteKnowledgeBase = (id: string) => {
    const target = items.find((item) => item.id === id);

    setItems((currentItems) => currentItems.filter((item) => item.id !== id));

    if (target) {
      toast.success(`已删除知识库：${target.name}`);

      if (knowledgeBaseId === target.slug) {
        navigate("/KnowledgeBases");
      }
    }
  };

  if (!knowledgeBaseId) {
    return (
      <KnowledgeBaseListView
        items={items}
        onCreate={createKnowledgeBase}
        onToggleFeatured={toggleFeatured}
        onDelete={deleteKnowledgeBase}
      />
    );
  }

  return <KnowledgeBaseChatView current={current} items={items} />;
};

export default KnowledgeBases;
