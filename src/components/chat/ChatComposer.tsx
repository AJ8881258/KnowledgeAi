import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import {
  Bot,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Maximize2,
  Minimize2,
  Paperclip,
  Send,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type ChatAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
};

export type ChatComposerPayload = {
  message: string;
  attachments: ChatAttachment[];
  modelId: string;
  ragEnabled: boolean;
  mentionedDocumentIds: number[];
};

export type ChatMentionDocument = {
  id: number;
  name: string;
};

type ChatModel = {
  id: string;
  label: string;
};

type ChatComposerProps = {
  placeholder: string;
  onSubmit: (payload: ChatComposerPayload) => void | Promise<void>;
  className?: string;
  disabled?: boolean;
  isSubmitting?: boolean;
  submitLabel?: string;
  showAttachmentButton?: boolean;
  showContextControls?: boolean;
  helperText?: string;
  modelOptions?: ChatModel[];
  selectedModelId?: string;
  onModelChange?: (modelId: string) => void;
  isLoadingModels?: boolean;
  controlsDisabled?: boolean;
  onCancel?: () => void | Promise<void>;
  mentionDocuments?: ChatMentionDocument[];
  isLoadingMentionDocuments?: boolean;
};

const MAX_CHAT_MESSAGE_LENGTH = 4000;
const ALLOWED_ATTACHMENT_EXTENSIONS = [".pdf", ".md", ".markdown", ".txt"];
const MENTION_PAGE_SIZE = 6;

type MentionTrigger = {
  start: number;
  end: number;
  query: string;
};

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

function createAttachmentId(file: File) {
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Date.now());

  return `${file.name}-${file.size}-${file.lastModified}-${randomId}`;
}

