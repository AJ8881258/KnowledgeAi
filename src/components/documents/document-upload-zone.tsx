import type { DragEvent } from "react";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DocumentUploadZoneProps = {
  knowledgeBaseId?: string;
  isUploading: boolean;
  isDragging: boolean;
  canUpload: boolean;
  disabledReason?: string;
  onUploadClick: () => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDragLeave: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
};

export function DocumentUploadZone({
  knowledgeBaseId,
  isUploading,
  isDragging,
  canUpload,
  disabledReason,
  onUploadClick,
  onDragOver,
  onDragLeave,
  onDrop,
}: DocumentUploadZoneProps) {
  return (
    <section
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "flex min-h-[96px] items-center justify-center rounded-[6px] border border-dashed px-5 py-4 transition-colors",
        !knowledgeBaseId || isUploading || !canUpload
          ? "border-slate-200 bg-slate-50"
          : isDragging
            ? "border-blue-400 bg-blue-50"
            : "border-blue-200 bg-white",
      )}
    >
      <div className="flex w-full flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Upload
            className={cn(
              "size-10",
              knowledgeBaseId && canUpload ? "text-slate-600" : "text-slate-300",
            )}
            strokeWidth={1.8}
          />
          <div>
            <div className="text-base font-medium text-slate-900">
              拖拽 TXT、Markdown、PDF、DOCX、HTML 到这里
            </div>
            <div className="mt-1 text-sm text-slate-500">
              {canUpload
                ? "支持 TXT、Markdown、文本型 PDF、DOCX、HTML，单文件最大 10MB"
                : disabledReason || "当前角色只能查看文档，不能上传。"}
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={!knowledgeBaseId || isUploading || !canUpload}
          onClick={onUploadClick}
          title={!canUpload ? disabledReason : undefined}
          className="h-10 rounded-[5px] border-slate-200 bg-white px-6 text-sm font-medium tracking-normal text-slate-700 normal-case hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400"
        >
          {isUploading ? "上传中..." : "选择文件"}
        </Button>
      </div>
    </section>
  );
}
