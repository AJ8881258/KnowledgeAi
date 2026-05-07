import {
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import {
  Bot,
  Check,
  ChevronDown,
  FileText,
  Maximize2,
  Minimize2,
  Paperclip,
  Send,
  Square,
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
};

type ChatModel = {
  id: string;
  label: string;
};

type ChatComposerProps = {
  placeholder: string;
  onSubmit: (payload: ChatComposerPayload) => void;
  className?: string;
};

const MAX_CHAT_MESSAGE_LENGTH = 4000;
const ALLOWED_ATTACHMENT_EXTENSIONS = [".pdf", ".md", ".markdown", ".txt"];

const chatModels: ChatModel[] = [
  { id: "gpt-4o-mini", label: "gpt-4o-mini" },
  { id: "gpt-4o", label: "gpt-4o" },
  { id: "deepseek-chat", label: "deepseek-chat" },
  { id: "qwen-plus", label: "qwen-plus" },
];

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

export function ChatComposer({
  placeholder,
  onSubmit,
  className,
}: ChatComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chatInput, setChatInput] = useState("");
  const [ragEnabled, setRagEnabled] = useState(true);
  const [modelId, setModelId] = useState(chatModels[0].id);
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [attachmentSheetOpen, setAttachmentSheetOpen] = useState(false);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState("");
  const hasMessageContent =
    chatInput.trim().length > 0 || attachments.length > 0;
  const selectedModel =
    chatModels.find((model) => model.id === modelId) ?? chatModels[0];
  const chatLineCount = Math.max(
    2,
    chatInput.split("\n").length + Math.floor(chatInput.length / 72),
  );
  const chatInputHeight = isInputExpanded
    ? "30vh"
    : `min(30vh, ${Math.min(168, chatLineCount * 24 + 24)}px)`;

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

  const handleSendMessage = () => {
    if (!hasMessageContent || isGenerating) {
      return;
    }

    onSubmit({
      message: chatInput.trim(),
      attachments,
      modelId,
      ragEnabled,
    });

    setChatInput("");
    setAttachments([]);
    setIsInputExpanded(false);
    setIsGenerating(true);
  };

  const handleStopGenerating = () => {
    setIsGenerating(false);
    toast.success("已停止生成");
  };

  const handleChatKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      <div
        className={cn(
          "mx-auto max-w-[800px] rounded-[8px] border border-slate-200 bg-white p-3 shadow-sm",
          className,
        )}
      >
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
            placeholder={placeholder}
            aria-label="输入问题"
            disabled={isGenerating}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="mt-1 rounded-[6px] text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label={isInputExpanded ? "收起输入框" : "展开输入框"}
            onClick={() => setIsInputExpanded((currentValue) => !currentValue)}
          >
            {isInputExpanded ? <Minimize2 /> : <Maximize2 />}
          </Button>
        </div>

        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-[6px] border-slate-200 px-3 text-xs font-medium tracking-normal normal-case"
                >
                  <Bot data-icon="inline-start" />
                  {selectedModel.label}
                  <ChevronDown data-icon="inline-end" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 rounded-[8px]">
                <DropdownMenuGroup>
                  {chatModels.map((model) => (
                    <DropdownMenuItem
                      key={model.id}
                      onSelect={() => setModelId(model.id)}
                    >
                      <Check
                        className={cn(
                          "opacity-0",
                          model.id === modelId && "opacity-100",
                        )}
                      />
                      {model.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2">
            <span className="text-xs text-slate-500">
              {chatInput.length}/{MAX_CHAT_MESSAGE_LENGTH}
            </span>
            {isGenerating && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-[6px] border-red-100 bg-red-50 px-3 text-xs font-medium tracking-normal text-red-600 normal-case hover:bg-red-100"
                onClick={handleStopGenerating}
              >
                <Square data-icon="inline-start" className="fill-current" />
                停止生成
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              className="h-8 rounded-[6px] bg-blue-600 px-3 text-xs font-medium tracking-normal text-white normal-case hover:bg-blue-700"
              aria-label="发送"
              disabled={!hasMessageContent || isGenerating}
              onClick={handleSendMessage}
            >
              发送
              <Send data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-2 max-w-[800px] px-1 text-xs text-slate-500">
        Shift + Enter 换行，Enter 发送
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
    </>
  );
}