function getMentionTrigger(
  value: string,
  cursorPosition: number,
): MentionTrigger | null {
  const beforeCursor = value.slice(0, cursorPosition);
  const atIndex = beforeCursor.lastIndexOf("@");

  if (atIndex < 0) {
    return null;
  }

  const previousCharacter = atIndex === 0 ? "" : value[atIndex - 1];

  if (previousCharacter && !/\s/.test(previousCharacter)) {
    return null;
  }

  const token = beforeCursor.slice(atIndex + 1);

  if (/\s/.test(token)) {
    return null;
  }

  return {
    start: atIndex,
    end: cursorPosition,
    query: token,
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasMentionToken(value: string, documentName: string) {
  return new RegExp(
    `(^|\\s)@${escapeRegExp(documentName)}(?=\\s|$)`,
    "u",
  ).test(value);
}

function highlightMatch(name: string, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return name;
  }

  const matchIndex = name.toLowerCase().indexOf(normalizedQuery);

  if (matchIndex < 0) {
    return name;
  }

  return (
    <>
      {name.slice(0, matchIndex)}
      <mark className="rounded-[3px] bg-amber-100 px-0.5 text-amber-900">
        {name.slice(matchIndex, matchIndex + normalizedQuery.length)}
      </mark>
      {name.slice(matchIndex + normalizedQuery.length)}
    </>
  );
}

export function ChatComposer({
  placeholder,
  onSubmit,
  className,
  disabled = false,
  isSubmitting = false,
  submitLabel = "发送",
  showAttachmentButton = true,
  showContextControls = true,
  helperText = "Shift + Enter 换行，Enter 发送",
  modelOptions,
  selectedModelId,
  onModelChange,
  isLoadingModels = false,
  controlsDisabled = false,
  onCancel,
  mentionDocuments = [],
  isLoadingMentionDocuments = false,
}: ChatComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [chatInput, setChatInput] = useState("");
  const [ragEnabled, setRagEnabled] = useState(true);
  const [modelId, setModelId] = useState("");
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [attachmentSheetOpen, setAttachmentSheetOpen] = useState(false);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState("");
  const [mentionTrigger, setMentionTrigger] = useState<MentionTrigger | null>(
    null,
  );
  const [mentionPickerOpen, setMentionPickerOpen] = useState(false);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);
  const [mentionPage, setMentionPage] = useState(0);
  const [selectedMentions, setSelectedMentions] = useState<
    ChatMentionDocument[]
  >([]);
  const availableModels = modelOptions ?? [];
  const currentModelId = selectedModelId ?? modelId;
  const visibleAttachments = showAttachmentButton ? attachments : [];
  const hasMessageContent =
    chatInput.trim().length > 0 || visibleAttachments.length > 0;
  const isBusy = disabled || isSubmitting;
  const isControlBusy = isBusy || controlsDisabled;
  const selectedModel =
    availableModels.find((model) => model.id === currentModelId) ??
    (currentModelId
      ? {
          id: currentModelId,
          label: currentModelId,
        }
      : null);
  const chatLineCount = Math.max(
    2,
    chatInput.split("\n").length + Math.floor(chatInput.length / 72),
  );
  const chatInputHeight = isInputExpanded
    ? "30vh"
    : `min(30vh, ${Math.min(168, chatLineCount * 24 + 24)}px)`;
  const filteredMentionDocuments = useMemo(() => {
    const keyword = mentionTrigger?.query.trim().toLowerCase() ?? "";

    if (!keyword) {
      return mentionDocuments;
    }

    return mentionDocuments.filter((document) =>
      document.name.toLowerCase().includes(keyword),
    );
  }, [mentionDocuments, mentionTrigger?.query]);
  const mentionPageCount = Math.max(
    1,
    Math.ceil(filteredMentionDocuments.length / MENTION_PAGE_SIZE),
  );
  const visibleMentionDocuments = filteredMentionDocuments.slice(
    mentionPage * MENTION_PAGE_SIZE,
    mentionPage * MENTION_PAGE_SIZE + MENTION_PAGE_SIZE,
  );

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
          id: createAttachmentId(file),
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

  const handleRagToggle = () => {
    setRagEnabled((currentValue) => {
      const nextValue = !currentValue;
      toast.success(nextValue ? "RAG 已启用" : "RAG 已关闭");
      return nextValue;
    });
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(event.target.files);
  };

  const handleChatInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = event.target.value;
    const cursorPosition = event.target.selectionStart ?? nextValue.length;
    const nextTrigger = getMentionTrigger(nextValue, cursorPosition);

    setChatInput(nextValue);
    setSelectedMentions((currentMentions) =>
      currentMentions.filter((mention) =>
        hasMentionToken(nextValue, mention.name),
      ),
    );
    setMentionTrigger(nextTrigger);
    setMentionPickerOpen(Boolean(nextTrigger));
    setMentionSelectedIndex(0);
    setMentionPage(0);
  };

  const insertMention = (document: ChatMentionDocument) => {
    const cursorPosition =
      textAreaRef.current?.selectionStart ?? chatInput.length;
    const trigger = mentionTrigger ?? getMentionTrigger(chatInput, cursorPosition);
    const mentionStartIndex = trigger?.start ?? -1;
    const mentionEndIndex = trigger?.end ?? cursorPosition;
    const insertion = `@${document.name} `;
    const nextInput =
      mentionStartIndex >= 0
        ? `${chatInput.slice(0, mentionStartIndex)}${insertion}${chatInput.slice(mentionEndIndex)}`
        : `${chatInput}${chatInput.endsWith(" ") || !chatInput ? "" : " "}${insertion}`;
    const nextCursorPosition =
      mentionStartIndex >= 0
        ? mentionStartIndex + insertion.length
        : nextInput.length;

    setChatInput(nextInput);
    setSelectedMentions((currentMentions) =>
      currentMentions.some((mention) => mention.id === document.id)
        ? currentMentions
        : [...currentMentions, document],
    );
    setMentionPickerOpen(false);
    setMentionTrigger(null);
    setMentionSelectedIndex(0);
    setMentionPage(0);

    window.requestAnimationFrame(() => {
      textAreaRef.current?.focus();
      textAreaRef.current?.setSelectionRange(
        nextCursorPosition,
        nextCursorPosition,
      );
    });
  };

  const removeMention = (documentId: number) => {
    const targetMention = selectedMentions.find(
      (mention) => mention.id === documentId,
    );

    setSelectedMentions((currentMentions) =>
      currentMentions.filter((mention) => mention.id !== documentId),
    );
    if (targetMention) {
      const escapedName = escapeRegExp(targetMention.name);
      const tokenPattern = new RegExp(`(^|\\s)@${escapedName}\\s?`, "u");
      setChatInput((currentInput) => currentInput.replace(tokenPattern, "$1"));
    }
    setMentionPickerOpen(false);
    setMentionTrigger(null);
  };

  const handleSendMessage = async () => {
    if (!hasMessageContent || disabled || isSubmitting) {
      return;
    }

    const payload = {
      message: chatInput.trim(),
      attachments: visibleAttachments,
      modelId: selectedModel?.id ?? currentModelId,
      ragEnabled: showContextControls ? ragEnabled : true,
      mentionedDocumentIds: selectedMentions.map((mention) => mention.id),
    };

    try {
      await onSubmit(payload);
      setChatInput("");
      if (showAttachmentButton) {
        setAttachments([]);
      }
      setSelectedMentions([]);
      setMentionPickerOpen(false);
      setMentionTrigger(null);
      setMentionSelectedIndex(0);
      setMentionPage(0);
      setIsInputExpanded(false);
    } catch {
      return;
    }
  };

  const handleChatKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionPickerOpen) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setMentionSelectedIndex((currentIndex) =>
          visibleMentionDocuments.length === 0
            ? 0
            : Math.min(currentIndex + 1, visibleMentionDocuments.length - 1),
        );
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setMentionSelectedIndex((currentIndex) =>
          Math.max(currentIndex - 1, 0),
        );
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setMentionPage((currentPage) => {
          const nextPage = Math.min(currentPage + 1, mentionPageCount - 1);
          if (nextPage !== currentPage) {
            setMentionSelectedIndex(0);
          }
          return nextPage;
        });
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setMentionPage((currentPage) => {
          const nextPage = Math.max(currentPage - 1, 0);
          if (nextPage !== currentPage) {
            setMentionSelectedIndex(0);
          }
          return nextPage;
        });
        return;
      }

      if (event.key === "Enter" || event.key === "Tab") {
        const selectedDocument = visibleMentionDocuments[mentionSelectedIndex];

        if (selectedDocument) {
          event.preventDefault();
          insertMention(selectedDocument);
          return;
        }
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setMentionPickerOpen(false);
        setMentionTrigger(null);
        return;
      }
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          "mx-auto max-w-[800px] rounded-[8px] border border-slate-200 bg-white p-3 shadow-sm",
          className,
        )}
      >
        {showAttachmentButton && attachments.length > 0 && (
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

        {selectedMentions.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {selectedMentions.map((mention) => (
              <span
                key={mention.id}
                className="inline-flex max-w-full items-center gap-2 rounded-[6px] border border-blue-100 bg-blue-50 px-2 py-1 text-xs text-blue-700"
                title={mention.name}
              >
                <FileText className="size-3.5 shrink-0" />
                <span className="max-w-[220px] truncate">{mention.name}</span>
                <button
                  type="button"
                  className="rounded text-blue-400 transition-colors hover:text-blue-700"
                  aria-label={`移除 ${mention.name}`}
                  onClick={() => removeMention(mention.id)}
                  disabled={isBusy}
                >
                  <X className="size-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-start gap-2">
          {showAttachmentButton && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="mt-1 rounded-[6px] text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              aria-label="添加附件"
              onClick={() => setAttachmentSheetOpen(true)}
              disabled={isBusy}
            >
              <Paperclip />
            </Button>
          )}
          <div className="relative flex-1">
          <Textarea
            ref={textAreaRef}
            value={chatInput}
            maxLength={MAX_CHAT_MESSAGE_LENGTH}
            onChange={handleChatInputChange}
            onKeyDown={handleChatKeyDown}
            onFocus={() => {
              const cursorPosition =
                textAreaRef.current?.selectionStart ?? chatInput.length;
              const nextTrigger = getMentionTrigger(chatInput, cursorPosition);
              if (nextTrigger) {
                setMentionTrigger(nextTrigger);
                setMentionPickerOpen(true);
              }
            }}
            className="min-h-12 w-full resize-none rounded-[6px] border-transparent px-2 py-2 text-sm leading-6 placeholder:text-slate-400 focus-visible:border-transparent focus-visible:ring-0"
            style={{ height: chatInputHeight, maxHeight: "30vh" }}
            placeholder={placeholder}
            aria-label="输入问题"
            disabled={isBusy}
          />
            {mentionPickerOpen && !isBusy && (
              <div className="absolute right-0 bottom-full left-0 z-20 mb-2 max-h-[55vh] min-w-0 rounded-[8px] border border-slate-200 bg-white p-2 shadow-lg sm:left-auto sm:w-[28rem]">
                <div className="px-2 py-1 text-xs text-slate-500">
                  {mentionTrigger?.query
                    ? `筛选：${mentionTrigger.query}`
                    : "输入文档名继续筛选"}
                </div>
                <div className="mt-2 max-h-48 overflow-auto">
                  {isLoadingMentionDocuments ? (
                    <div className="flex items-center gap-2 px-2 py-3 text-xs text-slate-500">
                      <Loader2 className="size-3.5 animate-spin" />
                      正在加载文档...
                    </div>
                  ) : visibleMentionDocuments.length > 0 ? (
                    visibleMentionDocuments.map((document, index) => (
                      <button
                        key={document.id}
                        type="button"
                        className={cn(
                          "flex min-h-10 w-full items-center gap-2 rounded-[6px] px-2 py-2 text-left text-xs text-slate-700 hover:bg-slate-50",
                          index === mentionSelectedIndex && "bg-blue-50 text-blue-700",
                        )}
                        title={document.name}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          insertMention(document);
                        }}
                        >
                        <FileText className="size-3.5 shrink-0 text-slate-400" />
                        <span className="min-w-0 flex-1 break-words">
                          {highlightMatch(document.name, mentionTrigger?.query ?? "")}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-2 py-3 text-xs text-slate-500">
                      当前知识库没有匹配文档
                    </div>
                  )}
                </div>
                {filteredMentionDocuments.length > MENTION_PAGE_SIZE ? (
                  <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs text-slate-500">
                    <span>
                      {mentionPage + 1} / {mentionPageCount}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label="上一页"
                        disabled={mentionPage === 0}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          setMentionPage((currentPage) =>
                            Math.max(currentPage - 1, 0),
                          );
                          setMentionSelectedIndex(0);
                        }}
                      >
                        <ChevronLeft />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label="下一页"
                        disabled={mentionPage >= mentionPageCount - 1}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          setMentionPage((currentPage) =>
                            Math.min(currentPage + 1, mentionPageCount - 1),
                          );
                          setMentionSelectedIndex(0);
                        }}
                      >
                        <ChevronRight />
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="mt-1 rounded-[6px] text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label={isInputExpanded ? "收起输入框" : "展开输入框"}
            onClick={() => setIsInputExpanded((currentValue) => !currentValue)}
            disabled={isBusy}
          >
            {isInputExpanded ? <Minimize2 /> : <Maximize2 />}
          </Button>
        </div>

        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {showContextControls && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-[6px] border-slate-200 px-3 text-xs font-medium tracking-normal normal-case"
                      aria-pressed={ragEnabled}
                      onClick={handleRagToggle}
                      disabled={isControlBusy}
                    >
                      <span
                        className={cn(
                          "size-2 rounded-full",
                          ragEnabled ? "bg-emerald-500" : "bg-slate-300",
                        )}
                      />
                      {ragEnabled ? "RAG 已启用" : "RAG 已关闭"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={6}>
                    开启时会检索知识库片段并展示引用；关闭时只按当前会话和模型回答，不生成引用来源。
                  </TooltipContent>
                </Tooltip>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 max-w-full min-w-0 rounded-[6px] border-slate-200 px-3 text-xs font-medium tracking-normal normal-case sm:max-w-[15rem]"
                      disabled={
                        isControlBusy ||
                        isLoadingModels ||
                        availableModels.length === 0
                      }
                      title={selectedModel?.label || "未选择模型"}
                    >
                      {isLoadingModels ? (
                        <Loader2
                          data-icon="inline-start"
                          className="animate-spin"
                        />
                      ) : (
                        <Bot data-icon="inline-start" />
                      )}
                      <span className="min-w-0 truncate">
                        {selectedModel?.label || "使用默认模型"}
                      </span>
                      <ChevronDown data-icon="inline-end" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-48 rounded-[8px]"
                  >
                    <DropdownMenuGroup>
                      {availableModels.map((model) => (
                        <DropdownMenuItem
                          key={model.id}
                          title={model.label}
                          onSelect={() => {
                            setModelId(model.id);
                            onModelChange?.(model.id);
                          }}
                        >
                          <Check
                            className={cn(
                              "opacity-0",
                              model.id === selectedModel?.id && "opacity-100",
                            )}
                          />
                          <span className="min-w-0 truncate">
                            {model.label}
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2">
            <span className="text-xs text-slate-500">
              {chatInput.length}/{MAX_CHAT_MESSAGE_LENGTH}
            </span>
            <Button
              type="button"
              size="sm"
              className="h-8 rounded-[6px] bg-blue-600 px-3 text-xs font-medium tracking-normal text-white normal-case hover:bg-blue-700"
              aria-label={isSubmitting ? "打断" : "发送"}
              disabled={!isSubmitting && (!hasMessageContent || disabled)}
              onClick={() => {
                if (isSubmitting) {
                  void onCancel?.();
                  return;
                }

                void handleSendMessage();
              }}
            >
              {isSubmitting ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : null}
              {submitLabel}
              {!isSubmitting && <Send data-icon="inline-end" />}
            </Button>
          </div>
        </div>
      </div>
      {helperText && (
        <div className="mx-auto mt-2 max-w-[800px] px-1 text-xs text-slate-500">
          {helperText}
        </div>
      )}

      {showAttachmentButton && (
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
      )}
    </TooltipProvider>
  );
}
