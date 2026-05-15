import { Eye, FileText, Loader2, MessageCircle, RefreshCw, X } from "lucide-react";

import type { DocumentChunkResponse } from "@/api/documents";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { statusMeta, typeMeta } from "./document-data";
import { DetailRow, FileBadge } from "./document-common";
import type { DocumentItem } from "./document-types";
import { formatDateTime, formatFileSize } from "./document-utils";

export function DocumentDetails({
  item,
  chunks,
  isLoadingChunks,
  chunkError,
  onLoadChunks,
  onNavigateChat,
  onClose,
}: {
  item: DocumentItem;
  chunks: DocumentChunkResponse[];
  isLoadingChunks: boolean;
  chunkError: string;
  onLoadChunks: () => void;
  onNavigateChat?: () => void;
  onClose?: () => void;
}) {
  const meta = statusMeta[item.status];

  return (
    <aside className="min-h-0 border-t border-slate-200 bg-white xl:border-t-0 xl:border-l">
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between px-5">
          <h2 className="text-lg font-semibold text-slate-900">文档详情</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="关闭详情"
            onClick={onClose}
            className="rounded-[5px] text-slate-500 hover:bg-slate-100"
          >
            <X />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-auto px-5 pb-6">
          <section className="flex flex-col gap-4 border-b border-slate-200 pb-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <FileBadge type={item.type} />
                <span className="truncate text-base font-medium text-slate-900">
                  {item.originalFilename}
                </span>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-[5px] border px-2 py-1 text-xs",
                  meta.badgeClass,
                )}
              >
                {meta.label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                disabled
                className="h-10 rounded-[5px] border-slate-200 bg-white px-4 text-sm font-medium tracking-normal text-slate-500 normal-case"
              >
                <RefreshCw data-icon="inline-start" />
                重新索引待后端支持
              </Button>
              <Button
                type="button"
                onClick={onNavigateChat}
                className="h-10 rounded-[5px] bg-blue-600 px-4 text-sm font-medium tracking-normal text-white normal-case hover:bg-blue-700"
              >
                <MessageCircle data-icon="inline-start" />
                进入问答
              </Button>
            </div>

            <div className="flex flex-col gap-3">
              <DetailRow label="类型" value={typeMeta[item.type].label} />
              <DetailRow label="大小" value={formatFileSize(item.sizeBytes)} />
              <DetailRow label="Content-Type" value={item.contentType || "-"} />
              <DetailRow
                label="状态"
                value={
                  <span
                    className={cn("inline-flex items-center gap-2", meta.textClass)}
                  >
                    <span className={cn("size-2 rounded-full", meta.dotClass)} />
                    {meta.label}
                  </span>
                }
              />
              <DetailRow label="Chunks 数量" value={item.chunkCount} />
              <DetailRow label="上传时间" value={formatDateTime(item.createdAt)} />
              <DetailRow label="更新时间" value={formatDateTime(item.updatedAt)} />
              {item.errorMessage && (
                <DetailRow
                  label="失败原因"
                  value={
                    <span className="text-red-600">{item.errorMessage}</span>
                  }
                />
              )}
            </div>
          </section>

          <section className="border-b border-slate-200 py-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900">
                Chunks 预览
              </h3>
              <span className="text-sm text-slate-500">
                共 {item.chunkCount} 个
              </span>
            </div>

            {chunks.length > 0 ? (
              <div className="flex flex-col gap-3">
                {chunks.slice(0, 5).map((chunk) => (
                  <article
                    key={chunk.chunkIndex}
                    className="rounded-[6px] border border-slate-200 bg-slate-50/60 p-3"
                  >
                    <div className="mb-2 flex items-center gap-2 text-sm">
                      <span className="font-semibold text-blue-600">
                        #{chunk.chunkIndex}
                      </span>
                      <span className="text-slate-600">
                        {chunk.charCount} 字符
                      </span>
                    </div>
                    <p className="line-clamp-4 text-xs leading-5 text-slate-600">
                      {chunk.content}
                    </p>
                    <div className="mt-2 text-xs text-slate-400">
                      {formatDateTime(chunk.createdAt)}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-[6px] border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                {item.chunkCount > 0
                  ? "点击下方按钮查看切片内容。"
                  : "当前文档暂无 chunks。"}
              </div>
            )}

            {chunkError && (
              <p className="mt-3 text-xs leading-5 text-red-600">{chunkError}</p>
            )}
            <Button
              type="button"
              variant="ghost"
              disabled={isLoadingChunks || item.chunkCount === 0}
              onClick={onLoadChunks}
              className="mt-3 h-8 rounded-[5px] px-0 text-sm font-medium tracking-normal text-blue-600 normal-case hover:bg-transparent hover:text-blue-700 disabled:text-slate-400"
            >
              {isLoadingChunks ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <Eye data-icon="inline-start" />
              )}
              查看 chunks
            </Button>
          </section>
        </div>
      </div>
    </aside>
  );
}

export function EmptyDocumentDetails() {
  return (
    <aside className="min-h-0 border-t border-slate-200 bg-white xl:border-t-0 xl:border-l">
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 px-6 text-center">
        <FileText className="size-8 text-slate-400" />
        <div>
          <h2 className="text-base font-semibold text-slate-900">暂无文档详情</h2>
          <p className="mt-1 text-sm text-slate-500">
            选择左侧文档后查看状态、大小、上传时间和 chunks 信息。
          </p>
        </div>
      </div>
    </aside>
  );
}
