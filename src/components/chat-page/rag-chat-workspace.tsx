import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isAxiosError } from "axios";
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  FileText,
  Info,
  Loader2,
  MailOpen,
  MessageSquarePlus,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  RefreshCw,
  SearchCheck,
  Settings2,
  Trash2,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import {
  createKnowledgeBaseChatSession,
  cancelChatSessionGeneration,
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
  fetchModelList,
  getModelSettings,
  updateModelSettings,
  type ModelListItem,
  type ModelSettingsResponse,
} from "@/api/settings";
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
import { KnowledgeBaseRoleBadge } from "@/components/knowledge-bases/knowledge-base-common";
import { useChatStatusStore } from "@/store/chat-status";

const DEFAULT_CHAT_LIMIT = 5;
const SOURCE_PREVIEW_LENGTH = 180;
const POLL_INTERVAL_MS = 2500;
const MAX_GENERATION_POLL_ATTEMPTS = 24;
const GENERATION_TIMEOUT_MESSAGE =
  "生成超时：后台可能仍在生成回答。你可以稍后刷新会话，或检查模型配置后重试。";
const DEFAULT_GENERATION_ERROR_MESSAGE =
  "AI model call failed";
const ACTIONABLE_MODEL_ERROR_MESSAGE =
  "模型调用失败，请检查 Base URL、API Key 和模型名称是否有效。";

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
    unread: session.unread === true,
    status: session.status ?? "IDLE",
    lastErrorMessage: session.lastErrorMessage ?? session.generationError ?? null,
    generationError: session.generationError ?? session.lastErrorMessage ?? null,
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

function formatScore(score?: number | null) {
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return "-";
  }

  return score.toFixed(2);
}

function getSourceSortScore(source: ChatMessageSourceResponse) {
  return source.hybridScore ?? source.score ?? source.fulltextScore ?? source.semanticScore ?? 0;
}

function getRetrievalModeLabel(mode?: string) {
  const normalizedMode = mode?.trim().toUpperCase();

  if (normalizedMode === "HYBRID") {
    return "混合";
  }

  if (normalizedMode === "SEMANTIC") {
    return "语义";
  }

  if (normalizedMode === "FULLTEXT") {
    return "全文";
  }

  return mode || "检索";
}

function getMessageRoleLabel(role: ChatMessageResponse["role"]) {
  return role === "USER" ? "你" : "KnowFlow AI";
}

function getSourceKey(source: ChatMessageSourceResponse) {
  return `${source.documentId}-${source.chunkId}-${source.chunkIndex}`;
}

function getSourcePreview(content: string) {
  const normalizedContent = content.trim().replace(/\s+/g, " ");

  if (normalizedContent.length <= SOURCE_PREVIEW_LENGTH) {
    return normalizedContent;
  }

  return `${normalizedContent.slice(0, SOURCE_PREVIEW_LENGTH)}...`;
}

function getDefaultSessionTitle(content: string) {
  const title = content.trim().replace(/\s+/g, " ");

  return title.slice(0, 24) || "新会话";
}

function mapModelOption(model: ModelListItem) {
  return {
    id: model.id,
    label: model.name || model.id,
  };
}

function buildModelOptions(
  modelSettings: ModelSettingsResponse | null,
  models: ModelListItem[],
) {
  const options = models.map(mapModelOption);
  const savedModel = modelSettings?.model?.trim();

  if (savedModel && !options.some((model) => model.id === savedModel)) {
    return [
      {
        id: savedModel,
        label: savedModel,
      },
      ...options,
    ];
  }

  return options;
}

function getMessageSources(message: ChatMessageResponse | null | undefined) {
  return [...(message?.sources ?? [])].sort(
    (first, second) => getSourceSortScore(second) - getSourceSortScore(first),
  );
}

function getSessionGenerationError(session: ChatSessionResponse | null | undefined) {
  const errorMessage =
    session?.lastErrorMessage?.trim() || session?.generationError?.trim();

  if (
    !errorMessage ||
    errorMessage.toLowerCase() === DEFAULT_GENERATION_ERROR_MESSAGE.toLowerCase()
  ) {
    return ACTIONABLE_MODEL_ERROR_MESSAGE;
  }

  return errorMessage;
}

