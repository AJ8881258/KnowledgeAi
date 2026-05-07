import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bot,
  CheckCircle2,
  Maximize2,
  MessageSquarePlus,
  Minimize2,
  MoreHorizontal,
  SearchCheck,
  Star,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import {
  ChatComposer,
  type ChatComposerPayload,
} from "@/components/chat/ChatComposer";
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
import { cn } from "@/lib/utils";

type ConversationMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
  citations?: CitationChip[];
};

type ConversationItem = {
  id: string;
  title: string;
  time: string;
  updatedAt: string;
  sourceCount: number;
  favorite: boolean;
  messages: ConversationMessage[];
};

type SourceItem = {
  id: string;
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

type SortDirection = "asc" | "desc";

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

const initialConversations: ConversationItem[] = [
  {
    id: "abc",
    title: "事件循环是什么？",
    time: "10:21",
    updatedAt: "2026-05-07T10:21:00.000+08:00",
    sourceCount: 3,
    favorite: true,
    messages: [
      {
        id: "abc-user-1",
        role: "user",
        time: "10:21",
        content: "事件循环是什么？宏任务和微任务有什么区别？",
      },
      {
        id: "abc-assistant-1",
        role: "assistant",
        time: "10:21",
        content:
          "事件循环（Event Loop）是 JavaScript 在浏览器或 Node.js 环境中协调同步代码、异步任务和回调执行的核心机制。主线程先执行调用栈中的同步代码，随后清空微任务队列，再从宏任务队列中取出一个任务执行，并不断重复这个过程。\n\n微任务通常包括 Promise.then、queueMicrotask、MutationObserver 等，会在当前宏任务结束后立即执行。宏任务通常包括 setTimeout、setInterval、I/O、UI 渲染等，每次事件循环通常只取一个宏任务执行。\n\n常见误区是把 Promise 本身理解成微任务。真正进入微任务队列的是 then、catch、finally 注册的回调，而不是 Promise 构造函数里的同步代码。",
        citations,
      },
    ],
  },
  {
    id: "hooks-rules",
    title: "React Hooks 的规则",
    time: "昨天 22:15",
    updatedAt: "2026-05-06T22:15:00.000+08:00",
    sourceCount: 2,
    favorite: false,
    messages: [
      {
        id: "hooks-user-1",
        role: "user",
        time: "22:15",
        content: "React Hooks 为什么不能写在条件语句里？",
      },
      {
        id: "hooks-assistant-1",
        role: "assistant",
        time: "22:15",
        content:
          "Hooks 依赖稳定的调用顺序来关联每次渲染中的状态槽位。把 Hook 放进条件语句会导致不同渲染之间调用顺序不一致，React 无法可靠匹配 state、effect 等内部记录。",
        citations: citations.slice(0, 2),
      },
    ],
  },
  {
    id: "promise-async",
    title: "Promise 和 async/await",
    time: "昨天 16:40",
    updatedAt: "2026-05-06T16:40:00.000+08:00",
    sourceCount: 3,
    favorite: false,
    messages: [
      {
        id: "promise-user-1",
        role: "user",
        time: "16:40",
        content: "Promise 和 async/await 的关系是什么？",
      },
      {
        id: "promise-assistant-1",
        role: "assistant",
        time: "16:40",
        content:
          "async/await 是 Promise 的语法糖。async 函数总是返回 Promise，await 会暂停当前 async 函数的后续执行，等待 Promise settled 后再把后续逻辑放回微任务链路中继续执行。",
        citations: citations.slice(1),
      },
    ],
  },
  {
    id: "frontend-performance",
    title: "前端性能优化清单",
    time: "05-17 14:10",
    updatedAt: "2026-05-05T14:10:00.000+08:00",
    sourceCount: 4,
    favorite: false,
    messages: [
      {
        id: "perf-user-1",
        role: "user",
        time: "14:10",
        content: "整理一份前端性能优化面试清单。",
      },
    ],
  },
  {
    id: "react-rendering",
    title: "React 的渲染流程",
    time: "05-16 10:32",
    updatedAt: "2026-05-04T10:32:00.000+08:00",
    sourceCount: 3,
    favorite: true,
    messages: [
      {
        id: "render-user-1",
        role: "user",
        time: "10:32",
        content: "React 从 setState 到 DOM 更新发生了什么？",
      },
    ],
  },
  {
    id: "http-cache",
    title: "HTTP 缓存机制",
    time: "05-15 09:20",
    updatedAt: "2026-05-03T09:20:00.000+08:00",
    sourceCount: 2,
    favorite: false,
    messages: [
      {
        id: "cache-user-1",
        role: "user",
        time: "09:20",
        content: "强缓存和协商缓存怎么区分？",
      },
    ],
  },
];

const sources: SourceItem[] = [
  {
    id: "event-loop-pdf-03",
    file: "javascript-event-loop.pdf",
    type: "pdf",
    chunk: "Chunk #03",
    page: "第 2 页",
    score: "0.92",
    excerpt:
      "事件循环（Event Loop）是 JavaScript 运行机制的核心。主线程负责执行同步代码，遇到异步任务时会将回调交给宿主环境，并在后续事件循环中调度执行。",
  },
  {
    id: "frontend-notes-12",
    file: "frontend-interview-notes.md",
    type: "md",
    chunk: "Chunk #12",
    page: "第 5 页",
    score: "0.88",
    excerpt:
      "宏任务包括 setTimeout、setInterval、I/O、UI 渲染等。微任务包括 Promise.then、MutationObserver、queueMicrotask 等，会在当前宏任务结束后优先清空。",
  },
  {
    id: "promise-guide-07",
    file: "promise-guide.txt",
    type: "txt",
    chunk: "Chunk #07",
    page: "第 3 页",
    score: "0.82",
    excerpt:
      "Promise 的 then/catch/finally 回调会被加入微任务队列。在当前宏任务执行完毕后，浏览器会优先清空微任务队列，再进入下一个宏任务。",
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

function getLatestConversation(items: ConversationItem[]) {
  return [...items].sort(
    (first, second) =>
      new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime(),
  )[0];
}

function getNowTime() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function createLocalId(prefix: string) {
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Date.now());

  return `${prefix}-${randomId}`;
}

function createEmptyConversation(): ConversationItem {
  const now = new Date();

  return {
    id: createLocalId("chat"),
    title: "新的会话",
    time: getNowTime(),
    updatedAt: now.toISOString(),
    sourceCount: 0,
    favorite: false,
    messages: [],
  };
}

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

function ConversationRow({
  item,
  active,
  onOpen,
}: {
  item: ConversationItem;
  active: boolean;
  onOpen: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item.id)}
      className={cn(
        "group relative flex w-full min-w-0 flex-col gap-2 rounded-[6px] border px-3 py-3 text-left transition-colors",
        active
          ? "border-blue-200 bg-blue-50/70 text-slate-950 shadow-sm"
          : "border-transparent bg-white text-slate-700 hover:bg-slate-50",
      )}
    >
      {active && (
        <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-blue-600" />
      )}
      <div className="flex min-w-0 items-center justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-medium">
          {item.title}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {item.favorite && (
            <Star className="size-3.5 fill-amber-400 text-amber-500" />
          )}
          {active && <span className="size-1.5 rounded-full bg-blue-600" />}
        </span>
      </div>
      <div className="flex min-w-0 items-center gap-2 text-xs text-slate-500">
        <span className="shrink-0">{item.time}</span>
        <span>·</span>
        <span className="shrink-0">{item.messages.length} 条消息</span>
        <span>·</span>
        <span className="min-w-0 truncate">{item.sourceCount} 个来源</span>
      </div>
    </button>
  );
}

