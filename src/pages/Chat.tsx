import {
  Bot,
  CheckCircle2,
  ChevronDown,
  MessageSquarePlus,
  Monitor,
  MoreHorizontal,
  Paperclip,
  SearchCheck,
  Send,
  Square,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ConversationItem = {
  title: string;
  time: string;
  messages: number;
  sources: number;
  active?: boolean;
};

type SourceItem = {
  rank: number;
  file: string;
  type: "pdf" | "md" | "txt";
  chunk: string;
  page: string;
  score: string;
  excerpt: string;
};

type CitationChip = {
  label: string;
  file: string;
  chunk: string;
};

type StatusMetric = {
  label: string;
  value: string;
};

const conversations: ConversationItem[] = [
  {
    title: "事件循环是什么？",
    time: "10:21",
    messages: 8,
    sources: 3,
    active: true,
  },
  {
    title: "React Hooks 的规则",
    time: "昨天 22:15",
    messages: 6,
    sources: 2,
  },
  {
    title: "Promise 和 async/await",
    time: "昨天 16:40",
    messages: 5,
    sources: 3,
  },
  {
    title: "前端性能优化清单",
    time: "05-17 14:10",
    messages: 7,
    sources: 4,
  },
  {
    title: "React 的渲染流程",
    time: "05-16 10:32",
    messages: 6,
    sources: 3,
  },
  {
    title: "HTTP 缓存机制",
    time: "05-15 09:20",
    messages: 4,
    sources: 2,
  },
];

const sources: SourceItem[] = [
  {
    rank: 1,
    file: "javascript-event-loop.pdf",
    type: "pdf",
    chunk: "Chunk #03",
    page: "第 2 页",
    score: "0.92",
    excerpt:
      "事件循环（Event Loop）是 JavaScript 运行机制的核心。主线程只负责执行同步代码，当遇到异步任务时，会将回调函数交给宿主环境...",
  },
  {
    rank: 2,
    file: "frontend-interview-notes.md",
    type: "md",
    chunk: "Chunk #12",
    page: "第 5 页",
    score: "0.88",
    excerpt:
      "宏任务（Macrotask）包括：setTimeout、setInterval、I/O、UI 渲染等。微任务（Microtask）包括：Promise.then、MutationObserver...",
  },
  {
    rank: 3,
    file: "promise-guide.txt",
    type: "txt",
    chunk: "Chunk #07",
    page: "第 3 页",
    score: "0.82",
    excerpt:
      "Promise 的回调函数（then/catch/finally）会被加入微任务队列。在当前宏任务执行完毕后，浏览器会优先清空微任务队列...",
  },
];

const citations: CitationChip[] = [
  {
    label: "[1]",
    file: "javascript-event-loop.pdf",
    chunk: "#03",
  },
  {
    label: "[2]",
    file: "frontend-interview-notes.md",
    chunk: "#12",
  },
  {
    label: "[3]",
    file: "promise-guide.txt",
    chunk: "#07",
  },
];

const statusMetrics: StatusMetric[] = [
  {
    label: "topK",
    value: "6",
  },
  {
    label: "相似度度量",
    value: "cosine",
  },
  {
    label: "Embedding",
    value: "text-embedding-3-small",
  },
];

const fileTypeStyles: Record<SourceItem["type"], string> = {
  pdf: "bg-red-600 text-white",
  md: "bg-slate-900 text-white",
  txt: "bg-slate-700 text-white",
};

function FileBadge({ type }: { type: SourceItem["type"] }) {
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-[3px] text-[8px] font-bold uppercase leading-none",
        fileTypeStyles[type],
      )}
    >
      {type === "md" ? "MD" : type}
    </span>
  );
}

function ConversationRow({ item }: { item: ConversationItem }) {
  return (
    <button
      type="button"
      className={cn(
        "group relative flex w-full min-w-0 flex-col gap-2 rounded-[6px] border px-3 py-3 text-left transition-colors",
        item.active
          ? "border-blue-200 bg-blue-50/70 text-slate-950 shadow-sm"
          : "border-transparent bg-white text-slate-700 hover:bg-slate-50",
      )}
    >
      {item.active && (
        <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-blue-600" />
      )}
      <div className="flex min-w-0 items-center justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-medium">
          {item.title}
        </span>
        {item.active && (
          <span className="size-1.5 shrink-0 rounded-full bg-blue-600" />
        )}
      </div>
      <div className="flex min-w-0 items-center gap-2 text-xs text-slate-500">
        <span className="shrink-0">{item.time}</span>
        <span>·</span>
        <span className="shrink-0">{item.messages} 条消息</span>
        <span>·</span>
        <span className="min-w-0 truncate">{item.sources} 个来源</span>
      </div>
    </button>
  );
}

