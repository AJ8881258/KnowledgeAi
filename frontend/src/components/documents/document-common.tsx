import type { ReactNode } from "react";
import {
  ArrowRight,
  FileText,
  Loader2,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";

import type {
  DocumentProcessingJobResponse,
  DocumentStatus,
} from "@/api/documents";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { statusMeta, typeMeta } from "./document-data";
import type { DocumentType, StatusFilter } from "./document-types";

export function FileBadge({ type }: { type: DocumentType }) {
  const meta = typeMeta[type];

  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-[3px] text-[8px] font-bold leading-none",
        meta.className,
      )}
      aria-label={meta.label}
    >
      {meta.shortLabel}
    </span>
  );
}

export function SegmentedFilter({
  items,
  activeValue,
  onSelect,
}: {
  items: { value: StatusFilter; label: string }[];
  activeValue: StatusFilter;
  onSelect?: (value: StatusFilter) => void;
}) {
  return (
    <div className="flex h-10 overflow-hidden rounded-[5px] border border-slate-200 bg-white">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onSelect?.(item.value)}
          className={cn(
            "cursor-pointer border-r border-slate-200 px-4 text-sm text-slate-600 transition-colors last:border-r-0 hover:bg-slate-50",
            item.value === activeValue && "bg-blue-50 text-blue-600",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function StatusText({
  status,
  error,
  processingJob,
}: {
  status: DocumentStatus;
  error?: string | null;
  processingJob?: DocumentProcessingJobResponse;
}) {
  const meta = statusMeta[status];
  const hasActiveJob =
    processingJob?.status === "QUEUED" || processingJob?.status === "RUNNING";
  const progressPercent =
    typeof processingJob?.progressPercent === "number"
      ? Math.max(0, Math.min(100, processingJob.progressPercent))
      : 0;

  return (
    <div className="flex min-w-[120px] flex-col gap-1">
      <div className={cn("flex items-center gap-2 text-sm", meta.textClass)}>
        <span className={cn("size-2 rounded-full", meta.dotClass)} />
        <span>{hasActiveJob ? "后台处理中" : meta.label}</span>
        {(status === "PROCESSING" || hasActiveJob) && (
          <Loader2 className="size-3 animate-spin" />
        )}
      </div>
      {hasActiveJob && (
        <div className="w-[132px]">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-500 transition-[width]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-1 truncate text-xs text-slate-500">
            {progressPercent}%
            {processingJob.stage ? ` · ${processingJob.stage}` : ""}
          </div>
        </div>
      )}
      {status === "FAILED" && error && (
        <span className="w-fit max-w-[220px] truncate rounded-[5px] border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600">
          {error}
        </span>
      )}
    </div>
  );
}

export function IconButton({
  children,
  disabled,
  label,
  title,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  title?: string;
  onClick?: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-xs"
      aria-label={label}
      disabled={disabled}
      title={title}
      onClick={onClick}
      className="rounded-[5px] border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-300"
    >
      {children}
    </Button>
  );
}

export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="min-w-0 text-slate-600">{value}</span>
    </div>
  );
}

export function LoadingPanel({ message }: { message: string }) {
  return (
    <div className="flex min-h-[320px] items-center justify-center rounded-[6px] border border-slate-200 bg-white">
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <Loader2 className="size-4 animate-spin text-blue-600" />
        {message}
      </div>
    </div>
  );
}

export function EmptyPanel({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[6px] border border-dashed border-slate-300 bg-white px-6 text-center">
      <FileText className="size-9 text-slate-400" />
      <h2 className="mt-4 text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button
          type="button"
          onClick={onAction}
          className="mt-5 h-10 rounded-[6px] bg-blue-600 px-4 text-sm tracking-normal text-white normal-case hover:bg-blue-700"
        >
          {actionLabel}
          <ArrowRight data-icon="inline-end" />
        </Button>
      )}
    </div>
  );
}

export function ErrorPanel({
  title,
  description,
  onRetry,
}: {
  title: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[6px] border border-orange-200 bg-orange-50/40 px-6 text-center">
      <TriangleAlert className="size-9 text-orange-500" />
      <h2 className="mt-4 text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
        {description}
      </p>
      {onRetry && (
        <Button
          type="button"
          variant="outline"
          onClick={onRetry}
          className="mt-5 h-10 rounded-[6px] border-orange-200 bg-white px-4 text-sm tracking-normal text-slate-700 normal-case hover:bg-orange-50"
        >
          <RefreshCw data-icon="inline-start" />
          重新加载
        </Button>
      )}
    </div>
  );
}
