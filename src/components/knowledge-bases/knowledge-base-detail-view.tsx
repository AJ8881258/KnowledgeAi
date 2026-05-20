import { useCallback, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { useLocation, useNavigate } from "react-router";
import { ArrowLeft, ArrowRight, ChevronDown, FileText, Loader2, RefreshCw, Search, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { getKnowledgeBaseDocuments } from "@/api/documents";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { clearMockAuthSession } from "@/lib/mock-auth";
import { cn } from "@/lib/utils";
import { DocumentStatus, FileBadge, KnowledgeBaseMark } from "./knowledge-base-common";
import { KnowledgeBaseSearchPanel } from "./knowledge-base-search-panel";
import type { DetailDocument, DetailDocumentTab, KnowledgeBase } from "./knowledge-base-types";
import { formatCompactDateTime, formatFileSize, getDocumentCountByTab, getFilteredDocuments, mapDetailDocument } from "./knowledge-base-utils";

function KnowledgeBaseSwitcher({
  current,
  items,
}: {
  current: KnowledgeBase;
  items: KnowledgeBase[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const availableItems = items.slice(0, 8);

  return (
    <div className="relative z-20 min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="flex h-10 w-full min-w-0 items-center gap-3 rounded-[6px] border border-slate-200 bg-white px-3 text-left text-sm transition-colors hover:bg-slate-50"
      >
        <KnowledgeBaseMark item={current} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-slate-900">
            {current.name}
          </span>
          <span className="block truncate text-xs text-slate-500">
            切换知识库
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-slate-500 transition-transform duration-300",
            isOpen && "rotate-180",
          )}
        />
      </button>
      <div
        className={cn(
          "absolute left-0 right-0 top-12 grid overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-lg transition-all duration-300 ease-out",
          isOpen
            ? "grid-rows-[1fr] opacity-100 translate-y-0"
            : "pointer-events-none grid-rows-[0fr] -translate-y-1 opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-1 p-2">
            {availableItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  navigate(`/KnowledgeBases/${item.id}`);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex min-w-0 items-center gap-3 rounded-[6px] px-2 py-2 text-left text-sm transition-colors hover:bg-slate-50",
                  item.slug === current.slug &&
                    "bg-blue-50 text-blue-700 hover:bg-blue-50",
                )}
              >
                <KnowledgeBaseMark item={item} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {item.name}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {item.description || "暂无描述"}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function KnowledgeBaseDetailView({
  current,
  items,
}: {
  current: KnowledgeBase;
  items: KnowledgeBase[];
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [documentTab, setDocumentTab] = useState<DetailDocumentTab>("all");
  const [documents, setDocuments] = useState<DetailDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [documentLoadError, setDocumentLoadError] = useState("");
  const filteredDocuments = getFilteredDocuments(documents, documentTab);

  const redirectToLogin = useCallback(() => {
    clearMockAuthSession();
    navigate("/login", {
      replace: true,
      state: { from: location.pathname },
    });
  }, [location.pathname, navigate]);

  const loadDocuments = useCallback(async () => {
    setIsLoadingDocuments(true);
    setDocumentLoadError("");

    try {
      const response = await getKnowledgeBaseDocuments(current.id);
      setDocuments(response.map(mapDetailDocument));
    } catch (error) {
      setDocuments([]);

      if (isAxiosError(error) && error.response?.status === 401) {
        toast.error("登录状态已失效，请重新登录");
        redirectToLogin();
        setDocumentLoadError("登录状态已失效，请重新登录");
      } else if (isAxiosError(error) && error.response?.status === 404) {
        setDocumentLoadError("知识库不存在，或你没有访问权限");
      } else if (
        isAxiosError(error) &&
        (!error.response || error.response.status >= 500)
      ) {
        setDocumentLoadError("文档服务异常，请确认后端已启动");
      } else {
        setDocumentLoadError("文档加载失败，请稍后重试");
      }
    } finally {
      setIsLoadingDocuments(false);
    }
  }, [current.id, redirectToLogin]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDocuments();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadDocuments]);

  const currentWithDocumentStats: KnowledgeBase = {
    ...current,
    docs: documents.length,
    chunks: documents.reduce((total, document) => total + document.chunkCount, 0),
  };

  const indexedDocuments = documents.filter((document) => document.status === "INDEXED");

  return (
    <section className="min-h-[calc(100svh-5rem)] bg-white text-slate-900 xl:h-[calc(100svh-5rem)] xl:min-h-[720px] xl:overflow-hidden">
      <div className="grid min-h-0 grid-cols-1 border border-slate-200 bg-white shadow-sm xl:h-full xl:overflow-hidden xl:grid-cols-[280px_minmax(520px,1fr)_360px]">
        <aside className="flex min-h-0 flex-col border-b border-slate-200 bg-white xl:border-r xl:border-b-0">
          <div className="shrink-0 border-b border-slate-200 px-3 py-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-[6px] text-slate-600 hover:bg-slate-100"
                aria-label="返回知识库列表"
                onClick={() => navigate("/KnowledgeBases")}
              >
                <ArrowLeft className="size-4" />
              </Button>
              <KnowledgeBaseSwitcher current={currentWithDocumentStats} items={items} />
            </div>
          </div>

          <section className="flex min-h-0 flex-1 flex-col px-4 py-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">文档处理状态</h3>
              <Button
                variant="ghost"
                size="icon-xs"
                className="rounded-[6px] text-slate-500"
                aria-label="刷新"
                disabled={isLoadingDocuments}
                onClick={() => void loadDocuments()}
              >
                <RefreshCw
                  className={cn(
                    "size-4",
                    isLoadingDocuments && "animate-spin",
                  )}
                />
              </Button>
            </div>
            <Tabs
              value={documentTab}
              onValueChange={(value) =>
                setDocumentTab(value as DetailDocumentTab)
              }
              className="min-h-0 flex-1 gap-3"
            >
              <TabsList className="h-9 w-full justify-start rounded-[6px] bg-slate-100 p-1">
                {[
                  { value: "all", label: "全部" },
                  { value: "processing", label: "处理中" },
                  { value: "failed", label: "失败" },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="h-7 flex-none rounded-[5px] px-3 text-xs tracking-normal text-slate-500 normal-case hover:bg-white hover:text-slate-950 data-active:bg-white data-active:text-slate-950"
                  >
                    {tab.label}
                    <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-700">
                      {getDocumentCountByTab(
                        documents,
                        tab.value as DetailDocumentTab,
                      )}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent
                value={documentTab}
                className="flex min-h-0 flex-1 flex-col overflow-hidden"
              >
                <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
                  {isLoadingDocuments ? (
                    <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 rounded-[6px] border border-dashed border-slate-200 text-center">
                      <Loader2 className="size-5 animate-spin text-blue-600" />
                      <p className="text-xs text-slate-500">正在加载文档...</p>
                    </div>
                  ) : documentLoadError ? (
                    <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 rounded-[6px] border border-dashed border-orange-200 bg-orange-50/40 px-3 text-center">
                      <TriangleAlert className="size-5 text-orange-500" />
                      <p className="text-xs leading-5 text-slate-600">
                        {documentLoadError}
                      </p>
                    </div>
                  ) : filteredDocuments.length > 0 ? (
                    filteredDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex min-w-0 gap-3 border-b border-slate-100 py-3"
                      >
                        <FileBadge type={doc.type} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-medium text-slate-800">
                            {doc.originalFilename}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {formatFileSize(doc.sizeBytes)} ·{" "}
                            {doc.chunkCount} chunks
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            上传于 {formatCompactDateTime(doc.createdAt)}
                          </div>
                          {doc.errorMessage && (
                            <div className="mt-1 truncate text-xs text-orange-600">
                              {doc.errorMessage}
                            </div>
                          )}
                        </div>
                        <DocumentStatus status={doc.status} />
                      </div>
                    ))
                  ) : (
                    <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 rounded-[6px] border border-dashed border-slate-200 text-center">
                      <FileText className="size-6 text-slate-400" />
                      <p className="text-xs text-slate-500">
                        {documentTab === "all"
                          ? "暂无文档"
                          : documentTab === "processing"
                            ? "暂无处理中 文档"
                            : "暂无失败 文档"}
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
            <Button
              variant="outline"
              className="mt-4 h-10 rounded-[6px] border-slate-200 text-xs font-medium tracking-normal text-slate-600 normal-case"
              onClick={() => navigate(`/Documents/${current.slug}`)}
            >
              {documents.length > 0 ? "查看全部文档" : "上传文档"}
              <ArrowRight data-icon="inline-end" />
            </Button>
          </section>
        </aside>

        <main className="flex min-h-0 flex-col bg-white">
          <header className="shrink-0 border-b border-slate-100 px-5 py-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-semibold text-slate-900">
                文档检索测试
              </h2>
              <p className="text-xs leading-5 text-slate-500">
                在当前知识库已索引文档中验证关键词检索结果。正式问答入口请使用 Chat 页面。
              </p>
            </div>
          </header>
          <div className="min-h-0 flex-1 overflow-auto bg-white px-5 py-5">
            <KnowledgeBaseSearchPanel
              knowledgeBaseId={current.id}
              onUnauthorized={redirectToLogin}
            />
          </div>
        </main>

        <aside className="flex min-h-0 flex-col border-t border-slate-200 bg-white xl:border-t-0 xl:border-l">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-100 px-6">
            <Search className="size-4 text-slate-400" />
            <h2 className="text-base font-semibold">检索范围</h2>
          </header>
          <div className="min-h-0 flex-1 overflow-auto px-5 pb-5">
            <section className="border-b border-slate-100 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="text-xs text-slate-500">已索引文档</div>
                  <div className="mt-1 text-xl font-semibold text-slate-900">
                    {indexedDocuments.length}
                  </div>
                </div>
                <div className="rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="text-xs text-slate-500">可检索 chunks</div>
                  <div className="mt-1 text-xl font-semibold text-slate-900">
                    {indexedDocuments.reduce(
                      (total, document) => total + document.chunkCount,
                      0,
                    )}
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                当前只检索状态为 INDEXED 的文档片段。第一版是普通关键词检索，不代表语义相似度。
              </p>
            </section>

            <section className="py-4">
              <h3 className="text-sm font-semibold text-slate-900">
                已索引文档
              </h3>
              <div className="mt-3 flex flex-col gap-3">
                {indexedDocuments.length > 0 ? (
                  indexedDocuments.slice(0, 6).map((document) => (
                    <article
                      key={document.id}
                      className="flex min-w-0 gap-3 rounded-[8px] border border-slate-200 bg-white p-3"
                    >
                      <FileBadge type={document.type} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium text-slate-800">
                          {document.originalFilename}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {document.chunkCount} chunks ·{" "}
                          {formatFileSize(document.sizeBytes)}
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-[8px] border border-dashed border-slate-200 px-3 py-6 text-center">
                    <FileText className="mx-auto size-6 text-slate-300" />
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      暂无可检索的 INDEXED 文档。请先上传并等待文档完成索引。
                    </p>
                  </div>
                )}
              </div>
            </section>

            <Button
              variant="outline"
              className="h-10 w-full rounded-[6px] border-slate-200 text-xs font-medium tracking-normal text-slate-600 normal-case"
              onClick={() => navigate(`/Documents/${current.slug}`)}
            >
              管理知识库文档
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </aside>
      </div>
    </section>
  );
}