function SourceCard({ source, rank }: { source: SourceItem; rank: number }) {
  return (
    <article className="rounded-[8px] border border-slate-200 bg-white p-3 shadow-sm">
      <header className="flex min-w-0 items-start gap-2">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-[4px] bg-blue-600 text-xs font-semibold text-white">
          {rank}
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

function CitationList({ items }: { items: CitationChip[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <div className="mb-2 text-xs font-medium text-slate-700">引用来源：</div>
      <div className="flex flex-wrap gap-2">
        {items.map((citation) => (
          <span
            key={`${citation.label}-${citation.file}`}
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

function MessageBubble({ message }: { message: ConversationMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end gap-3">
        <div className="min-w-0 rounded-[8px] border border-blue-100 bg-blue-50 px-5 py-3 text-sm font-medium leading-6 text-slate-800 shadow-sm">
          {message.content}
        </div>
        <div className="hidden shrink-0 flex-col items-center gap-1 text-xs text-slate-500 sm:flex">
          <span className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <UserRound className="size-4" />
          </span>
          <span>{message.time}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-4">
      <span className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-1 ring-blue-100">
        <Bot className="size-5" />
      </span>
      <article className="min-w-0 flex-1 rounded-[8px] border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-700 shadow-sm">
        {message.content.split("\n\n").map((paragraph) => (
          <p key={paragraph} className="mt-2 first:mt-0">
            {paragraph}
          </p>
        ))}
        <CitationList items={message.citations ?? []} />
      </article>
    </div>
  );
}

function EmptyConversation() {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-[8px] border border-dashed border-slate-200 bg-slate-50/50 px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-1 ring-blue-100">
        <Bot className="size-6" />
      </span>
      <div>
        <h2 className="text-base font-semibold text-slate-900">新的空会话</h2>
        <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
          输入一个问题后，会在本地追加用户消息和一条 mock 回答。当前不请求后端接口。
        </p>
      </div>
    </div>
  );
}

const Chat = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState(initialConversations);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sourceSortDirection, setSourceSortDirection] =
    useState<SortDirection>("desc");
  const sortedConversations = useMemo(
    () =>
      [...conversations].sort(
        (first, second) =>
          new Date(second.updatedAt).getTime() -
          new Date(first.updatedAt).getTime(),
      ),
    [conversations],
  );
  const currentConversation =
    conversations.find((item) => item.id === conversationId) ??
    sortedConversations[0];
  const sortedSources = useMemo(
    () =>
      [...sources].sort((first, second) => {
        const firstScore = Number(first.score);
        const secondScore = Number(second.score);

        return sourceSortDirection === "desc"
          ? secondScore - firstScore
          : firstScore - secondScore;
      }),
    [sourceSortDirection],
  );

  useEffect(() => {
    if (conversationId || conversations.length === 0) {
      return;
    }

    const latest = getLatestConversation(conversations);
    navigate(`/Chat/${latest.id}`, { replace: true });
  }, [conversationId, conversations, navigate]);

  useEffect(() => {
    if (
      !conversationId ||
      conversations.length === 0 ||
      conversations.some((item) => item.id === conversationId)
    ) {
      return;
    }

    const latest = getLatestConversation(conversations);
    navigate(`/Chat/${latest.id}`, { replace: true });
  }, [conversationId, conversations, navigate]);

  const handleCreateConversation = () => {
    const nextConversation = createEmptyConversation();

    setConversations((currentItems) => [nextConversation, ...currentItems]);
    navigate(`/Chat/${nextConversation.id}`);
    toast.success("已新建会话");
  };

  const handleDeleteConversation = () => {
    if (!currentConversation) {
      return;
    }

    const nextConversations = conversations.filter(
      (item) => item.id !== currentConversation.id,
    );

    if (nextConversations.length === 0) {
      const emptyConversation = createEmptyConversation();
      setConversations([emptyConversation]);
      navigate(`/Chat/${emptyConversation.id}`, { replace: true });
    } else {
      setConversations(nextConversations);
      navigate(`/Chat/${getLatestConversation(nextConversations).id}`, {
        replace: true,
      });
    }

    setDeleteOpen(false);
    toast.success("已删除会话");
  };

  const handleToggleFavorite = () => {
    if (!currentConversation) {
      return;
    }

    setConversations((currentItems) =>
      currentItems.map((item) =>
        item.id === currentConversation.id
          ? { ...item, favorite: !item.favorite }
          : item,
      ),
    );
    toast.success(currentConversation.favorite ? "已取消常用" : "已标记常用");
  };

  const handleSubmit = (payload: ChatComposerPayload) => {
    if (!currentConversation) {
      return;
    }

    const now = new Date();
    const time = getNowTime();
    const messageTitle =
      payload.message || payload.attachments.map((item) => item.name).join("、");
    const userMessage: ConversationMessage = {
      id: createLocalId("user-message"),
      role: "user",
      time,
      content: messageTitle,
    };
    const assistantMessage: ConversationMessage = {
      id: createLocalId("assistant-message"),
      role: "assistant",
      time,
      content: `已收到你的问题。当前选择模型为 ${payload.modelId}，${
        payload.ragEnabled ? "RAG 已启用" : "RAG 已关闭"
      }。这里先展示本地 mock 回答，后续接入接口后可替换为真实流式生成内容。`,
      citations: payload.ragEnabled ? citations.slice(0, 2) : [],
    };

    setConversations((currentItems) =>
      currentItems.map((item) =>
        item.id === currentConversation.id
          ? {
              ...item,
              title:
                item.messages.length === 0
                  ? messageTitle.slice(0, 24) || item.title
                  : item.title,
              time,
              updatedAt: now.toISOString(),
              sourceCount: payload.ragEnabled ? Math.max(item.sourceCount, 2) : 0,
              messages: [...item.messages, userMessage, assistantMessage],
            }
          : item,
      ),
    );
    toast.success("消息已添加到本地对话");
  };

  const currentMessages = currentConversation?.messages ?? [];
  const sortIcon =
    sourceSortDirection === "desc" ? (
      <ArrowDown data-icon="inline-end" />
    ) : (
      <ArrowUp data-icon="inline-end" />
    );

  return (
    <section className="h-[calc(100svh-5rem)] min-h-[720px] overflow-hidden bg-white text-slate-900">
      <div
        className={cn(
          "grid h-full min-h-0 grid-cols-1 overflow-hidden border border-slate-200 bg-white shadow-sm",
          isFullscreen
            ? "xl:grid-cols-[minmax(520px,1fr)]"
            : "xl:grid-cols-[280px_minmax(520px,1fr)_360px]",
        )}
      >
        {!isFullscreen && (
          <aside
            aria-label="最近会话"
            className="flex min-h-0 flex-col border-b border-slate-200 bg-white xl:border-r xl:border-b-0"
          >
            <div className="shrink-0 px-4 py-4">
              <Button
                type="button"
                className="h-10 w-full rounded-[6px] bg-blue-600 text-sm font-medium tracking-normal text-white normal-case shadow-sm hover:bg-blue-700"
                onClick={handleCreateConversation}
              >
                <MessageSquarePlus data-icon="inline-start" />
                新建会话
              </Button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col px-3 pb-4">
              <div className="mb-2 px-1 text-xs font-medium text-slate-500">
                最近会话
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto pr-1">
                {sortedConversations.map((item) => (
                  <ConversationRow
                    key={item.id}
                    item={item}
                    active={item.id === currentConversation?.id}
                    onOpen={(id) => navigate(`/Chat/${id}`)}
                  />
                ))}
              </div>
              <button
                type="button"
                className="mt-3 flex h-9 items-center gap-2 px-1 text-left text-xs font-medium text-slate-500 hover:text-blue-600"
              >
                查看全部会话
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          </aside>
        )}

        <main
          aria-label="聊天问答"
          className="flex min-h-0 flex-col border-b border-slate-200 bg-white xl:border-b-0"
        >
          <header className="flex min-h-16 shrink-0 flex-col gap-3 border-b border-slate-200 px-4 py-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="text-sm text-slate-600">知识库：</span>
              <span className="flex h-8 min-w-0 max-w-[220px] items-center rounded-[5px] px-2 text-sm font-medium text-slate-700">
                <span className="min-w-0 truncate">Frontend Interview</span>
              </span>
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
                aria-label={isFullscreen ? "退出全屏" : "进入全屏"}
                className="rounded-[5px] border-slate-200 text-slate-600"
                onClick={() => setIsFullscreen((currentValue) => !currentValue)}
              >
                {isFullscreen ? <Minimize2 /> : <Maximize2 />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-xs"
                    aria-label="更多操作"
                    className="rounded-[5px] border-slate-200 text-slate-600"
                  >
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 rounded-[8px]">
                  <DropdownMenuGroup>
                    <DropdownMenuItem onSelect={handleToggleFavorite}>
                      <Star />
                      {currentConversation?.favorite
                        ? "取消常用"
                        : "标记常用"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={(event) => {
                        event.preventDefault();
                        setDeleteOpen(true);
                      }}
                    >
                      <Trash2 />
                      删除会话
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-auto bg-white px-4 py-5 lg:px-8">
            <div className="mx-auto flex max-w-[760px] flex-col gap-5">
              {currentMessages.length > 0 ? (
                currentMessages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))
              ) : (
                <EmptyConversation />
              )}

              {currentMessages.length > 0 && (
                <div className="ml-0 rounded-[8px] border border-emerald-200 bg-emerald-50/50 px-4 py-3 text-xs text-slate-600 sm:ml-14">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                      <span className="min-w-0 truncate">
                        检索到 6 个相关片段 · 已引用{" "}
                        {currentConversation?.sourceCount ?? 0} 个来源
                      </span>
                    </span>
                    <span className="shrink-0 text-slate-500">耗时 1.23s</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <footer className="shrink-0 border-t border-slate-100 px-4 py-4 lg:px-6">
            <ChatComposer
              placeholder="继续追问这个知识库..."
              onSubmit={handleSubmit}
            />
          </footer>
        </main>

        {!isFullscreen && (
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
                  {sortedSources.length}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 rounded-[5px] border-slate-200 px-3 text-xs font-medium tracking-normal text-slate-500 normal-case"
                onClick={() =>
                  setSourceSortDirection((currentValue) =>
                    currentValue === "desc" ? "asc" : "desc",
                  )
                }
              >
                {sourceSortDirection === "desc" ? "相似度降序" : "相似度升序"}
                {sortIcon}
              </Button>
            </header>

            <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
              <div className="flex flex-col gap-3">
                {sortedSources.map((source, index) => (
                  <SourceCard
                    key={source.id}
                    source={source}
                    rank={index + 1}
                  />
                ))}
              </div>

              <section className="mt-4 rounded-[8px] border border-slate-200 bg-white p-4 text-xs leading-6 text-slate-600 shadow-sm">
                <h3 className="mb-2 text-sm font-semibold text-slate-900">
                  选中来源详情
                </h3>
                <div className="font-medium text-slate-800">
                  javascript-event-loop.pdf
                  <span className="ml-2 font-normal text-slate-500">
                    Chunk #03
                  </span>
                </div>
                <p className="mt-2">
                  事件循环的运行流程：先执行同步代码，遇到异步任务后将回调放入相应队列；当前宏任务执行完毕后清空微任务队列，再执行下一个宏任务。
                </p>
                <p className="mt-2 text-slate-500">
                  这种机制保证了 JavaScript 的高效执行和良好的用户体验。
                </p>
                <div className="mt-2 text-slate-400">
                  第 2 页 · 字符 256 - 512
                </div>
              </section>

              <section className="mt-4 rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-900">
                    检索调试
                  </h3>
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
        )}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-[8px]">
          <AlertDialogHeader>
            <AlertDialogTitle>删除会话</AlertDialogTitle>
            <AlertDialogDescription>
              确认删除“{currentConversation?.title ?? "当前会话"}”吗？当前只会从本地
              mock 列表移除，刷新页面后会恢复初始数据。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-[6px] tracking-normal normal-case">
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-[6px] bg-red-600 tracking-normal text-white normal-case hover:bg-red-700"
              onClick={handleDeleteConversation}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export default Chat;