function SourceCard({ source }: { source: SourceItem }) {
  return (
    <article className="rounded-[8px] border border-slate-200 bg-white p-3 shadow-sm">
      <header className="flex min-w-0 items-start gap-2">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-[4px] bg-blue-600 text-xs font-semibold text-white">
          {source.rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <FileBadge type={source.type} />
            <span className="min-w-0 truncate text-xs font-medium text-slate-800">
              {source.file}
            </span>
          </div>
          <div className="mt-1 flex min-w-0 gap-2 text-xs text-slate-500">
            <span className="shrink-0">{source.chunk}</span>
            <span>·</span>
            <span className="min-w-0 truncate">{source.page}</span>
          </div>
        </div>
        <div className="shrink-0 text-right text-xs">
          <div className="text-slate-500">相似度</div>
          <div className="font-semibold text-emerald-600">{source.score}</div>
        </div>
      </header>
      <p className="mt-3 line-clamp-4 rounded-[6px] border border-slate-200 bg-slate-50/70 p-3 text-xs leading-5 text-slate-600">
        {source.excerpt}
      </p>
      <Button
        type="button"
        variant="outline"
        size="xs"
        className="mt-3 h-7 rounded-[5px] border-blue-100 bg-white px-3 text-xs font-medium tracking-normal text-blue-600 normal-case hover:bg-blue-50"
      >
        查看片段
      </Button>
    </article>
  );
}

function CitationList() {
  return (
    <div className="mt-4">
      <div className="mb-2 text-xs font-medium text-slate-700">引用来源：</div>
      <div className="flex flex-wrap gap-2">
        {citations.map((citation) => (
          <span
            key={citation.label}
            className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-[5px] border border-blue-100 bg-blue-50 px-2 py-1 text-xs text-blue-700"
          >
            <span className="shrink-0">{citation.label}</span>
            <span className="min-w-0 truncate">{citation.file}</span>
            <span className="shrink-0">{citation.chunk}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

const Chat = () => {
  return (
    <section className="h-[calc(100svh-5rem)] min-h-[720px] overflow-hidden bg-white text-slate-900">
      <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden border border-slate-200 bg-white shadow-sm xl:grid-cols-[280px_minmax(520px,1fr)_360px]">
        <aside
          aria-label="最近会话"
          className="flex min-h-0 flex-col border-b border-slate-200 bg-white xl:border-r xl:border-b-0"
        >
          <div className="shrink-0 px-4 py-4">
            <Button
              type="button"
              className="h-10 w-full rounded-[6px] bg-blue-600 text-sm font-medium tracking-normal text-white normal-case shadow-sm hover:bg-blue-700"
            >
              <MessageSquarePlus data-icon="inline-start" className="size-4" />
              新建会话
            </Button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-3 pb-4">
            <div className="mb-2 px-1 text-xs font-medium text-slate-500">
              最近会话
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-auto pr-1">
              {conversations.map((item) => (
                <ConversationRow key={item.title} item={item} />
              ))}
            </div>
            <button
              type="button"
              className="mt-3 flex h-9 items-center gap-2 px-1 text-left text-xs font-medium text-slate-500 hover:text-blue-600"
            >
              查看全部会话
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </aside>

        <main
          aria-label="聊天问答"
          className="flex min-h-0 flex-col border-b border-slate-200 bg-white xl:border-b-0"
        >
          <header className="flex min-h-16 shrink-0 flex-col gap-3 border-b border-slate-200 px-4 py-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="text-sm text-slate-600">知识库：</span>
              <button
                type="button"
                className="flex h-8 min-w-0 max-w-[220px] items-center gap-2 rounded-[5px] border border-transparent bg-white px-2 text-sm font-medium text-slate-700 hover:border-slate-200"
              >
                <span className="min-w-0 truncate">Frontend Interview</span>
                <ChevronDown className="size-4 shrink-0 text-slate-500" />
              </button>
              <span className="rounded-[5px] border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500">
                12 个文档
              </span>
              <span className="rounded-[5px] border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500">
                168 个 chunks
              </span>
              <span className="inline-flex items-center gap-1 rounded-[5px] border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                RAG 已启用
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon-xs"
                aria-label="切换视图"
                className="rounded-[5px] border-slate-200 text-slate-600"
              >
                <Monitor className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-xs"
                aria-label="更多操作"
                className="rounded-[5px] border-slate-200 text-slate-600"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-auto bg-white px-4 py-5 lg:px-8">
            <div className="mx-auto flex max-w-[760px] flex-col gap-5">
              <div className="flex justify-end gap-3">
                <div className="min-w-0 rounded-[8px] border border-blue-100 bg-blue-50 px-5 py-3 text-sm font-medium leading-6 text-slate-800 shadow-sm">
                  事件循环是什么？宏任务和微任务有什么区别？
                </div>
                <div className="hidden shrink-0 flex-col items-center gap-1 text-xs text-slate-500 sm:flex">
                  <span className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    A
                  </span>
                  <span>10:21</span>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <span className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                  <Bot className="size-5" />
                </span>
                <article className="min-w-0 flex-1 rounded-[8px] border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-700 shadow-sm">
                  <h2 className="text-base font-semibold text-slate-900">
                    核心概念
                  </h2>
                  <p className="mt-2">
                    事件循环（Event Loop）是 JavaScript 在浏览器或 Node.js
                    环境中协调代码执行、处理异步任务和回调的核心机制。它使得
                    JavaScript 能够在单线程环境中处理并发操作，而不阻塞主线程。
                  </p>

                  <h2 className="mt-5 text-base font-semibold text-slate-900">
                    执行顺序
                  </h2>
                  <ol className="mt-2 list-decimal space-y-1 pl-5">
                    <li>执行同步代码，遇到异步操作时，将回调交给对应的任务队列。</li>
                    <li>同步代码执行完毕后，开始检查微任务队列。</li>
                    <li>若微任务队列不为空，则依次执行所有微任务，直到队列为空。</li>
                    <li>然后从宏任务队列中取出一个任务执行。</li>
                    <li>执行完该宏任务后，再次检查微任务队列，重复上述过程。</li>
                    <li>不断循环以上步骤，这就是事件循环。</li>
                  </ol>

                  <h2 className="mt-5 text-base font-semibold text-slate-900">
                    常见误区
                  </h2>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>微任务会在当前宏任务结束后立即执行，因此它的优先级高于宏任务。</li>
                    <li>微任务会在每个宏任务执行完后清空，不会插队到当前宏任务中执行。</li>
                    <li>
                      setTimeout 的回调是宏任务，Promise.then /
                      queueMicrotask 是微任务。
                    </li>
                  </ul>

                  <CitationList />
                </article>
              </div>

              <div className="ml-0 rounded-[8px] border border-emerald-200 bg-emerald-50/50 px-4 py-3 text-xs text-slate-600 sm:ml-14">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                    <span className="min-w-0 truncate">
                      检索到 6 个相关片段 · 已引用 3 个来源
                    </span>
                  </span>
                  <span className="shrink-0 text-slate-500">耗时 1.23s</span>
                </div>
              </div>
            </div>
          </div>

          <footer className="shrink-0 border-t border-slate-100 px-4 py-4 lg:px-6">
            <div className="mx-auto max-w-[800px] rounded-[8px] border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex min-h-10 items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="添加附件"
                  className="size-9 rounded-[5px] border-slate-200 text-slate-600"
                >
                  <Paperclip className="size-4" />
                </Button>
                <input
                  aria-label="继续追问"
                  className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                  placeholder="继续追问这个知识库..."
                  readOnly
                />
              </div>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex h-8 items-center gap-2 rounded-[5px] border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600"
                  >
                    <span className="size-2 rounded-full bg-emerald-500" />
                    RAG enabled
                    <ChevronDown className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-8 items-center gap-2 rounded-[5px] border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600"
                  >
                    <Bot className="size-3.5" />
                    gpt-4o-mini
                    <ChevronDown className="size-3.5" />
                  </button>
                </div>
                <div className="flex shrink-0 items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-[5px] border-red-100 bg-red-50 px-3 text-xs font-medium tracking-normal text-red-600 normal-case hover:bg-red-100"
                  >
                    <Square data-icon="inline-start" className="size-3 fill-current" />
                    停止生成
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 rounded-[5px] bg-blue-600 px-3 text-xs font-medium tracking-normal text-white normal-case hover:bg-blue-700"
                  >
                    发送
                    <Send data-icon="inline-end" className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="mx-auto mt-2 max-w-[800px] px-1 text-xs text-slate-500">
              Shift + Enter 换行，Enter 发送
            </div>
          </footer>
        </main>

        <aside
          aria-label="引用来源"
          className="flex min-h-0 flex-col bg-white xl:border-l xl:border-slate-200"
        >
          <header className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-base font-semibold text-slate-900">
                引用来源
              </h2>
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-500">
                3
              </span>
            </div>
            <button
              type="button"
              className="flex h-8 shrink-0 items-center gap-2 rounded-[5px] border border-slate-200 bg-white px-3 text-xs text-slate-500"
            >
              相似度排序
              <ChevronDown className="size-3.5" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
            <div className="flex flex-col gap-3">
              {sources.map((source) => (
                <SourceCard key={source.file} source={source} />
              ))}
            </div>

            <section className="mt-4 rounded-[8px] border border-slate-200 bg-white p-4 text-xs leading-6 text-slate-600 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">
                选中来源详情
              </h3>
              <div className="font-medium text-slate-800">
                javascript-event-loop.pdf
                <span className="ml-2 font-normal text-slate-500">Chunk #03</span>
              </div>
              <p className="mt-2">
                事件循环的运行流程：1. 执行同步代码；2.
                遇到异步任务，将回调放入相应队列；3.
                当前宏任务执行完毕；4. 清空微任务队列；5.
                执行一个宏任务；6. 重复 4~5 步骤。
              </p>
              <p className="mt-2 text-slate-500">
                这种机制保证了 JavaScript 的高效执行和良好的用户体验。
              </p>
              <div className="mt-2 text-slate-400">第 2 页 · 字符 256 - 512</div>
            </section>

            <section className="mt-4 rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-900">检索调试</h3>
                <SearchCheck className="size-4 text-slate-400" />
              </div>
              <div className="flex flex-col gap-2">
                {statusMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="grid grid-cols-[88px_minmax(0,1fr)] gap-2 text-xs"
                  >
                    <span className="text-slate-500">{metric.label}：</span>
                    <span className="min-w-0 truncate text-slate-700">
                      {metric.value}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default Chat;
