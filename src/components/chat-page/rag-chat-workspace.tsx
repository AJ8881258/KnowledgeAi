import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isAxiosError } from "axios";
import {
  Bot,
  CheckCircle2,
  ChevronsUpDown,
  FileText,
  Loader2,
  MessageSquarePlus,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  RefreshCw,
  SearchCheck,
  Trash2,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import {
  createKnowledgeBaseChatSession,
  deleteChatSession,
  getChatSessionMessages,
  getKnowledgeBaseChatSessions,
  sendChatSessionMessage,
  updateChatSession,
  type ChatMessageResponse,
  type ChatMessageSourceResponse,
  type ChatSessionResponse,
} from "@/api/chat";
import {
  ChatComposer,
  type ChatComposerPayload,
} from "@/components/chat/ChatComposer";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { KnowledgeBase } from "@/components/knowledge-bases/knowledge-base-types";

const DEFAULT_CHAT_LIMIT = 5;

function getTimeValue(value: string) {
  const time = new Date(value).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function sortChatSessions(sessions: ChatSessionResponse[]) {
  return [...sessions].sort((first, second) => {
    const pinnedDifference =
      Number(second.pinned === true) - Number(first.pinned === true);

    if (pinnedDifference !== 0) {
      return pinnedDifference;
    }

    const updatedDifference =
      getTimeValue(second.updatedAt) - getTimeValue(first.updatedAt);

    if (updatedDifference !== 0) {
      return updatedDifference;
    }

    return second.id - first.id;
  });
}

function normalizeChatSession(session: ChatSessionResponse) {
  return {
    ...session,
    pinned: session.pinned === true,
  };
}

function normalizeChatSessions(sessions: ChatSessionResponse[]) {
  return sortChatSessions(sessions.map(normalizeChatSession));
}

function formatCompactDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value || "-";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatScore(score: number) {
  if (!Number.isFinite(score)) {
    return "-";
  }

  return score.toFixed(2);
}

function getMessageRoleLabel(role: ChatMessageResponse["role"]) {
  return role === "USER" ? "你" : "KnowFlow AI";
}

function getSourceKey(source: ChatMessageSourceResponse) {
  return `${source.documentId}-${source.chunkId}-${source.chunkIndex}`;
}

function getDefaultSessionTitle(content: string) {
  const title = content.trim().replace(/\s+/g, " ");

  return title.slice(0, 24) || "新会话";
}

function getChatErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const status = error.response?.status;

    if (status === 400) {
      return "请输入问题内容，并确认引用片段数量不少于 1。";
    }

    if (status === 404) {
      return "会话或知识库不存在，或你没有访问权限。";
    }

    if (!error.response) {
      return "无法连接问答服务，请确认后端已启动。";
    }

    if (status && status >= 500) {
      return "问答服务暂时不可用，可能是模型调用或消息保存失败。";
    }
  }

  return "操作失败，请稍后重试。";
}

