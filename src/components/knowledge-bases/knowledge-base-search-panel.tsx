import {
  type FormEvent,
  type ReactNode,
  type Ref,
  useEffect,
  useRef,
  useState,
} from "react";
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

function formatScore(score?: number | null) {
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return "-";
  }

  return score.toFixed(2);
}

function getRetrievalModeLabel(mode?: string) {
  const normalizedMode = mode?.trim().toUpperCase();

  if (normalizedMode === "HYBRID") {
    return "混合检索";
  }

  if (normalizedMode === "SEMANTIC") {
    return "语义检索";
  }

  if (normalizedMode === "FULLTEXT") {
    return "全文检索";
  }

  return mode || "检索结果";
}

function getHighlightedContent(content: string, keyword: string): ReactNode {
  const normalizedKeyword = keyword.trim();

  if (!normalizedKeyword) {
    return content;
  }

  const lowerContent = content.toLocaleLowerCase();
  const lowerKeyword = normalizedKeyword.toLocaleLowerCase();
  const highlightedContent: ReactNode[] = [];
  let searchFrom = 0;
  let matchIndex = lowerContent.indexOf(lowerKeyword, searchFrom);

  while (matchIndex >= 0) {
    if (matchIndex > searchFrom) {
      highlightedContent.push(content.slice(searchFrom, matchIndex));
    }

    const matchEnd = matchIndex + normalizedKeyword.length;

    highlightedContent.push(
      <mark
        key={`${matchIndex}-${matchEnd}`}
        className="rounded-[3px] bg-yellow-200 px-0.5 font-semibold text-slate-950"
      >
        {content.slice(matchIndex, matchEnd)}
      </mark>,
    );

    searchFrom = matchEnd;
    matchIndex = lowerContent.indexOf(lowerKeyword, searchFrom);
  }

  if (highlightedContent.length === 0) {
    return content;
  }

  highlightedContent.push(content.slice(searchFrom));

  return highlightedContent;
}

function getSearchErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const status = error.response?.status;

    if (status === 400) {
      return "请输入检索内容，并确认结果数量不少于 1。";
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

function SearchResultCard({
  result,
  query,
  isFocused,
  resultRef,
}: {
  result: SearchResultResponse;
  query: string;
  isFocused: boolean;
  resultRef?: Ref<HTMLElement>;
}) {
  return (
    <article
      ref={resultRef}
      tabIndex={-1}
      className={cn(
        "scroll-mt-4 rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm outline-none transition-colors",
        isFocused && "border-blue-400 bg-blue-50/60 ring-2 ring-blue-100",
      )}
    >
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
        <div className="flex w-fit shrink-0 flex-wrap justify-end gap-1 text-xs">
          <span className="rounded-[5px] border border-blue-200 bg-blue-50 px-2 py-1 font-semibold text-blue-700">
            {getRetrievalModeLabel(result.retrievalMode)}
          </span>
          <span className="rounded-[5px] border border-emerald-200 bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">
            混合分 {formatScore(result.hybridScore ?? result.score)}
          </span>
          <span className="rounded-[5px] border border-slate-200 bg-slate-50 px-2 py-1 text-slate-600">
            全文 {formatScore(result.fulltextScore)}
          </span>
          <span className="rounded-[5px] border border-slate-200 bg-slate-50 px-2 py-1 text-slate-600">
            语义 {formatScore(result.semanticScore)}
          </span>
        </div>
      </header>
      <p className="mt-3 max-h-36 overflow-auto whitespace-pre-wrap break-words rounded-[6px] border border-slate-200 bg-slate-50/70 p-3 text-xs leading-6 text-slate-700">
        {getHighlightedContent(result.content, query)}
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
  const firstResultRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState("5");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [results, setResults] = useState<SearchResultResponse[]>([]);
  const [focusedChunkId, setFocusedChunkId] = useState<number | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const trimmedQuery = query.trim();
  const canSearch = trimmedQuery.length > 0 && !isSearching;

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!trimmedQuery) {
      setErrorMessage("请输入检索内容");
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
      setSearchedQuery(response.query || trimmedQuery);
      setFocusedChunkId(response.results[0]?.chunkId ?? null);
      setHasSearched(true);
    } catch (error) {
      setResults([]);
      setSearchedQuery(trimmedQuery);
      setFocusedChunkId(null);
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
    setSearchedQuery("");
    setResults([]);
    setFocusedChunkId(null);
    setHasSearched(false);
    setErrorMessage("");
  };

  useEffect(() => {
    if (!hasSearched || isSearching || results.length === 0) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      const firstResult = firstResultRef.current;

      if (!firstResult) {
        return;
      }

      const firstHighlight = firstResult.querySelector("mark");
      const scrollTarget = firstHighlight ?? firstResult;

      scrollTarget.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
      firstResult.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [hasSearched, isSearching, results]);

  return (
    <section className="mx-auto flex h-full max-w-[860px] flex-col gap-4">
      <div className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-slate-900">
            文档检索测试区
          </h2>
          <p className="text-xs leading-5 text-slate-500">
            在当前知识库的已索引文档 chunks 中测试检索效果，不调用大模型。
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
              placeholder="输入查询内容测试文档检索"
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
                输入查询内容开始测试
              </h3>
              <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">
                建议先确认当前知识库下已有 INDEXED 文档，再输入要检索的内容。
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
                可以换一个更具体的查询内容，或确认文档已经完成索引。
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
                {isSearching ? "正在刷新结果..." : `查询：${searchedQuery}`}
              </span>
            </div>
            {results.map((result, index) => (
              <SearchResultCard
                key={result.chunkId}
                result={result}
                query={searchedQuery}
                isFocused={result.chunkId === focusedChunkId}
                resultRef={index === 0 ? firstResultRef : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
