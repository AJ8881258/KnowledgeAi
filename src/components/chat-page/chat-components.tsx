import { Bot, Star, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fileTypeStyles } from "./chat-data";
import type { CitationChip, ConversationItem, ConversationMessage, SourceItem } from "./chat-types";

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

export function ConversationRow({
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

export function SourceCard({ source, rank }: { source: SourceItem; rank: number }) {
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

export function CitationList({ items }: { items: CitationChip[] }) {
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

export function MessageBubble({ message }: { message: ConversationMessage }) {
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

export function EmptyConversation() {
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