function isModelConfigurationError(message: string) {
  return /api key|base url|401|403|unauthorized|forbidden|auth|permission|provider|model|鉴权|认证|授权|无权|供应商|模型|不存在|权限/i.test(
    message,
  );
}

function sanitizeSensitiveMessage(message: string) {
  return message
    .replace(
      /authorization\s*:\s*bearer\s+[^\s,;]+/gi,
      "Authorization: Bearer ***",
    )
    .replace(/bearer\s+[A-Za-z0-9._~+/=-]{12,}/gi, "Bearer ***")
    .replace(/sk-[A-Za-z0-9._-]{8,}/gi, "sk-***")
    .replace(/api[_-]?key\s*[:=]\s*[^\s,;]+/gi, "API Key ***")
    .replace(/https?:\/\/[^\s"'<>]+/gi, "[Base URL]");
}

function getBackendErrorMessage(error: unknown) {
  if (!isAxiosError(error)) {
    return "";
  }

  const responseData = error.response?.data;

  if (
    typeof responseData !== "object" ||
    responseData === null ||
    !("message" in responseData)
  ) {
    return "";
  }

  const message = (responseData as { message?: unknown }).message;

  return typeof message === "string"
    ? sanitizeSensitiveMessage(message.trim())
    : "";
}

function getChatErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const backendMessage = getBackendErrorMessage(error);

    if (backendMessage) {
      return backendMessage;
    }

    if (error.code === "ECONNABORTED" || status === 408 || status === 504) {
      return "回答生成超时，请稍后重试，或缩短问题后再次发送。";
    }

    if (status === 400) {
      return "请输入问题内容，并确认检索数量参数不少于 1。";
    }

    if (status === 404) {
      return "会话或知识库不存在，或你没有访问权限。";
    }

    if (!error.response) {
      return "无法连接问答服务，请确认后端已启动。";
    }

    if (status && status >= 500) {
      return "回答生成失败，模型调用或消息保存没有完成，请稍后重试。";
    }
  }

  return "操作失败，请稍后重试。";
}

