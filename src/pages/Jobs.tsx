import { useCallback, useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Clock3,
  Database,
  FileText,
  Loader2,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  ServerCog,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  cancelDocumentProcessingJob,
  getDocumentProcessingJobsGlobal,
  retryDocumentProcessingJob,
  type DocumentProcessingJobResponse,
  type DocumentProcessingJobStatus,
  type DocumentProcessingJobStatusFilter,
} from "@/api/documents";
import {
  getSystemDiagnostics,
  type SystemDiagnosticsResponse,
} from "@/api/system";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type JobFilter = "ALL" | DocumentProcessingJobStatusFilter;

const jobFilters: Array<{ value: JobFilter; label: string }> = [
  { value: "ALL", label: "全部" },
  { value: "ACTIVE", label: "进行中" },
  { value: "QUEUED", label: "排队" },
  { value: "RUNNING", label: "运行" },
  { value: "SUCCEEDED", label: "成功" },
  { value: "FAILED", label: "失败" },
  { value: "CANCELED", label: "已取消" },
];

const statusMeta: Record<
  DocumentProcessingJobStatus,
  {
    label: string;
    icon: typeof Clock3;
    badgeClass: string;
    progressClass: string;
  }
> = {
  QUEUED: {
    label: "排队中",
    icon: Clock3,
    badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
    progressClass: "bg-amber-500",
  },
  RUNNING: {
    label: "运行中",
    icon: PlayCircle,
    badgeClass: "border-blue-200 bg-blue-50 text-blue-700",
    progressClass: "bg-blue-500",
  },
  SUCCEEDED: {
    label: "已完成",
    icon: CheckCircle2,
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    progressClass: "bg-emerald-500",
  },
  FAILED: {
    label: "失败",
    icon: XCircle,
    badgeClass: "border-red-200 bg-red-50 text-red-700",
    progressClass: "bg-red-500",
  },
  CANCELED: {
    label: "已取消",
    icon: Ban,
    badgeClass: "border-slate-200 bg-slate-100 text-slate-600",
    progressClass: "bg-slate-400",
  },
};

const jobTypeLabels: Record<string, string> = {
  UPLOAD_INDEX: "上传索引",
  REPROCESS: "重新处理",
  REBUILD_SEMANTIC_INDEX: "重建语义索引",
};

