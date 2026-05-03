import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Grid2X2,
  Info,
  LayoutList,
  Loader2,
  MoreVertical,
  Paperclip,
  Plus,
  Search,
  Send,
  ThumbsDown,
  ThumbsUp,
  TriangleAlert,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  status: "indexed" | "processing" | "failed";
  theme: {
    icon: string;
    iconClass: string;
    coverClass: string;
    coverAccent: string;
  };
  recent: boolean;
  featured: boolean;
};

const knowledgeBases: KnowledgeBase[] = [
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
    status: "indexed",
    theme: {
      icon: "FI",
      iconClass: "bg-blue-100 text-blue-700 ring-blue-200",
      coverClass: "from-sky-50 via-white to-blue-100",
      coverAccent: "bg-sky-400",
    },
    recent: true,
    featured: true,
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
    status: "indexed",
    theme: {
      icon: "GP",
      iconClass: "bg-violet-100 text-violet-700 ring-violet-200",
      coverClass: "from-violet-50 via-white to-fuchsia-100",
      coverAccent: "bg-violet-400",
    },
    recent: true,
    featured: true,
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
    status: "processing",
    theme: {
      icon: "DB",
      iconClass: "bg-emerald-100 text-emerald-700 ring-emerald-200",
      coverClass: "from-emerald-50 via-white to-teal-100",
      coverAccent: "bg-emerald-400",
    },
    recent: true,
    featured: true,
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
    status: "indexed",
    theme: {
      icon: "EN",
      iconClass: "bg-amber-100 text-amber-700 ring-amber-200",
      coverClass: "from-amber-50 via-white to-orange-100",
      coverAccent: "bg-amber-400",
    },
    recent: false,
    featured: true,
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
    status: "failed",
    theme: {
      icon: "BA",
      iconClass: "bg-rose-100 text-rose-700 ring-rose-200",
      coverClass: "from-rose-50 via-white to-slate-100",
      coverAccent: "bg-rose-400",
    },
    recent: false,
    featured: false,
  },
];

const documents = [
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

function DocumentStatus({ status }: { status: keyof typeof statusStyles }) {
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

function RecentCard({
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
      className="group flex min-h-[160px] flex-col rounded-[8px] border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <KnowledgeBaseMark item={item} size="lg" />
        <MoreVertical className="size-5 text-slate-400" />
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
    </button>
  );
}

// 知识库列表视图
function KnowledgeBaseListView() {
  const navigate = useNavigate();
  const featuredItems = knowledgeBases
    .filter((item) => item.featured)
    .slice(0, 4);

  const openKnowledgeBase = (slug: string) => {
    navigate(`/KnowledgeBases/${slug}`);
  };

  return (
    <section className="min-h-[calc(100svh-5rem)] bg-slate-50/60 px-3 py-4 text-slate-900 sm:px-5">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-10">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {["全部", "我的知识库", "精选知识库"].map((item, index) => (
              <Button
                key={item}
                variant={index === 0 ? "default" : "ghost"}
                className={cn(
                  "h-10 rounded-full px-5 text-sm font-semibold tracking-normal normal-case",
                  index === 0
                    ? "bg-sky-300 text-white hover:bg-sky-400"
                    : "text-slate-600 hover:bg-white hover:text-slate-950",
                )}
              >
                {item}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full border-slate-200 bg-white text-slate-700"
            >
              <Search className="size-5" />
            </Button>
            <div className="flex overflow-hidden rounded-full border border-slate-200 bg-white">
              <Button
                className="h-10 rounded-none bg-sky-300 px-3 text-white hover:bg-sky-400"
                aria-label="网格视图"
              >
                <Check className="size-4" />
                <Grid2X2 className="size-4" />
              </Button>
              <Button
                variant="ghost"
                className="h-10 rounded-none px-3 text-slate-600"
                aria-label="列表视图"
              >
                <LayoutList className="size-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              className="h-10 rounded-full border-slate-200 bg-white px-5 text-sm tracking-normal normal-case"
            >
              最近
              <ChevronDown data-icon="inline-end" />
            </Button>
            <Button className="h-10 rounded-full bg-white px-5 text-sm tracking-normal text-slate-900 shadow-sm hover:bg-slate-50 normal-case">
              <Plus data-icon="inline-start" />
              新建
            </Button>
          </div>
        </header>

        <section>
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold tracking-normal text-slate-950">
              精选知识库
            </h2>
            <Button
              variant="outline"
              className="hidden h-10 rounded-full border-slate-200 bg-white px-5 text-sm tracking-normal normal-case sm:flex"
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

        <section>
          <h2 className="mb-5 text-2xl font-semibold tracking-normal text-slate-950">
            最近打开的知识库
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <button
              type="button"
              className="flex min-h-[160px] flex-col items-center justify-center gap-4 rounded-[8px] border border-dashed border-slate-300 bg-white text-slate-500 transition-all duration-300 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
            >
              <span className="flex size-14 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                <Plus className="size-7" />
              </span>
              <span className="text-sm font-semibold">新建知识库</span>
            </button>
            {knowledgeBases.map((item) => (
              <RecentCard
                key={item.id}
                item={item}
                onOpen={openKnowledgeBase}
              />
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function RecentSwitcher({ current }: { current: KnowledgeBase }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const recentItems = knowledgeBases.filter((item) => item.recent).slice(0, 3);

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

function KnowledgeBaseChatView({ current }: { current: KnowledgeBase }) {
  const navigate = useNavigate();

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
              <RecentSwitcher current={current} />
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
            <div className="mb-3 flex items-center gap-5 text-xs">
              <span className="text-blue-700">
                全部{" "}
                <span className="rounded bg-blue-50 px-1.5 py-0.5">
                  {current.docs}
                </span>
              </span>
              <span className="text-slate-500">
                处理中 <span className="text-slate-700">1</span>
              </span>
              <span className="text-slate-500">
                失败 <span className="text-slate-700">1</span>
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              {documents.map((doc) => (
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
                  <DocumentStatus
                    status={doc.status as keyof typeof statusStyles}
                  />
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              className="mt-4 h-10 rounded-[6px] border-slate-200 text-xs font-medium tracking-normal text-slate-600 normal-case"
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
              <div className="flex items-center gap-3">
                <Paperclip className="size-5 shrink-0 text-slate-500" />
                <input
                  className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                  placeholder="添加文档或输入问题，Enter 发送，Shift + Enter 换行"
                  aria-label="输入问题"
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-[6px] border-slate-200 px-3 text-xs font-medium tracking-normal normal-case"
                >
                  <span className="size-2 rounded-full bg-emerald-500" />
                  RAG 已启用
                  <ChevronDown data-icon="inline-end" />
                </Button>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>0/4000</span>
                  <Button
                    size="icon-sm"
                    className="rounded-[6px] bg-blue-600 text-white hover:bg-blue-700"
                    aria-label="发送"
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
    </section>
  );
}

const KnowledgeBases = () => {
  const { knowledgeBaseId } = useParams();
  const current =
    knowledgeBases.find((item) => item.slug === knowledgeBaseId) ??
    knowledgeBases[0];

  if (!knowledgeBaseId) {
    return <KnowledgeBaseListView />;
  }

  return <KnowledgeBaseChatView current={current} />;
};

export default KnowledgeBases;