function MessageBubble({
  message,
  selected,
  onSelectAssistantMessage,
}: {
  message: ChatMessageResponse;
  selected?: boolean;
  onSelectAssistantMessage?: (messageId: number) => void;
}) {
  const isUser = message.role === "USER";
  const messageSources = message.sources ?? [];

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
      <article
        className={cn(
          "min-w-0 flex-1 rounded-[8px] border bg-white p-4 text-sm leading-7 text-slate-700 shadow-sm transition-colors",
          selected ? "border-blue-300 ring-2 ring-blue-100" : "border-slate-200",
        )}
        onClick={() => onSelectAssistantMessage?.(message.id)}
      >
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
        {messageSources.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {messageSources.map((source, index) => (
              <span
                key={getSourceKey(source)}
                className="inline-flex max-w-full items-center gap-1 rounded-[5px] border border-blue-100 bg-blue-50 px-2 py-1 text-xs text-blue-700"
              >
                <span className="shrink-0">[{index + 1}]</span>
                <span className="min-w-0 truncate">
                  {source.documentName}
                </span>
                <span className="shrink-0">Chunk #{source.chunkIndex}</span>
                <span className="shrink-0 text-blue-500">
                  混合分 {formatScore(source.hybridScore ?? source.score)}
                </span>
                <span className="shrink-0 text-blue-500">
                  全文 {formatScore(source.fulltextScore)}
                </span>
                <span className="shrink-0 text-blue-500">
                  语义 {formatScore(source.semanticScore)}
                </span>
              </span>
            ))}
          </div>
        ) : (
          <div className="mt-4 flex items-start gap-2 rounded-[6px] border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
            <Info className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
            <span>当前回答没有可展示的引用来源。</span>
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
  const hasContent = source.content.trim().length > 0;
  const isLongContent = source.content.trim().length > SOURCE_PREVIEW_LENGTH;
  const displayContent = hasContent
    ? expanded || !isLongContent
      ? source.content
      : getSourcePreview(source.content)
    : "这个引用来源没有返回片段摘要。";

  return (
    <article className="rounded-[8px] border border-slate-200 bg-white p-3 shadow-sm">
      <button
        type="button"
        className="flex w-full cursor-pointer items-start gap-2 rounded-[6px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`${expanded ? "收起片段" : "展开片段"}：${source.documentName} Chunk #${source.chunkIndex}`}
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
            <span>{getRetrievalModeLabel(source.retrievalMode)}</span>
            <span className="text-slate-300">/</span>
            <span>混合分 {formatScore(source.hybridScore ?? source.score)}</span>
            <span className="text-slate-300">/</span>
            <span>全文 {formatScore(source.fulltextScore)}</span>
            <span className="text-slate-300">/</span>
            <span>语义 {formatScore(source.semanticScore)}</span>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "mt-0.5 size-4 shrink-0 text-slate-400 transition-transform duration-200",
            expanded && "rotate-180",
          )}
        />
      </button>
      <p
        className={cn(
          "mt-3 whitespace-pre-wrap break-words rounded-[6px] border border-slate-200 bg-slate-50/70 p-3 text-xs leading-5 text-slate-600",
          !expanded && "max-h-24 overflow-hidden",
        )}
      >
        {displayContent}
      </p>
      {isLongContent && (
        <div className="mt-2 text-right text-[11px] font-medium text-blue-600">
          {expanded ? "收起片段" : "展开查看完整片段"}
        </div>
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
  onMarkUnread,
}: {
  session: ChatSessionResponse;
  isActive: boolean;
  isBusy: boolean;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onMarkUnread: () => void;
}) {
  const isPinned = session.pinned === true;
  const isUnread = session.unread === true;
  const isGenerating = session.status === "GENERATING";
  const isFailed = session.status === "FAILED";

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
          {isGenerating && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-[4px] border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
              <Loader2 className="size-3 animate-spin" />
              生成中
            </span>
          )}
          {isUnread && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-[4px] border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">
              <CircleDot className="size-3" />
              未读
            </span>
          )}
          {isFailed && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-[4px] border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
              <TriangleAlert className="size-3" />
              失败
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
              <DropdownMenuItem
                className="cursor-pointer tracking-normal normal-case"
                disabled={isUnread}
                onSelect={onMarkUnread}
              >
                <MailOpen />
                设为未读
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

type LoadMessagesOptions = {
  silent?: boolean;
  preserveSources?: boolean;
  scrollOnNewAssistant?: boolean;
  scrollToBottom?: boolean;
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
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ChatSessionResponse[]>([]);
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isCancellingGeneration, setIsCancellingGeneration] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [generationNotice, setGenerationNotice] = useState("");
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
  const [selectedAssistantMessageId, setSelectedAssistantMessageId] =
    useState<number | null>(null);
  const [modelSettings, setModelSettings] =
    useState<ModelSettingsResponse | null>(null);
  const [modelOptions, setModelOptions] = useState<ModelListItem[]>([]);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [, setModelError] = useState("");
  const refreshUnreadCount = useChatStatusStore(
    (state) => state.refreshUnreadCount,
  );
  const refreshTodayUsage = useChatStatusStore(
    (state) => state.refreshTodayUsage,
  );
  const activeSessionIdRef = useRef<number | null>(null);
  const sessionsRef = useRef<ChatSessionResponse[]>([]);
  const messagesRef = useRef<ChatMessageResponse[]>([]);
  const selectedModelIdRef = useRef("");
  const messageScrollRef = useRef<HTMLDivElement>(null);
  const latestInitialSessionIdRef = useRef(initialSessionId);
  const onSessionChangeRef = useRef(onSessionChange);
  const onSessionClearedRef = useRef(onSessionCleared);
  const onUnauthorizedRef = useRef(onUnauthorized);
  const normalMessageRequestSeqRef = useRef(0);
  const isSendingRef = useRef(false);
  const activeSession = sessions.find((session) => session.id === activeSessionId);
  const latestAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === "ASSISTANT");
  const selectedAssistantMessage = useMemo(
    () =>
      messages.find(
        (message) =>
          message.role === "ASSISTANT" &&
          message.id === selectedAssistantMessageId,
      ) ??
      latestAssistantMessage ??
      null,
    [latestAssistantMessage, messages, selectedAssistantMessageId],
  );
  const selectedSources = useMemo(
    () => getMessageSources(selectedAssistantMessage),
    [selectedAssistantMessage],
  );
  const latestSources = selectedSources;
  const hasLatestSources = latestSources.length > 0;
  const composerModelOptions = useMemo(
    () => buildModelOptions(modelSettings, modelOptions),
    [modelOptions, modelSettings],
  );
  const isActiveSessionGenerating = activeSession?.status === "GENERATING";
  const isActiveSessionFailed = activeSession?.status === "FAILED";
  const activeGenerationError = !isSending && isActiveSessionFailed
    ? getSessionGenerationError(activeSession)
    : "";
  const activeGenerationNotice = activeGenerationError
    ? `回答生成失败：${activeGenerationError}`
    : generationNotice;
  const shouldShowModelSettingsLink =
    Boolean(activeGenerationError && isModelConfigurationError(activeGenerationError)) ||
    (generationNotice ? isModelConfigurationError(generationNotice) : false);
  const showGenerationPending =
    (isSending || isActiveSessionGenerating) && !activeGenerationNotice;
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
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    selectedModelIdRef.current = selectedModelId;
  }, [selectedModelId]);

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

  useEffect(() => {
    isSendingRef.current = isSending;
  }, [isSending]);

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

  const loadModelConfiguration = useCallback(async () => {
    setIsLoadingModels(true);
    setModelError("");

    try {
      const settings = await getModelSettings();
      setModelSettings(settings);

      const savedModel = settings.model?.trim() ?? "";
      setSelectedModelId(savedModel);
      selectedModelIdRef.current = savedModel;

      try {
        const response = await fetchModelList({});
        setModelOptions(response.models);
      } catch (error) {
        setModelOptions([]);

        if (isAxiosError(error) && error.response?.status === 401) {
          onUnauthorizedRef.current();
          return;
        }

        setModelError(
          getBackendErrorMessage(error) ||
            "模型列表获取失败，将使用已保存模型发送。",
        );
      }
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) {
        onUnauthorizedRef.current();
        return;
      }

      setModelError(
        getBackendErrorMessage(error) || "模型配置加载失败，请先到 Settings 保存配置。",
      );
    } finally {
      setIsLoadingModels(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadModelConfiguration();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadModelConfiguration]);

  const scrollMessagesToBottom = useCallback(() => {
    window.requestAnimationFrame(() => {
      const messageScroll = messageScrollRef.current;

      if (!messageScroll) {
        return;
      }

      messageScroll.scrollTop = messageScroll.scrollHeight;
    });
  }, []);

  const replaceMessages = useCallback((nextMessages: ChatMessageResponse[]) => {
    messagesRef.current = nextMessages;
    setMessages(nextMessages);
    const latestAssistant = [...nextMessages]
      .reverse()
      .find((message) => message.role === "ASSISTANT");

    setSelectedAssistantMessageId((currentId) => {
      if (
        currentId &&
        nextMessages.some(
          (message) => message.role === "ASSISTANT" && message.id === currentId,
        )
      ) {
        return currentId;
      }

      return latestAssistant?.id ?? null;
    });
  }, []);

  const updateMessages = useCallback(
    (
      updater: (
        currentMessages: ChatMessageResponse[],
      ) => ChatMessageResponse[],
    ) => {
      setMessages((currentMessages) => {
        const nextMessages = updater(currentMessages);

        messagesRef.current = nextMessages;
        return nextMessages;
      });
    },
    [],
  );

  const applySessions = useCallback(
    (nextSessions: ChatSessionResponse[]) => {
      const normalizedSessions = normalizeChatSessions(nextSessions);

      sessionsRef.current = normalizedSessions;
      setSessions(normalizedSessions);
      void refreshUnreadCount();

      return normalizedSessions;
    },
    [refreshUnreadCount],
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
    async (sessionId: number, options: LoadMessagesOptions = {}) => {
      const isSilent = options.silent === true;
      const normalRequestSeqAtStart = normalMessageRequestSeqRef.current;
      let normalRequestSeq = normalRequestSeqAtStart;

      if (!isSilent) {
        normalRequestSeq = normalMessageRequestSeqRef.current + 1;
        normalMessageRequestSeqRef.current = normalRequestSeq;
        setIsLoadingMessages(true);
      }
      setErrorMessage("");
      if (!isSilent) {
        setGenerationNotice("");
      }
      if (!options.preserveSources) {
        setExpandedSources(new Set());
      }

      try {
        const response = await getChatSessionMessages(sessionId);

        const hasNewerNormalRequest =
          normalMessageRequestSeqRef.current !== normalRequestSeq;
        const hasNormalRequestAfterSilent =
          normalMessageRequestSeqRef.current !== normalRequestSeqAtStart;

        if (
          activeSessionIdRef.current !== sessionId ||
          (!isSilent && hasNewerNormalRequest) ||
          (isSilent && hasNormalRequestAfterSilent)
        ) {
          return;
        }

        const previousAssistantIds = new Set(
          messagesRef.current
            .filter((message) => message.role === "ASSISTANT")
            .map((message) => message.id),
        );
        const hasNewAssistantMessage = response.some(
          (message) =>
            message.role === "ASSISTANT" &&
            !previousAssistantIds.has(message.id),
        );

        replaceMessages(response);
        if (!options.preserveSources) {
          setExpandedSources(new Set());
        }
        if (
          options.scrollToBottom ||
          (options.scrollOnNewAssistant && hasNewAssistantMessage)
        ) {
          scrollMessagesToBottom();
        }
      } catch (error) {
        const hasNewerNormalRequest =
          normalMessageRequestSeqRef.current !== normalRequestSeq;
        const hasNormalRequestAfterSilent =
          normalMessageRequestSeqRef.current !== normalRequestSeqAtStart;

        if (
          activeSessionIdRef.current !== sessionId ||
          (!isSilent && hasNewerNormalRequest) ||
          (isSilent && hasNormalRequestAfterSilent)
        ) {
          return;
        }

        if (!isSilent) {
          replaceMessages([]);
        }
        if (!options.preserveSources) {
          setExpandedSources(new Set());
        }
        setErrorMessage(handleRequestError(error));
      } finally {
        if (
          !isSilent &&
          normalMessageRequestSeqRef.current === normalRequestSeq
        ) {
          setIsLoadingMessages(false);
        }
      }
    },
    [handleRequestError, replaceMessages, scrollMessagesToBottom],
  );

  const loadSessions = useCallback(
    async (preferredSessionId?: string) => {
      setIsLoadingSessions(true);
      setErrorMessage("");
      setExpandedSources(new Set());

      try {
        const response = await getKnowledgeBaseChatSessions(knowledgeBase.id);
        const sortedSessions = applySessions(response);
        const preferredNumericId = preferredSessionId
          ? Number(preferredSessionId)
          : NaN;
        const preferredSession = sortedSessions.find(
          (session) => session.id === preferredNumericId,
        );
        const nextActiveSession =
          preferredSession ??
          (preferredSessionId ? null : sortedSessions[0] ?? null);

        selectSession(nextActiveSession?.id ?? null, {
          syncUrl: !preferredSessionId || !!nextActiveSession,
        });

        if (preferredSessionId && !preferredSession) {
          setErrorMessage("这个会话不存在，或你没有访问权限。");
        }

        if (nextActiveSession) {
          await loadMessages(nextActiveSession.id, { scrollToBottom: true });
        } else {
          replaceMessages([]);
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
    [
      applySessions,
      handleRequestError,
      knowledgeBase.id,
      loadMessages,
      replaceMessages,
      selectSession,
    ],
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

      setSessions((currentSessions) => {
        const nextSessions = normalizeChatSessions([
          normalizedSession,
          ...currentSessions,
        ]);

        sessionsRef.current = nextSessions;
        return nextSessions;
      });
      void refreshUnreadCount();
      selectSession(normalizedSession.id);
      replaceMessages([]);
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

  const replaceSession = useCallback(
    (session: ChatSessionResponse) => {
      const normalizedSession = normalizeChatSession(session);

      setSessions((currentSessions) => {
        const nextSessions = normalizeChatSessions(
          currentSessions.map((item) =>
            item.id === normalizedSession.id ? normalizedSession : item,
          ),
        );

        sessionsRef.current = nextSessions;
        return nextSessions;
      });
      void refreshUnreadCount();

      return normalizedSession;
    },
    [refreshUnreadCount],
  );

  const handleOpenSession = useCallback(
    async (sessionId: number) => {
      if (sessionId === activeSessionIdRef.current) {
        return;
      }

      const targetSession = sessionsRef.current.find(
        (session) => session.id === sessionId,
      );

      replaceMessages([]);
      selectSession(sessionId);
      await loadMessages(sessionId, { scrollToBottom: true });

      if (targetSession?.unread) {
        try {
          replaceSession(await updateChatSession(sessionId, { unread: false }));
        } catch (error) {
          setErrorMessage(handleRequestError(error));
        }
      }
    },
    [
      handleRequestError,
      loadMessages,
      replaceMessages,
      replaceSession,
      selectSession,
    ],
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
      void refreshUnreadCount();

      if (!wasActive) {
        return;
      }

      const nextSession = sortedRemainingSessions[0] ?? null;
      selectSession(nextSession?.id ?? null);

      if (nextSession) {
        await loadMessages(nextSession.id);
      } else {
        replaceMessages([]);
        setExpandedSources(new Set());
      }
    },
    [loadMessages, refreshUnreadCount, replaceMessages, selectSession],
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

      replaceSession(response);
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
      const updatedSession = replaceSession(response);

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

  const handleMarkUnread = async (session: ChatSessionResponse) => {
    if (session.unread) {
      return;
    }

    setMutatingSessionId(session.id);
    setErrorMessage("");

    try {
      replaceSession(await updateChatSession(session.id, { unread: true }));
      toast.success("已设为未读");
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

  const refreshSessionsForPolling = useCallback(async () => {
    const response = await getKnowledgeBaseChatSessions(knowledgeBase.id);

    return applySessions(response);
  }, [applySessions, knowledgeBase.id]);

  const pollGenerationResult = useCallback(
    async (sessionId: number) => {
      let attempts = 0;

      while (attempts < MAX_GENERATION_POLL_ATTEMPTS) {
        attempts += 1;
        await new Promise((resolve) => window.setTimeout(resolve, POLL_INTERVAL_MS));

        const nextSessions = await refreshSessionsForPolling();
        const targetSession = nextSessions.find(
          (session) => session.id === sessionId,
        );
        const isActiveTarget = activeSessionIdRef.current === sessionId;

        if (isActiveTarget) {
          await loadMessages(sessionId, {
            preserveSources: true,
            scrollOnNewAssistant: true,
            silent: true,
          });
        }

        if (!targetSession) {
          if (isActiveTarget) {
            setGenerationNotice("这个会话不存在，或你没有访问权限。");
          }
          return;
        }

        if (targetSession.status === "IDLE") {
          if (isActiveTarget) {
            setGenerationNotice("");
            await loadMessages(sessionId, {
              preserveSources: true,
              scrollOnNewAssistant: true,
              silent: true,
            });
          }
          return;
        }

        if (targetSession.status === "FAILED") {
          if (isActiveTarget) {
            setGenerationNotice(
              `回答生成失败：${getSessionGenerationError(targetSession)}`,
            );
            await loadMessages(sessionId, {
              preserveSources: true,
              scrollToBottom: true,
              silent: true,
            });
          }
          return;
        }
      }

      if (activeSessionIdRef.current === sessionId) {
        setGenerationNotice(GENERATION_TIMEOUT_MESSAGE);
        await loadMessages(sessionId, {
          preserveSources: true,
          silent: true,
        });
      }
    },
    [loadMessages, refreshSessionsForPolling],
  );

  useEffect(() => {
    if (!sessions.some((session) => session.status === "GENERATING")) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshSessionsForPolling()
        .then((nextSessions) => {
          const activeSession = nextSessions.find(
            (session) => session.id === activeSessionIdRef.current,
          );

          if (activeSession?.status === "GENERATING") {
            void loadMessages(activeSession.id, {
              preserveSources: true,
              scrollOnNewAssistant: true,
              silent: true,
            });
          } else if (activeSession?.status === "FAILED") {
            setGenerationNotice(
              `回答生成失败：${getSessionGenerationError(activeSession)}`,
            );
            void loadMessages(activeSession.id, {
              preserveSources: true,
              silent: true,
            });
          } else if (activeSession?.status === "IDLE") {
            setGenerationNotice("");
          }
        })
        .catch((error: unknown) => {
          setErrorMessage(handleRequestError(error));
        });
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [
    handleRequestError,
    loadMessages,
    refreshSessionsForPolling,
    sessions,
  ]);

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
      replaceMessages([]);
      setExpandedSources(new Set());
      activeSessionIdRef.current = null;
      setActiveSessionId(null);
      return;
    }

    replaceMessages([]);
    void handleOpenSession(targetSessionId);
  }, [handleOpenSession, initialSessionId, isLoadingSessions, replaceMessages]);

  const handleSubmit = async (payload: ChatComposerPayload) => {
    if (isSendingRef.current) {
      return;
    }

    const content = payload.message.trim();

    if (!content) {
      setErrorMessage("请输入问题内容。");
      return;
    }

    isSendingRef.current = true;
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

      updateMessages((currentMessages) => [...currentMessages, userMessage]);
      scrollMessagesToBottom();

      const selectedModel =
        payload.modelId.trim() || selectedModelIdRef.current.trim();
      const response = await sendChatSessionMessage(session.id, {
        content,
        limit: DEFAULT_CHAT_LIMIT,
        ...(selectedModel ? { model: selectedModel } : {}),
        ragEnabled: payload.ragEnabled,
      });
      const savedUserMessage = response.userMessage ?? userMessage;
      const nextSession = response.session
        ? normalizeChatSession(response.session)
        : {
            ...session,
            status: "GENERATING" as const,
            unread: false,
            updatedAt: savedUserMessage.createdAt,
          };

      updateMessages((currentMessages) => {
        const withoutOptimisticMessage = currentMessages.filter(
          (message) => message.id !== userMessage.id,
        );
        const withSavedUserMessage = [
          ...withoutOptimisticMessage,
          savedUserMessage,
        ];

        return response.message
          ? [...withSavedUserMessage, response.message]
          : withSavedUserMessage;
      });
      scrollMessagesToBottom();
      setSessions((currentSessions) => {
        const nextSessions = normalizeChatSessions(
          currentSessions.map((item) =>
            item.id === session.id
              ? {
                  ...item,
                  ...nextSession,
                  title:
                    item.title === "新会话"
                      ? getDefaultSessionTitle(content)
                      : nextSession.title,
                }
              : item,
          ),
        );

        sessionsRef.current = nextSessions;
        return nextSessions;
      });
      void refreshUnreadCount();
      void refreshTodayUsage();
      setExpandedSources(new Set());
      void pollGenerationResult(session.id).catch((error: unknown) => {
        setErrorMessage(handleRequestError(error));
      });
    } catch (error) {
      updateMessages((currentMessages) =>
        currentMessages.filter((message) => message.id >= 0),
      );
      setErrorMessage(handleRequestError(error));
      throw error;
    } finally {
      await refreshTodayUsage();
      isSendingRef.current = false;
      setIsSending(false);
    }
  };

  const handleCancelGeneration = async () => {
    const sessionId = activeSessionIdRef.current;

    if (!sessionId || isCancellingGeneration) {
      return;
    }

    setIsCancellingGeneration(true);
    setGenerationNotice("");

    try {
      const response = await cancelChatSessionGeneration(sessionId);
      replaceSession(response);
      isSendingRef.current = false;
      setIsSending(false);
      toast.success("已打断本次生成");
    } catch (error) {
      setErrorMessage(handleRequestError(error));
    } finally {
      setIsCancellingGeneration(false);
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

  const handleModelChange = async (modelId: string) => {
    const nextModelId = modelId.trim();

    setSelectedModelId(nextModelId);
    selectedModelIdRef.current = nextModelId;
    setModelError("");

    if (
      !modelSettings?.baseUrl ||
      !modelSettings.timeoutSeconds ||
      !nextModelId
    ) {
      return;
    }

    try {
      const nextSettings = await updateModelSettings({
        baseUrl: modelSettings.baseUrl,
        model: nextModelId,
        timeoutSeconds: modelSettings.timeoutSeconds,
      });

      setModelSettings(nextSettings);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) {
        onUnauthorizedRef.current();
        return;
      }

      setModelError(
        getBackendErrorMessage(error) ||
          "模型选择已用于本次 Chat 发送，但同步 Settings 失败。",
      );
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <section
      className={cn(
        isEmbedded
          ? "flex h-full min-h-0 flex-col overflow-hidden bg-white text-slate-900"
          : "grid h-full min-h-0 grid-cols-1 grid-rows-[minmax(9rem,0.32fr)_minmax(0,1fr)_minmax(9rem,0.32fr)] overflow-hidden bg-white text-slate-900 xl:grid-cols-[240px_minmax(0,1fr)_320px] xl:grid-rows-1",
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
                        <span className="min-w-0 truncate">{item.name}</span>
                        {item.sharedWithMe && (
                          <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                            共享
                          </span>
                        )}
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
                    onMarkUnread={() => void handleMarkUnread(session)}
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
              <KnowledgeBaseRoleBadge item={knowledgeBase} />
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
            后台生成 · 会结合当前会话上下文
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

        <div
          ref={messageScrollRef}
          className="min-h-0 flex-1 overflow-auto bg-white px-4 py-5 lg:px-6"
        >
          <div className="mx-auto flex max-w-[820px] flex-col gap-5">
            {isLoadingMessages ? (
              <div className="flex flex-col gap-4">
                <Skeleton className="ml-auto h-16 w-2/3 rounded-[8px] bg-blue-100" />
                <Skeleton className="h-32 w-full rounded-[8px] bg-slate-100" />
              </div>
            ) : hasMessages ? (
              messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  selected={
                    message.role === "ASSISTANT" &&
                    message.id === selectedAssistantMessage?.id
                  }
                  onSelectAssistantMessage={setSelectedAssistantMessageId}
                />
              ))
            ) : (
              <EmptyConversation knowledgeBaseName={knowledgeBase.name} />
            )}

            {showGenerationPending && (
              <div className="flex items-center gap-3 rounded-[8px] border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs text-slate-600">
                <Loader2 className="size-4 animate-spin text-blue-600" />
                问题已发送，正在等待后台生成结果...
              </div>
            )}

            {activeGenerationNotice && (
              <div
                role="alert"
                className="flex flex-col gap-3 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium">回答没有生成完成</div>
                    <p className="mt-1 break-words text-xs leading-5">
                      {activeGenerationNotice}
                    </p>
                  </div>
                </div>
                {shouldShowModelSettingsLink && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0 self-start border-red-200 bg-white text-xs text-red-700 hover:bg-red-100 hover:text-red-800"
                    onClick={() => navigate("/Settings")}
                  >
                    <Settings2 data-icon="inline-start" />
                    去 Settings 检查模型配置
                  </Button>
                )}
              </div>
            )}

            {selectedAssistantMessage && !showGenerationPending && (
              <div
                className={cn(
                  "rounded-[8px] border px-4 py-3 text-xs text-slate-600",
                  hasLatestSources
                    ? "border-emerald-200 bg-emerald-50/50"
                    : "border-slate-200 bg-slate-50",
                )}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="inline-flex min-w-0 items-center gap-2">
                    {hasLatestSources ? (
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                    ) : (
                      <Info className="size-4 shrink-0 text-slate-500" />
                    )}
                    <span className="min-w-0 truncate">
                      {hasLatestSources
                        ? `本次回答引用 ${latestSources.length} 个来源`
                        : "当前回答没有可展示的引用来源"}
                    </span>
                  </span>
                  <span className="shrink-0 text-slate-500">
                    {formatCompactDateTime(selectedAssistantMessage.createdAt)}
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
            disabled={isLoadingSessions || isLoadingMessages}
            isSubmitting={isSending || isActiveSessionGenerating}
            submitLabel={isSending || isActiveSessionGenerating ? "打断" : "发送"}
            showAttachmentButton={false}
            showContextControls={composerModelOptions.length > 0 || isLoadingModels}
            modelOptions={composerModelOptions}
            selectedModelId={selectedModelId}
            onModelChange={(modelId) => void handleModelChange(modelId)}
            isLoadingModels={isLoadingModels}
            controlsDisabled={isActiveSessionGenerating || isCancellingGeneration}
            onCancel={handleCancelGeneration}
            helperText="Enter 发送，Shift + Enter 换行。发送后会先展示你的问题，再轮询后台生成结果。"
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
          ) : selectedAssistantMessage ? (
            <div className="rounded-[8px] border border-dashed border-slate-200 px-4 py-8 text-center">
              <Info className="mx-auto size-7 text-slate-300" />
              <h3 className="mt-3 text-sm font-semibold text-slate-800">
                当前回答没有可展示的引用来源
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                后端返回了助手回答，但 sources 为空；这通常表示当前问题没有匹配到足够可展示的文档片段。
              </p>
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
