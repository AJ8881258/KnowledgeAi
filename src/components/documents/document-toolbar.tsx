import { ChevronDown, FileText, Loader2, Upload } from "lucide-react";

import type { KnowledgeBaseResponse } from "@/api/knowledge-bases";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SegmentedFilter } from "./document-common";
import { statusFilters, typeFilters } from "./document-data";
import type { StatusFilter, TypeTab } from "./document-types";

type DocumentToolbarProps = {
  knowledgeBaseId?: string;
  knowledgeBases: KnowledgeBaseResponse[];
  isLoadingKnowledgeBases: boolean;
  currentKnowledgeBaseLabel: string;
  typeTab: TypeTab;
  statusFilter: StatusFilter;
  isUploading: boolean;
  canUpload: boolean;
  uploadDisabledReason?: string;
  onNavigate: (path: string) => void;
  onTypeTabChange: (value: TypeTab) => void;
  onStatusFilterChange: (value: StatusFilter) => void;
  onUploadClick: () => void;
};

export function DocumentToolbar({
  knowledgeBaseId,
  knowledgeBases,
  isLoadingKnowledgeBases,
  currentKnowledgeBaseLabel,
  typeTab,
  statusFilter,
  isUploading,
  canUpload,
  uploadDisabledReason,
  onNavigate,
  onTypeTabChange,
  onStatusFilterChange,
  onUploadClick,
}: DocumentToolbarProps) {
  return (
    <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-10 min-w-[230px] cursor-pointer items-center justify-between gap-3 rounded-[5px] border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex size-5 items-center justify-center rounded-[3px] border border-blue-200 bg-blue-50 text-blue-600">
                  <FileText className="size-4" />
                </span>
                <span className="truncate">
                  {isLoadingKnowledgeBases
                    ? "正在加载知识库..."
                    : currentKnowledgeBaseLabel || "知识库"}
                </span>
              </span>
              <ChevronDown className="size-4 shrink-0 text-slate-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[230px]">
            {knowledgeBases.map((kb) => (
              <DropdownMenuItem
                key={kb.id}
                onClick={() => onNavigate("/Documents/" + kb.id)}
              >
                <FileText className="size-4 text-slate-500" />
                {kb.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Tabs
          value={typeTab}
          onValueChange={(value) => onTypeTabChange(value as TypeTab)}
        >
          <TabsList variant="line">
            {typeFilters.map((filter) => (
              <TabsTrigger
                key={filter}
                value={filter}
                className="px-4 text-xs font-medium tracking-normal normal-case text-slate-600 data-active:text-blue-600 data-active:after:bg-blue-600"
              >
                {filter}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <SegmentedFilter
          items={statusFilters}
          activeValue={statusFilter}
          onSelect={onStatusFilterChange}
        />
      </div>

      <Button
        type="button"
        disabled={!knowledgeBaseId || isUploading || !canUpload}
        onClick={onUploadClick}
        title={!canUpload ? uploadDisabledReason : undefined}
        className="h-10 w-full rounded-[5px] bg-blue-600 px-5 text-sm font-medium tracking-normal text-white normal-case hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-500 sm:w-fit"
      >
        {isUploading ? (
          <Loader2 data-icon="inline-start" className="animate-spin" />
        ) : (
          <Upload data-icon="inline-start" />
        )}
        上传文档
      </Button>
    </div>
  );
}
