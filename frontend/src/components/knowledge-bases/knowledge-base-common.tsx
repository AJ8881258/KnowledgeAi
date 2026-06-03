import { Check, Eye, Loader2, Pencil, ShieldCheck, TriangleAlert } from "lucide-react";

import type { DocumentStatus as BackendDocumentStatus } from "@/api/documents";
import { cn } from "@/lib/utils";
import { documentStatusCopy, documentStatusStyles, kbStatusCopy } from "./knowledge-base-data";
import { knowledgeBaseRoleCopy } from "./knowledge-base-permissions";
import type { KnowledgeBase } from "./knowledge-base-types";

export function KnowledgeBaseRoleBadge({
  item,
  compact = false,
}: {
  item: KnowledgeBase;
  compact?: boolean;
}) {
  const Icon =
    item.accessRole === "OWNER"
      ? ShieldCheck
      : item.accessRole === "EDITOR"
        ? Pencil
        : Eye;

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium",
        item.accessRole === "OWNER" &&
          "border-blue-200 bg-blue-50 text-blue-700",
        item.accessRole === "EDITOR" &&
          "border-emerald-200 bg-emerald-50 text-emerald-700",
        item.accessRole === "VIEWER" &&
          "border-slate-200 bg-slate-50 text-slate-600",
      )}
    >
      <Icon className="size-3 shrink-0" />
      <span className={cn("truncate", compact && "sr-only")}>
        {knowledgeBaseRoleCopy[item.accessRole]}
      </span>
    </span>
  );
}

export function FileBadge({ type }: { type: string }) {
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

export function DocumentStatus({ status }: { status: BackendDocumentStatus }) {
  if (status === "PROCESSING" || status === "UPLOADED") {
    return (
      <span
        className={cn(
          "flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px]",
          documentStatusStyles[status],
        )}
      >
        {documentStatusCopy[status]}
        <Loader2 className="size-3 animate-spin" />
      </span>
    );
  }

  if (status === "FAILED") {
    return (
      <span
        className={cn(
          "flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px]",
          documentStatusStyles[status],
        )}
      >
        {documentStatusCopy[status]}
        <TriangleAlert className="size-3" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px]",
        documentStatusStyles[status],
      )}
    >
      {documentStatusCopy[status]}
      <Check className="size-3" />
    </span>
  );
}

export function KnowledgeBaseMark({
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

export function StatusPill({ status }: { status: KnowledgeBase["status"] }) {
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
