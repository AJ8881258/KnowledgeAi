import { Check, ChevronDown, Eye, RefreshCw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { FileBadge, IconButton, StatusText } from "./document-common";
import { pageSizeOptions, typeMeta } from "./document-data";
import type { DocumentItem, PageSize } from "./document-types";
import { formatDateTime, formatFileSize } from "./document-utils";

type DocumentTableProps = {
  documents: DocumentItem[];
  selectedDocumentId?: number | null;
  knowledgeBaseLabel: string;
  totalItems: number;
  displayStart: number;
  displayEnd: number;
  currentPage: number;
  totalPages: number;
  paginationItems: Array<number | "ellipsis">;
  pageSize: PageSize;
  isDeleting: boolean;
  onSelectDocument: (doc: DocumentItem) => void;
  onDeleteDocument: (doc: DocumentItem) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (value: PageSize) => void;
};

export function DocumentTable({
  documents,
  selectedDocumentId,
  knowledgeBaseLabel,
  totalItems,
  displayStart,
  displayEnd,
  currentPage,
  totalPages,
  paginationItems,
  pageSize,
  isDeleting,
  onSelectDocument,
  onDeleteDocument,
  onPageChange,
  onPageSizeChange,
}: DocumentTableProps) {
  return (
      <section className="overflow-hidden rounded-[6px] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left text-sm">
            <thead className="bg-white text-slate-600">
              <tr className="border-b border-slate-200">
                <th className="px-4 py-4 font-medium">文件名</th>
                <th className="px-4 py-4 font-medium">类型</th>
                <th className="px-4 py-4 font-medium">知识库</th>
                <th className="px-4 py-4 font-medium">状态</th>
                <th className="px-4 py-4 font-medium">chunks</th>
                <th className="px-4 py-4 font-medium">大小</th>
                <th className="px-4 py-4 font-medium">上传时间</th>
                <th className="px-4 py-4 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {documents.length > 0 ? (
                documents.map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={() => void onSelectDocument(doc)}
                    className={cn(
                      "cursor-pointer border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50",
                      doc.id === selectedDocumentId && "bg-blue-50/40",
                    )}
                  >
                    <td className="px-4 py-5">
                      <div className="flex min-w-0 items-center gap-3">
                        <FileBadge type={doc.type} />
                        <span className="truncate text-slate-700">
                          {doc.originalFilename}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      <span className="rounded-[4px] border border-slate-200 px-2 py-1 text-xs text-slate-600">
                        {typeMeta[doc.type].label}
                      </span>
                    </td>
                    <td className="px-4 py-5 text-slate-600">
                      {knowledgeBaseLabel}
                    </td>
                    <td className="px-4 py-5">
                      <StatusText
                        status={doc.status}
                        error={doc.errorMessage}
                      />
                    </td>
                    <td className="px-4 py-5 text-slate-600">
                      {doc.chunkCount}
                    </td>
                    <td className="px-4 py-5 text-slate-600">
                      {formatFileSize(doc.sizeBytes)}
                    </td>
                    <td className="px-4 py-5 text-slate-600">
                      {formatDateTime(doc.createdAt)}
                    </td>
                    <td className="px-4 py-5">
                      <div
                        className="flex items-center gap-2"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <IconButton
                          label={`查看 ${doc.originalFilename}`}
                          onClick={() => void onSelectDocument(doc)}
                        >
                          <Eye />
                        </IconButton>
                        <IconButton label="重新索引待后端支持" disabled>
                          <RefreshCw />
                        </IconButton>
                        <IconButton
                          label={`删除 ${doc.originalFilename}`}
                          disabled={isDeleting}
                          onClick={() => onDeleteDocument(doc)}
                        >
                          <Trash2 />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-16 text-center text-sm text-slate-500"
                  >
                    当前知识库暂无文档
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-slate-600">
            共 {totalItems} 条，显示 {displayStart}-{displayEnd} 条
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="rounded-[5px] border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                aria-label="上一页"
                disabled={currentPage === 1}
                onClick={() =>
                  onPageChange(Math.max(1, currentPage - 1))
                }
              >
                <ChevronDown className="rotate-90" />
              </Button>
              {paginationItems.map((item, index) =>
                item === "ellipsis" ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="flex size-9 items-center justify-center text-sm text-slate-400"
                  >
                    ...
                  </span>
                ) : (
                  <Button
                    key={item}
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => onPageChange(item)}
                    className={cn(
                      "rounded-[5px] border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
                      item === currentPage &&
                        "border-blue-600 text-blue-600 hover:bg-blue-50",
                    )}
                    aria-current={item === currentPage ? "page" : undefined}
                  >
                    {item}
                  </Button>
                ),
              )}
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="rounded-[5px] border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                aria-label="下一页"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  onPageChange(Math.min(totalPages, currentPage + 1))
                }
              >
                <ChevronDown className="-rotate-90" />
              </Button>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-[5px] border-slate-200 bg-white px-4 text-sm font-normal tracking-normal text-slate-600 normal-case hover:bg-slate-50"
                >
                  {pageSize} 条/页
                  <ChevronDown data-icon="inline-end" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-36">
                <DropdownMenuGroup>
                  {pageSizeOptions.map((option) => (
                    <DropdownMenuItem
                      key={option}
                      onClick={() => onPageSizeChange(option)}
                      className={cn(
                        "justify-between normal-case tracking-normal",
                        option === pageSize && "bg-blue-50 text-blue-600",
                      )}
                    >
                      {option} 条/页
                      <Check
                        className={cn(
                          "text-blue-600",
                          option !== pageSize && "opacity-0",
                        )}
                      />
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </footer>
      </section>
  );
}