function MessageBubble({ message }: { message: ChatMessageResponse }) {
  const isUser = message.role === "USER";

  if (isUser) {
    return (
      <div className="flex justify-end gap-3">
        <article className="max-w-[min(720px,88%)] rounded-[8px] border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium leading-6 text-slate-800 shadow-sm">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
          <div className="mt-2 text-right text-[11px] font-normal text-slate-500">
            {formatCompactDateTime(message.createdAt)}
          </div>
        </article>
        <span className="hidden size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 sm:flex">
          <UserRound className="size-4" />
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <span className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-1 ring-blue-100">
        <Bot className="size-5" />
      </span>
      <article className="min-w-0 flex-1 rounded-[8px] border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span className="font-medium text-slate-700">
            {getMessageRoleLabel(message.role)}
          </span>
          <span>{formatCompactDateTime(message.createdAt)}</span>
        </div>
        <div className="space-y-3">
          {message.content.split("\n\n").map((paragraph, index) => (
            <p
              key={`${message.id}-${index}`}
              className="whitespace-pre-wrap break-words"
            >
              {paragraph}
            </p>
          ))}
        </div>
        {message.sources.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {message.sources.map((source, index) => (
              <span
                key={getSourceKey(source)}
                className="inline-flex max-w-full items-center gap-1 rounded-[5px] border border-blue-100 bg-blue-50 px-2 py-1 text-xs text-blue-700"
              >
                <span className="shrink-0">[{index + 1}]</span>
                <span className="min-w-0 truncate">
                  {source.documentName}
                </span>
                <span className="shrink-0">Chunk #{source.chunkIndex}</span>
              </span>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}

function EmptyConversation({
  knowledgeBaseName,
}: {
  knowledgeBaseName: string;
}) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-[8px] border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-1 ring-blue-100">
        <Bot className="size-6" />
      </span>
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          开始知识库问答
        </h2>
        <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
          当前知识库：{knowledgeBaseName}。输入问题后会创建或进入会话，并请求后端生成非流式回答。
        </p>
      </div>
    </div>
  );
}

function SessionSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="rounded-[6px] border border-slate-100 bg-white px-3 py-3"
        >
          <Skeleton className="h-4 w-3/4 rounded bg-slate-200" />
          <Skeleton className="mt-3 h-3 w-1/2 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function SourceCard({
  source,
  index,
  expanded,
  onToggle,
}: {
  source: ChatMessageSourceResponse;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <article className="rounded-[8px] border border-slate-200 bg-white p-3 shadow-sm">
      <button
        type="button"
        className="flex w-full cursor-pointer items-start gap-2 text-left"
        onClick={onToggle}
      >
        <span className="flex size-5 shrink-0 items-center justify-center rounded-[4px] bg-blue-600 text-xs font-semibold text-white">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="size-4 shrink-0 text-slate-400" />
            <span className="min-w-0 truncate text-xs font-semibold text-slate-800">
              {source.documentName}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
            <span>Chunk #{source.chunkIndex}</span>
            <span className="text-slate-300">/</span>
            <span>相关度 {formatScore(source.score)}</span>
          </div>
        </div>
        <ChevronsUpDown className="mt-0.5 size-4 shrink-0 text-slate-400" />
      </button>
      {expanded && (
        <p className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap break-words rounded-[6px] border border-slate-200 bg-slate-50/70 p-3 text-xs leading-5 text-slate-600">
          {source.content || "这个引用来源没有返回片段摘要。"}
        </p>
      )}
    </article>
  );
}

function SessionListItem({
  session,
  isActive,
  isBusy,
  onOpen,
  onRename,
  onDelete,
  onTogglePin,
}: {
  session: ChatSessionResponse;
  isActive: boolean;
  isBusy: boolean;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}) {
  const isPinned = session.pinned === true;

  return (
    <div
      className={cn(
        "group relative grid min-h-[72px] grid-cols-[minmax(0,1fr)_2rem] items-stretch rounded-[6px] border transition-colors duration-200",
        isActive
          ? "border-blue-200 bg-blue-50/80 text-slate-950 shadow-sm"
          : "border-transparent bg-white text-slate-700 hover:bg-slate-50",
      )}
    >
      {isActive && (
        <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-blue-600" />
      )}
      <button
        type="button"
        className="flex min-w-0 cursor-pointer flex-col justify-center gap-2 rounded-l-[6px] py-3 pr-2 pl-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
        onClick={onOpen}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {isPinned && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-[4px] border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
              <Pin className="size-3" />
              置顶
            </span>
          )}
          <span className="min-w-0 truncate text-sm font-medium">
            {session.title || "新会话"}
          </span>
        </span>
        <span className="text-xs text-slate-500">
          {formatCompactDateTime(session.updatedAt)}
        </span>
      </button>
      <div className="flex items-center justify-center pr-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="会话操作"
              disabled={isBusy}
              className={cn(
                "cursor-pointer rounded-[5px] text-slate-500 opacity-70 transition-opacity hover:bg-white/80 hover:text-slate-900 group-hover:opacity-100",
                isActive && "bg-white/70 opacity-100",
              )}
            >
              {isBusy ? (
                <Loader2 className="animate-spin" />
              ) : (
                <MoreHorizontal />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 rounded-[6px]">
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="cursor-pointer tracking-normal normal-case"
                onSelect={onRename}
              >
                <Pencil />
                重命名
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer tracking-normal normal-case"
                onSelect={onTogglePin}
              >
                {isPinned ? <PinOff /> : <Pin />}
                {isPinned ? "取消置顶" : "置顶"}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                variant="destructive"
                className="cursor-pointer tracking-normal normal-case"
                onSelect={onDelete}
              >
                <Trash2 />
                删除
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

type RagChatWorkspaceProps = {
  knowledgeBase: KnowledgeBase;
  knowledgeBases?: KnowledgeBase[];
  onKnowledgeBaseChange?: (knowledgeBaseId: string) => void;
  initialSessionId?: string;
  onSessionChange?: (sessionId: string) => void;
  onSessionCleared?: () => void;
  onUnauthorized: () => void;
  layout?: "full" | "embedded";
  className?: string;
};

export function RagChatWorkspace({
  knowledgeBase,
  knowledgeBases = [],
  onKnowledgeBaseChange,
  initialSessionId,
  onSessionChange,
  onSessionCleared,
  onUnauthorized,
  layout = "full",
  className,
}: RagChatWorkspaceProps) {
  const [sessions, setSessions] = useState<ChatSessionResponse[]>([]);
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [editingSession, setEditingSession] =
    useState<ChatSessionResponse | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingError, setEditingError] = useState("");
  const [deletingSession, setDeletingSession] =
    useState<ChatSessionResponse | null>(null);
  const [mutatingSessionId, setMutatingSessionId] = useState<number | null>(
    null,
  );
  const [expandedSources, setExpandedSources] = useState<Set<string>>(
    () => new Set(),
  );
  const activeSessionIdRef = useRef<number | null>(null);
  const sessionsRef = useRef<ChatSessionResponse[]>([]);
  const latestInitialSessionIdRef = useRef(initialSessionId);
  const onSessionChangeRef = useRef(onSessionChange);
  const onSessionClearedRef = useRef(onSessionCleared);
  const onUnauthorizedRef = useRef(onUnauthorized);
  const messageRequestSeqRef = useRef(0);
  const activeSession = sessions.find((session) => session.id === activeSessionId);
  const latestAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === "ASSISTANT");
  const latestSources = useMemo(
    () =>
      [...(latestAssistantMessage?.sources ?? [])].sort(
        (first, second) => second.score - first.score,
      ),
    [latestAssistantMessage],
  );
  const canChooseKnowledgeBase =
    knowledgeBases.length > 0 && !!onKnowledgeBaseChange;
  const isEmbedded = layout === "embedded";

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  useEffect(() => {
    latestInitialSessionIdRef.current = initialSessionId;
  }, [initialSessionId]);

  useEffect(() => {
    onSessionChangeRef.current = onSessionChange;
  }, [onSessionChange]);

  useEffect(() => {
    onSessionClearedRef.current = onSessionCleared;
  }, [onSessionCleared]);

  useEffect(() => {
    onUnauthorizedRef.current = onUnauthorized;
  }, [onUnauthorized]);

  const handleRequestError = useCallback(
    (error: unknown) => {
      if (isAxiosError(error) && error.response?.status === 401) {
        toast.error("登录状态已失效，请重新登录");
        onUnauthorizedRef.current();
        return "登录状态已失效，请重新登录";
      }

      const message = getChatErrorMessage(error);
      toast.error(message);
      return message;
    },
    [],
  );

  const selectSession = useCallback(
    (
      sessionId: number | null,
      options: { syncUrl?: boolean } = {},
    ) => {
      const shouldSyncUrl = options.syncUrl ?? true;

      activeSessionIdRef.current = sessionId;
      setActiveSessionId(sessionId);

      if (!shouldSyncUrl) {
        return;
      }

      if (sessionId && onSessionChangeRef.current) {
        const nextSessionId = String(sessionId);

        if (nextSessionId !== latestInitialSessionIdRef.current) {
          latestInitialSessionIdRef.current = nextSessionId;
          onSessionChangeRef.current(nextSessionId);
        }
      } else if (!sessionId && onSessionClearedRef.current) {
        latestInitialSessionIdRef.current = undefined;
        onSessionClearedRef.current();
      }
    },
    [],
  );

  const loadMessages = useCallback(
    async (sessionId: number) => {
      const requestSeq = messageRequestSeqRef.current + 1;

      messageRequestSeqRef.current = requestSeq;
      setIsLoadingMessages(true);
      setErrorMessage("");
      setExpandedSources(new Set());

      try {
        const response = await getChatSessionMessages(sessionId);

        if (messageRequestSeqRef.current !== requestSeq) {
          return;
        }

        setMessages(response);
        setExpandedSources(new Set());
      } catch (error) {
        if (messageRequestSeqRef.current !== requestSeq) {
          return;
        }

        setMessages([]);
        setExpandedSources(new Set());
        setErrorMessage(handleRequestError(error));
      } finally {
        if (messageRequestSeqRef.current === requestSeq) {
          setIsLoadingMessages(false);
        }
      }
    },
    [handleRequestError],
  );

  const loadSessions = useCallback(
    async (preferredSessionId?: string) => {
      setIsLoadingSessions(true);
      setErrorMessage("");
      setExpandedSources(new Set());

      try {
        const response = await getKnowledgeBaseChatSessions(knowledgeBase.id);
        const sortedSessions = normalizeChatSessions(response);
        const preferredNumericId = preferredSessionId
          ? Number(preferredSessionId)
          : NaN;
        const preferredSession = sortedSessions.find(
          (session) => session.id === preferredNumericId,
        );
        const nextActiveSession =
          preferredSession ??
          (preferredSessionId ? null : sortedSessions[0] ?? null);

        sessionsRef.current = sortedSessions;
        setSessions(sortedSessions);
        selectSession(nextActiveSession?.id ?? null, {
          syncUrl: !preferredSessionId || !!nextActiveSession,
        });

        if (preferredSessionId && !preferredSession) {
          setErrorMessage("这个会话不存在，或你没有访问权限。");
        }

        if (nextActiveSession) {
          await loadMessages(nextActiveSession.id);
        } else {
          setMessages([]);
          setExpandedSources(new Set());
        }
      } catch (error) {
        sessionsRef.current = [];
        setSessions([]);
        selectSession(null, { syncUrl: false });
        setErrorMessage(handleRequestError(error));
      } finally {
        setIsLoadingSessions(false);
      }
    },
    [handleRequestError, knowledgeBase.id, loadMessages, selectSession],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSessions(latestInitialSessionIdRef.current);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [knowledgeBase.id, loadSessions]);

  const createSession = async (title = "新会话") => {
    setIsCreatingSession(true);
    setErrorMessage("");

    try {
      const session = await createKnowledgeBaseChatSession(knowledgeBase.id, {
        title,
      });
      const normalizedSession = normalizeChatSession(session);

      setSessions((currentSessions) =>
        normalizeChatSessions([normalizedSession, ...currentSessions]),
      );
      selectSession(normalizedSession.id);
      setMessages([]);
      setExpandedSources(new Set());
      toast.success("已新建会话");

      return normalizedSession;
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleCreateSession = async () => {
    try {
      await createSession();
    } catch (error) {
      setErrorMessage(handleRequestError(error));
      return;
    }
  };

  const handleOpenSession = useCallback(
    async (sessionId: number) => {
      if (sessionId === activeSessionIdRef.current) {
        return;
      }

      setMessages([]);
      selectSession(sessionId);
      await loadMessages(sessionId);
    },
    [loadMessages, selectSession],
  );

  const handleMissingSession = useCallback(
    async (sessionId: number) => {
      const currentSessions = sessionsRef.current;
      const remainingSessions = currentSessions.filter(
        (session) => session.id !== sessionId,
      );
      const wasActive = activeSessionIdRef.current === sessionId;
      const sortedRemainingSessions = sortChatSessions(remainingSessions);

      sessionsRef.current = sortedRemainingSessions;
      setSessions(sortedRemainingSessions);

      if (!wasActive) {
        return;
      }

      const nextSession = sortedRemainingSessions[0] ?? null;
      selectSession(nextSession?.id ?? null);

      if (nextSession) {
        await loadMessages(nextSession.id);
      } else {
        setMessages([]);
        setExpandedSources(new Set());
      }
    },
    [loadMessages, selectSession],
  );

  const openRenameDialog = (session: ChatSessionResponse) => {
    setEditingSession(session);
    setEditingTitle(session.title || "新会话");
    setEditingError("");
  };

  const handleRenameSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingSession) {
      return;
    }

    const nextTitle = editingTitle.trim();

    if (!nextTitle) {
      setEditingError("请输入会话名称。");
      return;
    }

    if (nextTitle === editingSession.title) {
      setEditingSession(null);
      setEditingError("");
      return;
    }

    setMutatingSessionId(editingSession.id);
    setEditingError("");

    try {
      const response = await updateChatSession(editingSession.id, {
        title: nextTitle,
      });
      const updatedSession = normalizeChatSession(response);

      setSessions((currentSessions) =>
        normalizeChatSessions(
          currentSessions.map((session) =>
            session.id === updatedSession.id ? updatedSession : session,
          ),
        ),
      );
      setEditingSession(null);
      toast.success("会话已重命名");
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        toast.error("会话不存在，已从列表移除");
        await handleMissingSession(editingSession.id);
        setEditingSession(null);
        return;
      }

      const message = handleRequestError(error);
      setEditingError(message);
    } finally {
      setMutatingSessionId(null);
    }
  };

  const handleTogglePin = async (session: ChatSessionResponse) => {
    setMutatingSessionId(session.id);
    setErrorMessage("");

    try {
      const response = await updateChatSession(session.id, {
        pinned: !session.pinned,
      });
      const updatedSession = normalizeChatSession(response);

      setSessions((currentSessions) =>
        normalizeChatSessions(
          currentSessions.map((item) =>
            item.id === updatedSession.id ? updatedSession : item,
          ),
        ),
      );
      toast.success(updatedSession.pinned ? "会话已置顶" : "已取消置顶");
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        toast.error("会话不存在，已从列表移除");
        await handleMissingSession(session.id);
        return;
      }

      setErrorMessage(handleRequestError(error));
    } finally {
      setMutatingSessionId(null);
    }
  };

  const handleDeleteSession = async () => {
    if (!deletingSession) {
      return;
    }

    const targetSession = deletingSession;

    setMutatingSessionId(targetSession.id);
    setErrorMessage("");

    try {
      await deleteChatSession(targetSession.id);
      await handleMissingSession(targetSession.id);
      setDeletingSession(null);
      toast.success("会话已删除");
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        toast.error("会话不存在，已从列表移除");
        await handleMissingSession(targetSession.id);
        setDeletingSession(null);
        return;
      }

      setErrorMessage(handleRequestError(error));
    } finally {
      setMutatingSessionId(null);
    }
  };

  useEffect(() => {
    if (!initialSessionId || isLoadingSessions) {
      return;
    }

    const targetSessionId = Number(initialSessionId);

    if (
      Number.isNaN(targetSessionId) ||
      targetSessionId === activeSessionIdRef.current
    ) {
      return;
    }

    if (
      !sessionsRef.current.some((session) => session.id === targetSessionId)
    ) {
      setErrorMessage("这个会话不存在，或你没有访问权限。");
      setMessages([]);
      setExpandedSources(new Set());
      activeSessionIdRef.current = null;
      setActiveSessionId(null);
      return;
    }

    setMessages([]);
    void handleOpenSession(targetSessionId);
  }, [handleOpenSession, initialSessionId, isLoadingSessions]);

  const handleSubmit = async (payload: ChatComposerPayload) => {
    const content = payload.message.trim();

    if (!content) {
      setErrorMessage("请输入问题内容。");
      return;
    }

    setIsSending(true);
    setErrorMessage("");

    try {
      const session =
        activeSession ??
        (await createSession(getDefaultSessionTitle(content)));
      const userMessage: ChatMessageResponse = {
        id: -Date.now(),
        sessionId: session.id,
        role: "USER",
        content,
        sources: [],
        createdAt: new Date().toISOString(),
      };

      setMessages((currentMessages) => [...currentMessages, userMessage]);

      const response = await sendChatSessionMessage(session.id, {
        content,
        limit: DEFAULT_CHAT_LIMIT,
      });

      setMessages((currentMessages) => [
        ...currentMessages,
        response.message,
      ]);
      setSessions((currentSessions) =>
        normalizeChatSessions(
          currentSessions.map((item) =>
            item.id === session.id
              ? {
                  ...item,
                  title:
                    item.title === "新会话"
                      ? getDefaultSessionTitle(content)
                      : item.title,
                  updatedAt: response.message.createdAt,
                }
              : item,
          ),
        ),
      );
      setExpandedSources(new Set());
    } catch (error) {
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id >= 0),
      );
      setErrorMessage(handleRequestError(error));
      throw error;
    } finally {
      setIsSending(false);
    }
  };

  const toggleSource = (source: ChatMessageSourceResponse) => {
    const key = getSourceKey(source);

    setExpandedSources((currentSources) => {
      const nextSources = new Set(currentSources);

      if (nextSources.has(key)) {
        nextSources.delete(key);
      } else {
        nextSources.add(key);
      }

      return nextSources;
    });
  };

  const hasMessages = messages.length > 0;

  return (
    <section
      className={cn(
        isEmbedded
          ? "flex h-full min-h-0 flex-col overflow-hidden bg-white text-slate-900"
          : "grid h-full min-h-[640px] grid-cols-1 overflow-hidden bg-white text-slate-900 xl:grid-cols-[240px_minmax(0,1fr)_320px]",
        className,
      )}
    >
      {!isEmbedded && (
      <aside className="flex min-h-0 flex-col border-b border-slate-200 bg-white xl:border-r xl:border-b-0">
        <div className="shrink-0 border-b border-slate-100 px-4 py-4">
          {canChooseKnowledgeBase && (
            <div className="mb-3">
              <label
                htmlFor="rag-knowledge-base"
                className="mb-1 block text-xs font-medium text-slate-500"
              >
                知识库
              </label>
              <Select
                value={knowledgeBase.id}
                onValueChange={onKnowledgeBaseChange}
              >
                <SelectTrigger
                  id="rag-knowledge-base"
                  className="h-9 w-full rounded-[6px] border border-slate-200 bg-white px-3 text-xs normal-case tracking-normal text-slate-700 focus-visible:border-blue-400"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectGroup>
                    {knowledgeBases.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}
          <Button
            type="button"
            className="h-10 w-full cursor-pointer rounded-[6px] bg-blue-600 text-sm font-medium tracking-normal text-white normal-case shadow-sm hover:bg-blue-700"
            onClick={() => void handleCreateSession()}
            disabled={isCreatingSession || isLoadingSessions}
          >
            {isCreatingSession ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <MessageSquarePlus data-icon="inline-start" />
            )}
            新建会话
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-3 py-4">
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <span className="text-xs font-medium text-slate-500">
              问答会话
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="刷新会话"
              className="cursor-pointer rounded-[5px] text-slate-500 hover:bg-slate-100"
              onClick={() => void loadSessions()}
              disabled={isLoadingSessions}
            >
              <RefreshCw
                className={cn("size-3.5", isLoadingSessions && "animate-spin")}
              />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto pr-1">
            {isLoadingSessions ? (
              <SessionSkeleton />
            ) : sessions.length > 0 ? (
              <div className="flex flex-col gap-2">
                {sessions.map((session) => (
                  <SessionListItem
                    key={session.id}
                    session={session}
                    isActive={session.id === activeSessionId}
                    isBusy={mutatingSessionId === session.id}
                    onOpen={() => void handleOpenSession(session.id)}
                    onRename={() => openRenameDialog(session)}
                    onDelete={() => setDeletingSession(session)}
                    onTogglePin={() => void handleTogglePin(session)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[8px] border border-dashed border-slate-200 px-3 py-8 text-center">
                <MessageSquarePlus className="mx-auto size-6 text-slate-300" />
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  暂无会话。可以先提问，系统会自动创建一个新会话。
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
      )}

      <main
        className={cn(
          "flex min-h-0 flex-col bg-white",
          !isEmbedded && "border-b border-slate-200 xl:border-b-0",
          isEmbedded && "flex-1",
        )}
      >
        <header className="flex min-h-16 shrink-0 flex-col gap-3 border-b border-slate-200 px-4 py-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="truncate text-sm font-semibold text-slate-900">
                {knowledgeBase.name}
              </span>
              <span className="rounded-[5px] border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500">
                {knowledgeBase.docs} 个文档
              </span>
              <span className="rounded-[5px] border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500">
                {knowledgeBase.chunks} 个 chunks
              </span>
              <span className="inline-flex items-center gap-1 rounded-[5px] border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                RAG 已启用
              </span>
            </div>
            <p className="mt-1 truncate text-xs text-slate-500">
              {activeSession
                ? `当前会话：${activeSession.title || "新会话"}`
                : "当前没有选中会话，首次提问会自动创建。"}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs text-slate-500">
            {isEmbedded && (
              <Button
                type="button"
                variant="outline"
                className="h-8 cursor-pointer rounded-[6px] border-slate-200 px-3 text-xs font-medium tracking-normal text-slate-600 normal-case"
                onClick={() => void handleCreateSession()}
                disabled={isCreatingSession || isLoadingSessions}
              >
                {isCreatingSession ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <MessageSquarePlus data-icon="inline-start" />
                )}
                新建会话
              </Button>
            )}
            <SearchCheck className="size-4" />
            非流式回答 · 引用来自检索片段
          </div>
        </header>

        {errorMessage && (
          <div
            role="alert"
            className="mx-4 mt-4 flex items-start gap-2 rounded-[6px] border border-orange-200 bg-orange-50 px-3 py-2 text-xs leading-5 text-orange-700"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto bg-white px-4 py-5 lg:px-6">
          <div className="mx-auto flex max-w-[820px] flex-col gap-5">
            {isLoadingMessages ? (
              <div className="flex flex-col gap-4">
                <Skeleton className="ml-auto h-16 w-2/3 rounded-[8px] bg-blue-100" />
                <Skeleton className="h-32 w-full rounded-[8px] bg-slate-100" />
              </div>
            ) : hasMessages ? (
              messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))
            ) : (
              <EmptyConversation knowledgeBaseName={knowledgeBase.name} />
            )}

            {isSending && (
              <div className="flex items-center gap-3 rounded-[8px] border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs text-slate-600">
                <Loader2 className="size-4 animate-spin text-blue-600" />
                正在检索相关片段并生成回答...
              </div>
            )}

            {latestAssistantMessage && !isSending && (
              <div className="rounded-[8px] border border-emerald-200 bg-emerald-50/50 px-4 py-3 text-xs text-slate-600">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                    <span className="min-w-0 truncate">
                      本次回答引用 {latestSources.length} 个来源
                    </span>
                  </span>
                  <span className="shrink-0 text-slate-500">
                    {formatCompactDateTime(latestAssistantMessage.createdAt)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <footer className="shrink-0 border-t border-slate-100 px-4 py-4 lg:px-6">
          <ChatComposer
            placeholder="向当前知识库提问..."
            onSubmit={handleSubmit}
            disabled={isLoadingSessions}
            isSubmitting={isSending}
            submitLabel={isSending ? "生成中" : "发送"}
            showAttachmentButton={false}
            showContextControls={false}
            helperText="Enter 发送，Shift + Enter 换行。第一版不做流式输出。"
          />
        </footer>
      </main>

      {!isEmbedded && (
      <aside className="flex min-h-0 flex-col bg-white xl:border-l xl:border-slate-200">
        <header className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-base font-semibold text-slate-900">
              引用来源
            </h2>
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-500">
              {latestSources.length}
            </span>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
          {latestSources.length > 0 ? (
            <div className="flex flex-col gap-3">
              {latestSources.map((source, index) => (
                <SourceCard
                  key={getSourceKey(source)}
                  source={source}
                  index={index}
                  expanded={expandedSources.has(getSourceKey(source))}
                  onToggle={() => toggleSource(source)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[8px] border border-dashed border-slate-200 px-4 py-8 text-center">
              <FileText className="mx-auto size-7 text-slate-300" />
              <h3 className="mt-3 text-sm font-semibold text-slate-800">
                暂无引用来源
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                发送问题并获得回答后，这里会展示后端返回的文档名、chunk 序号和片段摘要。
              </p>
            </div>
          )}
        </div>
      </aside>
      )}

      <Dialog
        open={!!editingSession}
        onOpenChange={(open) => {
          if (!open && mutatingSessionId !== editingSession?.id) {
            setEditingSession(null);
            setEditingError("");
          }
        }}
      >
        <DialogContent className="rounded-[8px]" showCloseButton={false}>
          <form className="flex flex-col gap-5" onSubmit={handleRenameSubmit}>
            <DialogHeader>
              <DialogTitle className="text-base tracking-normal normal-case">
                重命名会话
              </DialogTitle>
              <DialogDescription>
                为当前问答上下文设置一个便于识别的名称。
              </DialogDescription>
            </DialogHeader>
            <FieldGroup className="gap-3">
              <Field data-invalid={!!editingError}>
                <FieldLabel htmlFor="chat-session-title">
                  会话名称
                </FieldLabel>
                <Input
                  id="chat-session-title"
                  value={editingTitle}
                  onChange={(event) => {
                    setEditingTitle(event.target.value);
                    setEditingError("");
                  }}
                  aria-invalid={!!editingError}
                  disabled={mutatingSessionId === editingSession?.id}
                  maxLength={200}
                  autoFocus
                  className="h-10 rounded-[6px] border border-slate-200 bg-white px-3 text-sm focus-visible:border-blue-400"
                />
                <FieldError>{editingError}</FieldError>
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-[6px] tracking-normal normal-case"
                disabled={mutatingSessionId === editingSession?.id}
                onClick={() => {
                  setEditingSession(null);
                  setEditingError("");
                }}
              >
                取消
              </Button>
              <Button
                type="submit"
                className="rounded-[6px] bg-blue-600 tracking-normal text-white normal-case hover:bg-blue-700"
                disabled={mutatingSessionId === editingSession?.id}
              >
                {mutatingSessionId === editingSession?.id && (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                )}
                保存
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletingSession}
        onOpenChange={(open) => {
          if (!open && mutatingSessionId !== deletingSession?.id) {
            setDeletingSession(null);
          }
        }}
      >
        <AlertDialogContent className="rounded-[8px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base tracking-normal normal-case">
              删除会话
            </AlertDialogTitle>
            <AlertDialogDescription>
              删除后会清除该会话的历史消息和引用来源。此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-[6px] tracking-normal normal-case"
              disabled={mutatingSessionId === deletingSession?.id}
            >
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="rounded-[6px] tracking-normal normal-case"
              disabled={mutatingSessionId === deletingSession?.id}
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteSession();
              }}
            >
              {mutatingSessionId === deletingSession?.id && (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              )}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
