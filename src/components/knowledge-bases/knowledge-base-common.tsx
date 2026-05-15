import { Check, Loader2, TriangleAlert } from "lucide-react";

import type { DocumentStatus as BackendDocumentStatus } from "@/api/documents";
import { cn } from "@/lib/utils";
import { documentStatusCopy, documentStatusStyles, kbStatusCopy } from "./knowledge-base-data";
import type { KnowledgeBase } from "./knowledge-base-types";

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