function clampProgress(value: number) {
  if (!Number.isFinite(value)) return 0;

  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function maskSensitiveText(value?: string | null) {
  if (!value) return "";

  return value
    .replace(
      /Authorization\s*:\s*Bearer\s+[^\s,;]+/gi,
      "Authorization: Bearer ***",
    )
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer ***")
    .replace(/api[_-]?key\s*[:=]\s*[^\s,;]+/gi, "API Key ***")
    .replace(/(sk|ak)-[A-Za-z0-9_-]{12,}/gi, "$1-***")
    .replace(/https?:\/\/[^\s"'<>]+/gi, "[Base URL]");
}

function getSafeErrorMessage(error: unknown, fallback = "操作失败，请稍后重试") {
  if (isAxiosError(error)) {
    const responseMessage = error.response?.data as
      | { message?: unknown; error?: unknown }
      | undefined;
    const backendMessage =
      typeof responseMessage?.message === "string"
        ? responseMessage.message
        : typeof responseMessage?.error === "string"
          ? responseMessage.error
          : "";

    if (backendMessage) {
      return maskSensitiveText(backendMessage);
    }

    if (!error.response) {
      return "无法连接任务服务，请确认后端已启动";
    }

    if (error.response.status === 401) {
      return "登录状态已失效，请重新登录";
    }

    if (error.response.status === 403) {
      return "当前角色无权执行此操作";
    }

    if (error.response.status === 404) {
      return "任务不存在，或你没有访问权限";
    }

    if (error.response.status >= 500) {
      return "任务服务异常，请稍后重试";
    }
  }

  return fallback;
}

function isActiveJob(job: DocumentProcessingJobResponse) {
  return job.status === "QUEUED" || job.status === "RUNNING";
}

function getDiagnosticsStatus(diagnostics: SystemDiagnosticsResponse | null) {
  return typeof diagnostics?.status === "string" ? diagnostics.status : "-";
}

function Jobs() {
  const [filter, setFilter] = useState<JobFilter>("ACTIVE");
  const [jobs, setJobs] = useState<DocumentProcessingJobResponse[]>([]);
  const [diagnostics, setDiagnostics] =
    useState<SystemDiagnosticsResponse | null>(null);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [isLoadingDiagnostics, setIsLoadingDiagnostics] = useState(false);
  const [jobError, setJobError] = useState("");
  const [diagnosticsError, setDiagnosticsError] = useState("");
  const [mutatingJobId, setMutatingJobId] = useState<number | null>(null);

  const activeCount = useMemo(
    () => jobs.filter((job) => isActiveJob(job)).length,
    [jobs],
  );
  const failedCount = useMemo(
    () => jobs.filter((job) => job.status === "FAILED").length,
    [jobs],
  );

  const loadDiagnostics = useCallback(async () => {
    setIsLoadingDiagnostics(true);
    setDiagnosticsError("");

    try {
      const response = await getSystemDiagnostics();
      setDiagnostics(response);
    } catch (error) {
      setDiagnostics(null);
      setDiagnosticsError(getSafeErrorMessage(error, "系统状态暂不可用"));
    } finally {
      setIsLoadingDiagnostics(false);
    }
  }, []);

  const loadJobs = useCallback(async () => {
    setIsLoadingJobs(true);
    setJobError("");

    try {
      const response = await getDocumentProcessingJobsGlobal({
        status: filter === "ALL" ? undefined : filter,
        limit: 50,
      });
      setJobs(response);
    } catch (error) {
      setJobs([]);
      setJobError(getSafeErrorMessage(error, "任务列表加载失败"));
    } finally {
      setIsLoadingJobs(false);
    }
  }, [filter]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadJobs();
      void loadDiagnostics();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadDiagnostics, loadJobs]);

  useEffect(() => {
    if (!jobs.some(isActiveJob)) return;

    const intervalId = window.setInterval(() => {
      void loadJobs();
      void loadDiagnostics();
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [jobs, loadDiagnostics, loadJobs]);

  async function handleRetry(job: DocumentProcessingJobResponse) {
    if (!(job.status === "FAILED" || job.status === "CANCELED")) return;

    setMutatingJobId(job.id);

    try {
      await retryDocumentProcessingJob(job.id);
      toast.success("已创建重试任务");
      await loadJobs();
      void loadDiagnostics();
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "重试任务失败"));
    } finally {
      setMutatingJobId(null);
    }
  }

  async function handleCancel(job: DocumentProcessingJobResponse) {
    if (!isActiveJob(job)) return;

    setMutatingJobId(job.id);

    try {
      await cancelDocumentProcessingJob(job.id);
      toast.success("已取消任务");
      await loadJobs();
      void loadDiagnostics();
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "取消任务失败"));
    } finally {
      setMutatingJobId(null);
    }
  }

  return (
    <section className="min-h-0 bg-white px-4 py-4 text-slate-900 xl:px-5">
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 lg:grid-cols-3">
          <SummaryCard
            icon={ServerCog}
            title="系统状态"
            value={isLoadingDiagnostics ? "读取中" : getDiagnosticsStatus(diagnostics)}
            description={diagnosticsError || "来自 /system/diagnostics 的轻量诊断信息"}
          />
          <SummaryCard
            icon={Loader2}
            title="活跃任务"
            value={activeCount}
            description="当前筛选结果中的排队和运行任务"
          />
          <SummaryCard
            icon={AlertCircle}
            title="失败任务"
            value={failedCount}
            description="可在列表中对失败任务发起重试"
          />
        </div>

        <div className="flex flex-col gap-3 rounded-[8px] border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-wrap gap-2">
            {jobFilters.map((item) => (
              <Button
                key={item.value}
                type="button"
                variant="outline"
                onClick={() => setFilter(item.value)}
                className={cn(
                  "h-9 rounded-[5px] border-slate-200 px-3 text-sm font-normal tracking-normal normal-case",
                  filter === item.value
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "bg-white text-slate-600 hover:bg-slate-50",
                )}
              >
                {item.label}
              </Button>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={isLoadingJobs || isLoadingDiagnostics}
            onClick={() => {
              void loadJobs();
              void loadDiagnostics();
            }}
            className="h-9 rounded-[5px] border-slate-200 bg-white px-3 text-sm font-normal tracking-normal text-slate-700 normal-case hover:bg-slate-50"
          >
            {isLoadingJobs || isLoadingDiagnostics ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <RefreshCw data-icon="inline-start" />
            )}
            刷新
          </Button>
        </div>

        <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm">
          <JobListContent
            jobs={jobs}
            jobError={jobError}
            isLoadingJobs={isLoadingJobs}
            mutatingJobId={mutatingJobId}
            onRetry={(job) => void handleRetry(job)}
            onCancel={(job) => void handleCancel(job)}
            onReload={() => void loadJobs()}
          />
        </div>
      </div>
    </section>
  );
}

function SummaryCard({
  icon: Icon,
  title,
  value,
  description,
}: {
  icon: typeof ServerCog;
  title: string;
  value: string | number;
  description: string;
}) {
  return (
    <Card className="rounded-[8px] border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <Icon className="size-4 text-blue-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl font-semibold text-slate-900">{value}</div>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </CardContent>
    </Card>
  );
}

function JobListContent({
  jobs,
  jobError,
  isLoadingJobs,
  mutatingJobId,
  onRetry,
  onCancel,
  onReload,
}: {
  jobs: DocumentProcessingJobResponse[];
  jobError: string;
  isLoadingJobs: boolean;
  mutatingJobId: number | null;
  onRetry: (job: DocumentProcessingJobResponse) => void;
  onCancel: (job: DocumentProcessingJobResponse) => void;
  onReload: () => void;
}) {
  if (jobError) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
        <AlertCircle className="size-9 text-orange-500" />
        <h2 className="mt-4 text-base font-semibold text-slate-900">
          任务列表加载失败
        </h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
          {jobError}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={onReload}
          className="mt-5 h-10 rounded-[6px] border-orange-200 bg-white px-4 text-sm tracking-normal text-slate-700 normal-case hover:bg-orange-50"
        >
          <RefreshCw data-icon="inline-start" />
          重新加载
        </Button>
      </div>
    );
  }

  if (isLoadingJobs) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-sm text-slate-600">
        <Loader2 className="mr-2 size-4 animate-spin text-blue-600" />
        正在加载后台任务...
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
        <FileText className="size-9 text-slate-400" />
        <h2 className="mt-4 text-base font-semibold text-slate-900">
          暂无任务
        </h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
          当前筛选下没有文档处理任务。上传、重新处理或重建语义索引后会出现在这里。
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col divide-y divide-slate-100 md:hidden">
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            isMutating={mutatingJobId === job.id}
            onRetry={() => onRetry(job)}
            onCancel={() => onCancel(job)}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
          <thead className="bg-white text-slate-600">
            <tr className="border-b border-slate-200">
              <th className="px-4 py-4 font-medium">任务</th>
              <th className="px-4 py-4 font-medium">状态</th>
              <th className="px-4 py-4 font-medium">进度</th>
              <th className="px-4 py-4 font-medium">上下文</th>
              <th className="px-4 py-4 font-medium">消息</th>
              <th className="px-4 py-4 font-medium">时间</th>
              <th className="px-4 py-4 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <JobRow
                key={job.id}
                job={job}
                isMutating={mutatingJobId === job.id}
                onRetry={() => onRetry(job)}
                onCancel={() => onCancel(job)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function JobCard({
  job,
  isMutating,
  onRetry,
  onCancel,
}: {
  job: DocumentProcessingJobResponse;
  isMutating: boolean;
  onRetry: () => void;
  onCancel: () => void;
}) {
  return (
    <article className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium text-slate-900">任务 #{job.id}</div>
          <div className="mt-1 text-xs text-slate-500">
            {jobTypeLabels[job.jobType] ?? job.jobType}
          </div>
        </div>
        <JobStatusBadge status={job.status} />
      </div>
      <JobProgress job={job} />
      <JobMessage job={job} />
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
        <div>文档 #{job.documentId}</div>
        <div>知识库 #{job.knowledgeBaseId}</div>
        <div>创建 {formatDateTime(job.createdAt)}</div>
        <div>更新 {formatDateTime(job.updatedAt)}</div>
      </div>
      <JobActions
        job={job}
        isMutating={isMutating}
        onRetry={onRetry}
        onCancel={onCancel}
      />
    </article>
  );
}

function JobRow({
  job,
  isMutating,
  onRetry,
  onCancel,
}: {
  job: DocumentProcessingJobResponse;
  isMutating: boolean;
  onRetry: () => void;
  onCancel: () => void;
}) {
  return (
    <tr className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
      <td className="px-4 py-5">
        <div className="min-w-0">
          <div className="font-medium text-slate-900">#{job.id}</div>
          <div className="mt-1 text-xs text-slate-500">
            {jobTypeLabels[job.jobType] ?? job.jobType}
          </div>
        </div>
      </td>
      <td className="px-4 py-5">
        <JobStatusBadge status={job.status} />
      </td>
      <td className="px-4 py-5">
        <JobProgress job={job} />
      </td>
      <td className="px-4 py-5">
        <div className="flex min-w-[150px] flex-col gap-1 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1">
            <FileText className="size-3.5 text-slate-400" />
            文档 #{job.documentId}
          </span>
          <span className="inline-flex items-center gap-1">
            <Database className="size-3.5 text-slate-400" />
            知识库 #{job.knowledgeBaseId}
          </span>
          <span>发起人 #{job.requestedBy}</span>
        </div>
      </td>
      <td className="max-w-[280px] px-4 py-5">
        <JobMessage job={job} />
      </td>
      <td className="px-4 py-5">
        <div className="min-w-[150px] text-xs leading-5 text-slate-500">
          <div>创建 {formatDateTime(job.createdAt)}</div>
          <div>更新 {formatDateTime(job.updatedAt)}</div>
          <div>结束 {formatDateTime(job.finishedAt)}</div>
        </div>
      </td>
      <td className="px-4 py-5">
        <JobActions
          job={job}
          isMutating={isMutating}
          onRetry={onRetry}
          onCancel={onCancel}
        />
      </td>
    </tr>
  );
}

function JobStatusBadge({ status }: { status: DocumentProcessingJobStatus }) {
  const meta = statusMeta[status];
  const Icon = meta.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[5px] border px-2 py-1 text-xs font-medium",
        meta.badgeClass,
      )}
    >
      <Icon className="size-3.5" />
      {meta.label}
    </span>
  );
}

