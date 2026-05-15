import { type FormEvent, useState } from "react";
import { isAxiosError } from "axios";
import { Loader2, RotateCcw, Search, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import {
  searchKnowledgeBaseDocuments,
  type SearchResultResponse,
} from "@/api/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const SEARCH_LIMIT_OPTIONS = [1, 3, 5, 10, 20];

function formatScore(score: number) {
  if (!Number.isFinite(score)) {
    return "-";
  }

  return score.toFixed(2);
}

function getSearchErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const status = error.response?.status;

    if (status === 400) {
      return "请输入检索关键词，并确认结果数量不少于 1。";
    }

    if (status === 404) {
      return "知识库不存在或无权访问";
    }

    if (!error.response) {
      return "无法连接检索服务，请确认后端已启动";
    }

    if (status && status >= 500) {
      return "检索服务异常，请稍后重试";
    }
  }

  return "检索失败，请稍后重试";
}

function SearchResultCard({ result }: { result: SearchResultResponse }) {
  return (
    <article className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">
            {result.documentName}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>文档 ID {result.documentId}</span>
            <span className="text-slate-300">/</span>
            <span>Chunk #{result.chunkIndex}</span>
            <span className="text-slate-300">/</span>
            <span>Chunk ID {result.chunkId}</span>
          </div>
        </div>
        <span className="w-fit shrink-0 rounded-[5px] border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
          score {formatScore(result.score)}
        </span>
      </header>
      <p className="mt-3 max-h-36 overflow-auto whitespace-pre-wrap break-words rounded-[6px] border border-slate-200 bg-slate-50/70 p-3 text-xs leading-6 text-slate-700">
        {result.content}
      </p>
    </article>
  );
}

export function KnowledgeBaseSearchPanel({
  knowledgeBaseId,
  onUnauthorized,
}: {
  knowledgeBaseId: number | string;
  onUnauthorized: () => void;
}) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState("5");
  const [results, setResults] = useState<SearchResultResponse[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const trimmedQuery = query.trim();
  const canSearch = trimmedQuery.length > 0 && !isSearching;

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!trimmedQuery) {
      setErrorMessage("请输入检索关键词");
      return;
    }

    setIsSearching(true);
    setErrorMessage("");

    try {
      const response = await searchKnowledgeBaseDocuments(knowledgeBaseId, {
        query: trimmedQuery,
        limit: Number(limit),
      });

      setResults(response.results);
      setHasSearched(true);
    } catch (error) {
      setResults([]);
      setHasSearched(true);

      if (isAxiosError(error) && error.response?.status === 401) {
        toast.error("登录状态已失效，请重新登录");
        onUnauthorized();
        setErrorMessage("登录状态已失效，请重新登录");
        return;
      }

      const message = getSearchErrorMessage(error);
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setLimit("5");
    setResults([]);
    setHasSearched(false);
    setErrorMessage("");
  };

  return (
    <section className="mx-auto flex h-full max-w-[860px] flex-col gap-4">
      <div className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-slate-900">
            文档检索测试区
          </h2>
          <p className="text-xs leading-5 text-slate-500">
            在当前知识库的已索引文档 chunks 中测试关键词检索，不调用大模型。
          </p>
        </div>

        <form
          className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_112px_auto_auto]"
          onSubmit={handleSearch}
        >
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="输入关键词测试文档检索"
              className="h-10 rounded-[6px] border border-slate-200 bg-white pl-9 pr-3 text-sm focus-visible:border-blue-400"
            />
          </div>

          <Select value={limit} onValueChange={setLimit}>
            <SelectTrigger className="h-10 w-full rounded-[6px] border border-slate-200 bg-white px-3 text-sm normal-case tracking-normal text-slate-700 focus-visible:border-blue-400">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectGroup>
                {SEARCH_LIMIT_OPTIONS.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option} 条
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Button
            type="submit"
            disabled={!canSearch}
            className="h-10 rounded-[6px] bg-blue-600 px-4 text-sm tracking-normal text-white normal-case hover:bg-blue-700"
          >
            {isSearching ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Search data-icon="inline-start" />
            )}
            搜索
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={isSearching && !hasSearched}
            onClick={clearSearch}
            className="h-10 rounded-[6px] border-slate-200 px-4 text-sm tracking-normal text-slate-600 normal-case"
          >
            <RotateCcw data-icon="inline-start" />
            清空
          </Button>
        </form>

        {errorMessage && (
          <div className="mt-3 flex items-start gap-2 rounded-[6px] border border-orange-200 bg-orange-50 px-3 py-2 text-xs leading-5 text-orange-700">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-[8px] border border-slate-200 bg-slate-50/60 p-4">
        {!hasSearched ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 text-center">
            <Search className="size-8 text-slate-300" />
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                输入关键词开始测试
              </h3>
              <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">
                建议先确认当前知识库下已有 INDEXED 文档，再输入文档中出现过的关键词。
              </p>
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 text-center">
            <Search className="size-8 text-slate-300" />
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                没有找到匹配片段
              </h3>
              <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">
                可以换一个更具体的关键词，或确认文档已经完成索引。
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>
                共找到{" "}
                <strong className="font-semibold text-slate-800">
                  {results.length}
                </strong>{" "}
                个片段
              </span>
              <span className={cn(isSearching && "text-blue-600")}>
                {isSearching ? "正在刷新结果..." : `关键词：${trimmedQuery}`}
              </span>
            </div>
            {results.map((result) => (
              <SearchResultCard key={result.chunkId} result={result} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
