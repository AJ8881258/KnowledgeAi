import { useCallback, useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { useLocation, useNavigate } from "react-router";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Database,
  FileText,
  MessageCircle,
  RefreshCw,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import {
  getKnowledgeBaseChatSessions,
  type ChatSessionResponse,
} from "@/api/chat";
import {
  getKnowledgeBaseDocuments,
  type DocumentResponse,
} from "@/api/documents";
import {
  getKnowledgeBases,
  type KnowledgeBaseResponse,
} from "@/api/knowledge-bases";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { clearMockAuthSession } from "@/lib/mock-auth";
import { cn } from "@/lib/utils";
import { useKnowledgeBaseUsageStore } from "@/store/knowledge-base-usage";

type DashboardDocument = DocumentResponse & {
  knowledgeBaseName: string;
};

type DashboardData = {
  knowledgeBases: KnowledgeBaseResponse[];
  documents: DashboardDocument[];
  sessions: ChatSessionResponse[];
};

type SummaryCard = {
  title: string;
  value: number;
  helper: string;
  icon: typeof Database;
  tone: string;
};

function getTimeValue(value: string) {
  const time = new Date(value).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function formatCompactDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value || "-";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getDocumentStatusLabel(status: DocumentResponse["status"]) {
  if (status === "INDEXED") return "已索引";
  if (status === "FAILED") return "失败";
  if (status === "PROCESSING") return "处理中";

  return "已上传";
}

function getDocumentStatusClass(status: DocumentResponse["status"]) {
  if (status === "INDEXED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "FAILED") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (status === "PROCESSING") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getDashboardErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const status = error.response?.status;

    if (status === 401) {
      return "登录状态已失效，请重新登录";
    }

    if (!error.response) {
      return "无法连接后端服务，请确认后端已启动";
    }

    if (status && status >= 500) {
      return "服务暂时不可用，请确认后端和模型配置状态";
    }
  }

  return "首页数据加载失败，请稍后重试";
}

function EmptyBlock({
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
    <div className="flex min-h-[168px] flex-col items-center justify-center rounded-[8px] border border-dashed border-slate-200 bg-slate-50/60 px-5 text-center">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-2 max-w-md text-xs leading-5 text-slate-500">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button
          type="button"
          variant="outline"
          className="mt-4 h-9 rounded-[6px] px-3 text-xs tracking-normal normal-case"
          onClick={onAction}
        >
          {actionLabel}
          <ArrowRight data-icon="inline-end" />
        </Button>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <section className="min-h-[calc(100svh-5rem)] bg-slate-50/60 px-3 py-4 sm:px-5">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <Card key={item} className="rounded-[8px] border-slate-200 p-4">
              <Skeleton className="size-10 rounded-[8px] bg-slate-100" />
              <Skeleton className="mt-4 h-4 w-24 rounded bg-slate-100" />
              <Skeleton className="mt-3 h-7 w-16 rounded bg-slate-100" />
            </Card>
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Skeleton className="h-[420px] rounded-[8px] bg-slate-100" />
          <Skeleton className="h-[420px] rounded-[8px] bg-slate-100" />
        </div>
      </div>
    </section>
  );
}

export function DashboardOverview() {
  const navigate = useNavigate();
  const location = useLocation();
  const rememberKnowledgeBase = useKnowledgeBaseUsageStore(
    (state) => state.rememberKnowledgeBase,
  );
  const [data, setData] = useState<DashboardData>({
    knowledgeBases: [],
    documents: [],
    sessions: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const redirectToLogin = useCallback(() => {
    clearMockAuthSession();
    navigate("/login", {
      replace: true,
      state: { from: location.pathname },
    });
  }, [location.pathname, navigate]);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const knowledgeBases = await getKnowledgeBases();
      const documentGroups = await Promise.all(
        knowledgeBases.map(async (knowledgeBase) => {
          try {
            const documents = await getKnowledgeBaseDocuments(knowledgeBase.id);

            return documents.map((document) => ({
              ...document,
              knowledgeBaseName: knowledgeBase.name,
            }));
          } catch (error) {
            if (isAxiosError(error) && error.response?.status === 404) {
              return [];
            }

            throw error;
          }
        }),
      );
      const sessionGroups = await Promise.all(
        knowledgeBases.map(async (knowledgeBase) => {
          try {
            return await getKnowledgeBaseChatSessions(knowledgeBase.id);
          } catch (error) {
            if (isAxiosError(error) && error.response?.status === 404) {
              return [];
            }

            throw error;
          }
        }),
      );

      setData({
        knowledgeBases,
        documents: documentGroups.flat(),
        sessions: sessionGroups.flat(),
      });
    } catch (error) {
      const message = getDashboardErrorMessage(error);

      setData({ knowledgeBases: [], documents: [], sessions: [] });
      setLoadError(message);

      if (isAxiosError(error) && error.response?.status === 401) {
        toast.error(message);
        redirectToLogin();
      } else {
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [redirectToLogin]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadDashboard]);

  const summaryCards = useMemo<SummaryCard[]>(() => {
    const indexedDocuments = data.documents.filter(
      (document) => document.status === "INDEXED",
    );
    const processingDocuments = data.documents.filter(
      (document) =>
        document.status === "PROCESSING" || document.status === "UPLOADED",
    );

    return [
      {
        title: "知识库",
        value: data.knowledgeBases.length,
        helper: "来自当前账号",
        icon: Database,
        tone: "bg-blue-50 text-blue-700 ring-blue-100",
      },
      {
        title: "文档",
        value: data.documents.length,
        helper: `${indexedDocuments.length} 个已索引`,
        icon: FileText,
        tone: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      },
      {
        title: "处理中",
        value: processingDocuments.length,
        helper: "等待完成后可检索",
        icon: Upload,
        tone: "bg-amber-50 text-amber-700 ring-amber-100",
      },
      {
        title: "会话",
        value: data.sessions.length,
        helper: "已保存问答上下文",
        icon: MessageCircle,
        tone: "bg-slate-100 text-slate-700 ring-slate-200",
      },
    ];
  }, [data.documents, data.knowledgeBases.length, data.sessions.length]);

  const recentKnowledgeBases = useMemo(
    () =>
      [...data.knowledgeBases]
        .sort(
          (first, second) =>
            getTimeValue(second.updatedAt) - getTimeValue(first.updatedAt),
        )
        .slice(0, 4),
    [data.knowledgeBases],
  );
  const recentDocuments = useMemo(
    () =>
      [...data.documents]
        .sort(
          (first, second) =>
            getTimeValue(second.updatedAt) - getTimeValue(first.updatedAt),
        )
        .slice(0, 5),
    [data.documents],
  );
  const recentSessions = useMemo(
    () =>
      [...data.sessions]
        .sort(
          (first, second) =>
            getTimeValue(second.updatedAt) - getTimeValue(first.updatedAt),
        )
        .slice(0, 5),
    [data.sessions],
  );
  const indexedDocuments = useMemo(
    () =>
      data.documents
        .filter((document) => document.status === "INDEXED")
        .sort(
          (first, second) =>
            getTimeValue(second.updatedAt) - getTimeValue(first.updatedAt),
        )
        .slice(0, 5),
    [data.documents],
  );
  const firstKnowledgeBase = recentKnowledgeBases[0];
  const canStartChat = data.knowledgeBases.length > 0;
  const canUploadDocument = data.knowledgeBases.length > 0;

  const openKnowledgeBase = (knowledgeBase: KnowledgeBaseResponse) => {
    rememberKnowledgeBase(knowledgeBase.id);
    navigate(`/KnowledgeBases/${knowledgeBase.id}`);
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (loadError) {
    return (
      <section className="flex min-h-[calc(100svh-5rem)] items-center justify-center bg-slate-50/60 px-5 text-slate-900">
        <div className="w-full max-w-md rounded-[8px] border border-orange-200 bg-white px-6 py-8 text-center shadow-sm">
          <TriangleAlert className="mx-auto size-8 text-orange-500" />
          <h2 className="mt-4 text-base font-semibold">首页数据加载失败</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{loadError}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-5 rounded-[6px] tracking-normal normal-case"
            onClick={() => void loadDashboard()}
          >
            <RefreshCw data-icon="inline-start" />
            重新加载
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-[calc(100svh-5rem)] bg-slate-50/60 px-3 py-4 text-slate-900 sm:px-5">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((item) => {
            const Icon = item.icon;

            return (
              <Card
                key={item.title}
                className="rounded-[8px] border-slate-200 bg-white p-4 shadow-sm"
              >
                <CardContent className="flex items-center gap-4 p-0">
                  <span
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-[8px] ring-1",
                      item.tone,
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-500">
                      {item.title}
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-slate-950">
                      {item.value}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {item.helper}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-w-0 flex-col gap-4">
            <Card className="rounded-[8px] border-slate-200 bg-white shadow-sm">
              <CardHeader className="gap-2">
                <CardTitle className="text-base tracking-normal normal-case">
                  演示流程
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 lg:grid-cols-4">
                {[
                  {
                    title: "创建知识库",
                    description: "整理资料集合",
                    action: "去创建",
                    disabled: false,
                    onClick: () => navigate("/KnowledgeBases"),
                  },
                  {
                    title: "上传文档",
                    description: "等待文档完成索引",
                    action: "去上传",
                    disabled: !canUploadDocument,
                    onClick: () =>
                      firstKnowledgeBase
                        ? navigate(`/Documents/${firstKnowledgeBase.id}`)
                        : navigate("/KnowledgeBases"),
                  },
                  {
                    title: "检索测试",
                    description: "验证关键词命中片段",
                    action: "去测试",
                    disabled: !firstKnowledgeBase,
                    onClick: () =>
                      firstKnowledgeBase &&
                      navigate(`/KnowledgeBases/${firstKnowledgeBase.id}`),
                  },
                  {
                    title: "正式问答",
                    description: "在 Chat 查看回答和引用",
                    action: "进入 Chat",
                    disabled: !canStartChat,
                    onClick: () => navigate("/Chat"),
                  },
                ].map((step, index) => (
                  <article
                    key={step.title}
                    className="flex min-h-[148px] flex-col rounded-[8px] border border-slate-200 bg-slate-50/60 p-4"
                  >
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                      <span className="flex size-6 items-center justify-center rounded-full bg-white text-slate-700 ring-1 ring-slate-200">
                        {index + 1}
                      </span>
                      Step
                    </div>
                    <h3 className="mt-4 text-sm font-semibold text-slate-900">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {step.description}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={step.disabled}
                      className="mt-auto h-8 w-fit rounded-[6px] px-3 text-xs tracking-normal normal-case"
                      onClick={step.onClick}
                    >
                      {step.action}
                    </Button>
                  </article>
                ))}
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="rounded-[8px] border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base tracking-normal normal-case">
                    最近知识库
                  </CardTitle>
                  <CardAction>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => navigate("/KnowledgeBases")}
                    >
                      查看全部
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {recentKnowledgeBases.length > 0 ? (
                    recentKnowledgeBases.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="flex min-w-0 items-center gap-3 rounded-[8px] border border-slate-100 bg-white p-3 text-left transition-colors hover:bg-slate-50"
                        onClick={() => openKnowledgeBase(item)}
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-blue-50 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                          {item.name.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-900">
                            {item.name}
                          </span>
                          <span className="block truncate text-xs text-slate-500">
                            {item.description || "暂无描述"}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs text-slate-500">
                          {formatCompactDateTime(item.updatedAt)}
                        </span>
                      </button>
                    ))
                  ) : (
                    <EmptyBlock
                      title="暂无知识库"
                      description="创建第一个知识库后，这里会显示最近更新的真实知识库。"
                      actionLabel="新建知识库"
                      onAction={() => navigate("/KnowledgeBases")}
                    />
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-[8px] border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base tracking-normal normal-case">
                    最近文档
                  </CardTitle>
                  <CardAction>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canUploadDocument}
                      onClick={() =>
                        firstKnowledgeBase
                          ? navigate(`/Documents/${firstKnowledgeBase.id}`)
                          : navigate("/Documents")
                      }
                    >
                      上传文档
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {recentDocuments.length > 0 ? (
                    recentDocuments.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="flex min-w-0 items-center gap-3 rounded-[8px] border border-slate-100 bg-white p-3 text-left transition-colors hover:bg-slate-50"
                        onClick={() =>
                          navigate(`/Documents/${item.knowledgeBaseId}`)
                        }
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-slate-100 text-slate-600">
                          <FileText className="size-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-900">
                            {item.originalFilename}
                          </span>
                          <span className="block truncate text-xs text-slate-500">
                            {item.knowledgeBaseName}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "shrink-0 rounded-[5px] border px-2 py-1 text-xs",
                            getDocumentStatusClass(item.status),
                          )}
                        >
                          {getDocumentStatusLabel(item.status)}
                        </span>
                      </button>
                    ))
                  ) : (
                    <EmptyBlock
                      title="暂无文档"
                      description={
                        canUploadDocument
                          ? "上传文档并完成索引后，这里会显示最近上传记录。"
                          : "请先创建知识库，再上传文档。"
                      }
                      actionLabel={canUploadDocument ? "上传文档" : "新建知识库"}
                      onAction={() =>
                        firstKnowledgeBase
                          ? navigate(`/Documents/${firstKnowledgeBase.id}`)
                          : navigate("/KnowledgeBases")
                      }
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <Card className="rounded-[8px] border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base tracking-normal normal-case">
                  最近会话
                </CardTitle>
                <CardAction>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!canStartChat}
                    onClick={() => navigate("/Chat")}
                  >
                    进入 Chat
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {recentSessions.length > 0 ? (
                  recentSessions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="flex min-w-0 flex-col gap-1 rounded-[8px] border border-slate-100 bg-white p-3 text-left transition-colors hover:bg-slate-50"
                      onClick={() => navigate(`/Chat/${item.id}`)}
                    >
                      <span className="truncate text-sm font-semibold text-slate-900">
                        {item.title || "新会话"}
                      </span>
                      <span className="text-xs text-slate-500">
                        更新于 {formatCompactDateTime(item.updatedAt)}
                      </span>
                    </button>
                  ))
                ) : (
                  <EmptyBlock
                    title="暂无会话"
                    description="在 Chat 中首次提问后，会话会保存并显示在这里。"
                    actionLabel={canStartChat ? "开始问答" : undefined}
                    onAction={canStartChat ? () => navigate("/Chat") : undefined}
                  />
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[8px] border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base tracking-normal normal-case">
                  可检索文档
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {indexedDocuments.length > 0 ? (
                  indexedDocuments.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="flex min-w-0 items-start gap-3 rounded-[8px] border border-slate-100 bg-white p-3 text-left transition-colors hover:bg-slate-50"
                      onClick={() =>
                        navigate(`/KnowledgeBases/${item.knowledgeBaseId}`)
                      }
                    >
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900">
                          {item.originalFilename}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {item.chunkCount} chunks · {item.knowledgeBaseName}
                        </span>
                      </span>
                    </button>
                  ))
                ) : (
                  <EmptyBlock
                    title="暂无可检索文档"
                    description="文档状态变为 INDEXED 后，才能在知识库详情页检索并在 Chat 中引用。"
                  />
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[8px] border-slate-200 bg-white shadow-sm">
              <CardContent className="flex items-start gap-3 p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                  <Bot className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    正式问答入口在 Chat
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    知识库详情页只做文档检索测试；需要查看回答和引用来源时，请进入 Chat。
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