function JobProgress({ job }: { job: DocumentProcessingJobResponse }) {
  const progress = clampProgress(job.progressPercent);
  const meta = statusMeta[job.status];

  return (
    <div className="min-w-[160px]">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs text-slate-500">
        <span className="max-w-[120px] truncate">{job.stage || job.status}</span>
        <span>{progress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn(
            "h-full rounded-full transition-[width]",
            meta.progressClass,
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function JobMessage({ job }: { job: DocumentProcessingJobResponse }) {
  const message = maskSensitiveText(job.errorMessage || job.message || "");

  if (!message) {
    return <span className="text-xs text-slate-400">暂无消息</span>;
  }

  return (
    <p
      className={cn(
        "line-clamp-3 break-words text-xs leading-5",
        job.errorMessage ? "text-red-600" : "text-slate-600",
      )}
      title={message}
    >
      {message}
    </p>
  );
}

function JobActions({
  job,
  isMutating,
  onRetry,
  onCancel,
}: {
  job: DocumentProcessingJobResponse;
  isMutating: boolean;
  onRetry: () => void;
  onCancel: () => void;
}) {
  const canRetry = job.status === "FAILED" || job.status === "CANCELED";
  const canCancel = isActiveJob(job);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canRetry && (
        <Button
          type="button"
          variant="outline"
          disabled={isMutating}
          onClick={onRetry}
          className="h-8 rounded-[5px] border-slate-200 bg-white px-3 text-xs font-medium tracking-normal text-slate-700 normal-case hover:bg-slate-50"
        >
          {isMutating ? (
            <Loader2 data-icon="inline-start" className="animate-spin" />
          ) : (
            <RotateCcw data-icon="inline-start" />
          )}
          重试
        </Button>
      )}
      {canCancel && (
        <Button
          type="button"
          variant="outline"
          disabled={isMutating}
          onClick={onCancel}
          className="h-8 rounded-[5px] border-red-200 bg-white px-3 text-xs font-medium tracking-normal text-red-600 normal-case hover:bg-red-50"
        >
          {isMutating ? (
            <Loader2 data-icon="inline-start" className="animate-spin" />
          ) : (
            <Ban data-icon="inline-start" />
          )}
          取消
        </Button>
      )}
      {!canRetry && !canCancel && (
        <span className="text-xs text-slate-400">无可用操作</span>
      )}
    </div>
  );
}

export default Jobs;
