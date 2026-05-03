import { useMemo, useState } from "react";
import {
  Bell,
  Box,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  CircleHelp,
  Clock3,
  Database,
  Download,
  Eye,
  EyeOff,
  FileText,
  HardDrive,
  KeyRound,
  LockKeyhole,
  LogOut,
  Pencil,
  RefreshCw,
  RotateCw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UserRound,
  Wifi,
} from "lucide-react";

import MyAvatar from "@/assets/mypic.jpg";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type SettingsSection =
  | "account"
  | "model"
  | "rag"
  | "storage"
  | "security"
  | "status";

type RagSettings = {
  chunkSize: number;
  chunkOverlap: number;
  topK: number;
  citationLimit: number;
  similarityMetric: "cosine" | "dot" | "euclidean";
};

const lastCheckedAt = "2025-05-19 14:20:33";

const settingSections: Array<{
  id: SettingsSection;
  label: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}> = [
  {
    id: "account",
    label: "账号信息",
    description: "个人资料与偏好",
    icon: UserRound,
  },
  {
    id: "model",
    label: "模型配置",
    description: "LLM 与 Embedding",
    icon: Box,
  },
  {
    id: "rag",
    label: "RAG 参数",
    description: "检索与引用策略",
    icon: SlidersHorizontal,
  },
  {
    id: "storage",
    label: "数据与存储",
    description: "数据库与索引容量",
    icon: Database,
  },
  {
    id: "security",
    label: "安全设置",
    description: "密钥、会话和导出",
    icon: ShieldCheck,
  },
  {
    id: "status",
    label: "系统状态",
    description: "服务健康检查",
    icon: HardDrive,
  },
];

const systemStatusRows = [
  {
    service: "Embedding Service",
    status: "online",
    details: "model: text-embedding-3-small, dim: 1536, provider: OpenAI",
  },
  {
    service: "LLM API",
    status: "online",
    details: "provider: OpenAI Compatible, model: deepseek-chat, latency: 642ms",
  },
  {
    service: "Database",
    status: "online",
    details: "PostgreSQL 15.4 + pgvector 0.7.3, connections: 6/20",
  },
  {
    service: "File Parser",
    status: "ready",
    details: "PDF, Markdown, TXT parser all good",
  },
];

const storageStats = [
  {
    label: "PostgreSQL",
    status: "online",
    detail: "版本 15.4",
    icon: Database,
  },
  {
    label: "pgvector 索引",
    status: "ready",
    detail: "ivfflat (lists: 100)",
    icon: Sparkles,
  },
  {
    label: "Documents",
    value: "28",
    detail: "总文档数",
    icon: FileText,
  },
  {
    label: "Chunks",
    value: "1,246",
    detail: "文本片段总数",
    icon: Box,
  },
];

function SectionCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      size="sm"
      className={cn(
        "gap-4 rounded-[8px] border border-slate-200/80 py-4 shadow-none ring-0",
        className,
      )}
    >
      {children}
    </Card>
  );
}

function InlineSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-2 text-sm text-slate-700">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full min-w-0 rounded-[5px] border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition-colors hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextField({
  label,
  value,
  type = "text",
  readOnly = false,
  onChange,
  action,
}: {
  label: string;
  value: string;
  type?: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  action?: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-2 text-sm text-slate-700">
      <span>{label}</span>
      <div className="flex h-10 min-w-0 items-center rounded-[5px] border border-slate-200 bg-white px-3 transition-colors focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
        <Input
          type={type}
          value={value}
          readOnly={readOnly}
          onChange={(event) => onChange?.(event.target.value)}
          className="h-8 border-0 px-0 text-sm text-slate-700 focus-visible:border-0"
        />
        {action}
      </div>
    </label>
  );
}

function StatusPill({
  status,
  tone = "green",
}: {
  status: string;
  tone?: "green" | "blue" | "orange";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-sm",
        tone === "green" && "text-emerald-600",
        tone === "blue" && "text-blue-600",
        tone === "orange" && "text-orange-600",
      )}
    >
      <span
        className={cn(
          "size-2 rounded-full",
          tone === "green" && "bg-emerald-500",
          tone === "blue" && "bg-blue-500",
          tone === "orange" && "bg-orange-500",
        )}
      />
      {status}
    </span>
  );
}

function ToggleRow({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[6px] border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[6px] bg-blue-50 text-blue-600">
          <Icon aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-900">{title}</div>
          <div className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </div>
        </div>
      </div>
      <button
        type="button"
        aria-pressed={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition-colors",
          checked ? "bg-blue-600" : "bg-slate-200",
        )}
      >
        <span
          className={cn(
            "size-4 rounded-full bg-white shadow-sm transition-transform",
            checked && "translate-x-5",
          )}
        />
      </button>
    </div>
  );
}

function RagControl({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label className="flex items-center gap-1 text-sm text-slate-700">
        {label}
        <CircleHelp aria-hidden="true" className="text-slate-400" />
      </label>
      <Input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-9 rounded-[5px] border border-slate-200 bg-white px-3 text-sm focus-visible:border-blue-400"
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{
          background: `linear-gradient(to right, #2563eb ${percentage}%, #e5e7eb ${percentage}%)`,
        }}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-blue-600 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-600 [&::-webkit-slider-thumb]:bg-white"
      />
      <div className="flex justify-between text-xs text-slate-500">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

export default function Settings() {
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("model");
  const [showApiKey, setShowApiKey] = useState(false);
  const [connectionState, setConnectionState] = useState<
    "Connected" | "Testing..." | "Connected just now"
  >("Connected");
  const [modelSettings, setModelSettings] = useState({
    provider: "OpenAI Compatible",
    baseUrl: "https://api.openai.com/v1",
    apiKey: "sk-knowflow-local-secret",
    chatModel: "deepseek-chat",
    embeddingModel: "text-embedding-3-small",
  });
  const [ragSettings, setRagSettings] = useState<RagSettings>({
    chunkSize: 800,
    chunkOverlap: 120,
    topK: 6,
    citationLimit: 4,
    similarityMetric: "cosine",
  });
  const [securitySettings, setSecuritySettings] = useState({
    loginAlert: true,
    exportAudit: true,
    keyRotation: false,
  });
  const [cacheStatus, setCacheStatus] = useState("缓存正常");
  const [statusCheckedAt, setStatusCheckedAt] = useState(lastCheckedAt);

  const activeTitle = useMemo(
    () => settingSections.find((section) => section.id === activeSection),
    [activeSection],
  );

  function updateRagValue(key: keyof RagSettings, value: number | string) {
    setRagSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function testConnection() {
    setConnectionState("Testing...");
    window.setTimeout(() => {
      setConnectionState("Connected just now");
    }, 500);
  }

  function refreshStatus() {
    setStatusCheckedAt("刚刚");
  }

  return (
    <div className="flex w-full flex-col gap-4 p-3 text-slate-900 lg:flex-row lg:p-4">
      <aside className="shrink-0 rounded-[8px] border border-slate-200 bg-white p-3 lg:w-60">
        <div className="mb-3 px-2 text-sm font-semibold text-slate-900">
          设置导航
        </div>
        <nav
          aria-label="设置导航"
          className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible"
        >
          {settingSections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;

            return (
              <button
                key={section.id}
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "flex min-w-[154px] items-center gap-3 rounded-[6px] px-3 py-3 text-left transition-colors lg:min-w-0",
                  isActive
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                )}
              >
                <Icon aria-hidden="true" className="shrink-0" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {section.label}
                  </span>
                  <span className="mt-0.5 hidden truncate text-xs text-slate-400 lg:block">
                    {section.description}
                  </span>
                </span>
                {isActive && (
                  <ChevronRight
                    aria-hidden="true"
                    className="ml-auto hidden lg:block"
                  />
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="min-w-0 flex-1">
        <div className="mb-3 flex items-center justify-between gap-3 rounded-[8px] border border-slate-200 bg-white px-4 py-3 lg:hidden">
          <div>
            <div className="text-sm font-semibold">{activeTitle?.label}</div>
            <div className="text-xs text-slate-500">
              {activeTitle?.description}
            </div>
          </div>
          <StatusPill status="ready" tone="blue" />
        </div>

        {activeSection === "account" && (
          <div className="flex flex-col gap-4">
            <SectionCard>
              <CardHeader>
                <CardTitle className="font-sans text-base normal-case tracking-normal">
                  账号信息
                </CardTitle>
                <CardDescription>
                  管理个人资料、语言、时区和通知偏好。
                </CardDescription>
                <CardAction className="hidden gap-3 sm:flex">
                  <Button variant="outline" size="sm">
                    <Pencil data-icon="inline-start" />
                    编辑资料
                  </Button>
                  <Button variant="outline" size="sm">
                    <LogOut data-icon="inline-start" />
                    退出登录
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Avatar className="size-16">
                    <AvatarImage src={MyAvatar} />
                    <AvatarFallback>O</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-semibold text-slate-900">
                      Oya
                    </div>
                    <div className="text-sm text-slate-500">
                      oya@example.com
                    </div>
                    <span className="mt-2 inline-flex rounded-[5px] bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600">
                      Student Developer
                    </span>
                  </div>
                  <div className="flex gap-2 sm:hidden">
                    <Button variant="outline" size="sm">
                      <Pencil data-icon="inline-start" />
                      编辑资料
                    </Button>
                    <Button variant="outline" size="sm">
                      <LogOut data-icon="inline-start" />
                      退出登录
                    </Button>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField label="显示名称" value="Oya" readOnly />
                  <TextField label="邮箱" value="oya@example.com" readOnly />
                  <InlineSelect
                    label="语言偏好"
                    value="简体中文"
                    options={["简体中文", "English", "日本語"]}
                    onChange={() => undefined}
                  />
                  <InlineSelect
                    label="时区"
                    value="Asia/Hong_Kong"
                    options={["Asia/Hong_Kong", "Asia/Shanghai", "UTC"]}
                    onChange={() => undefined}
                  />
                </div>
              </CardContent>
            </SectionCard>
            <SectionCard>
              <CardHeader>
                <CardTitle className="font-sans text-base normal-case tracking-normal">
                  通知偏好
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <ToggleRow
                  icon={Bell}
                  title="索引完成提醒"
                  description="文档解析和向量化完成后通知我。"
                  checked
                  onChange={() => undefined}
                />
                <ToggleRow
                  icon={Clock3}
                  title="每日系统摘要"
                  description="每天汇总知识库状态和异常服务。"
                  checked={false}
                  onChange={() => undefined}
                />
              </CardContent>
            </SectionCard>
          </div>
        )}

        {activeSection === "model" && (
          <div className="flex flex-col gap-4">
            <SectionCard>
              <CardHeader>
                <CardTitle className="font-sans text-base normal-case tracking-normal">
                  账号信息
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Avatar className="size-16">
                  <AvatarImage src={MyAvatar} />
                  <AvatarFallback>O</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-base font-semibold text-slate-900">
                    Oya
                  </div>
                  <div className="text-sm text-slate-500">oya@example.com</div>
                  <span className="mt-2 inline-flex rounded-[5px] bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600">
                    Student Developer
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm">
                    <Pencil data-icon="inline-start" />
                    编辑资料
                  </Button>
                  <Button variant="outline" size="sm">
                    <LogOut data-icon="inline-start" />
                    退出登录
                  </Button>
                </div>
              </CardContent>
            </SectionCard>

            <SectionCard>
              <CardHeader>
                <CardTitle className="font-sans text-base normal-case tracking-normal">
                  模型配置
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6 xl:grid-cols-[1fr_1fr_auto]">
                <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:col-span-2">
                  <InlineSelect
                    label="LLM Provider"
                    value={modelSettings.provider}
                    options={[
                      "OpenAI Compatible",
                      "OpenAI",
                      "Azure OpenAI",
                      "Local Ollama",
                    ]}
                    onChange={(provider) =>
                      setModelSettings((current) => ({ ...current, provider }))
                    }
                  />
                  <InlineSelect
                    label="Chat Model"
                    value={modelSettings.chatModel}
                    options={["deepseek-chat", "gpt-4.1-mini", "qwen-plus"]}
                    onChange={(chatModel) =>
                      setModelSettings((current) => ({
                        ...current,
                        chatModel,
                      }))
                    }
                  />
                  <TextField
                    label="Base URL"
                    value={modelSettings.baseUrl}
                    onChange={(baseUrl) =>
                      setModelSettings((current) => ({ ...current, baseUrl }))
                    }
                  />
                  <InlineSelect
                    label="Embedding Model"
                    value={modelSettings.embeddingModel}
                    options={[
                      "text-embedding-3-small",
                      "text-embedding-3-large",
                      "bge-m3",
                    ]}
                    onChange={(embeddingModel) =>
                      setModelSettings((current) => ({
                        ...current,
                        embeddingModel,
                      }))
                    }
                  />
                  <TextField
                    label="API Key"
                    value={
                      showApiKey
                        ? modelSettings.apiKey
                        : "••••••••••••••••••••••••••"
                    }
                    type="text"
                    readOnly={!showApiKey}
                    onChange={(apiKey) =>
                      setModelSettings((current) => ({ ...current, apiKey }))
                    }
                    action={
                      <button
                        type="button"
                        aria-label={showApiKey ? "隐藏 API Key" : "显示 API Key"}
                        data-testid="api-key-visibility-toggle"
                        onClick={() => setShowApiKey((value) => !value)}
                        className="ml-2 text-slate-500 transition-colors hover:text-slate-900"
                      >
                        {showApiKey ? <EyeOff /> : <Eye />}
                      </button>
                    }
                  />
                  <div className="flex flex-col gap-2">
                    <span className="text-sm text-slate-700">连接状态</span>
                    <div className="flex h-10 items-center">
                      <StatusPill
                        status={connectionState}
                        tone={connectionState === "Testing..." ? "orange" : "green"}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={testConnection}
                    data-testid="test-connection-button"
                    disabled={connectionState === "Testing..."}
                    className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                  >
                    <Wifi data-icon="inline-start" />
                    测试连接
                  </Button>
                </div>
                <div className="xl:col-span-3">
                  <div className="flex items-start gap-2 text-sm text-orange-500">
                    <CircleAlert aria-hidden="true" className="mt-0.5" />
                    <span>
                      API Key 仅保存在后端环境变量中，不会暴露到前端
                    </span>
                  </div>
                </div>
              </CardContent>
            </SectionCard>
          </div>
        )}

        {activeSection === "rag" && (
          <SectionCard>
            <CardHeader>
              <CardTitle className="font-sans text-base normal-case tracking-normal">
                RAG 参数
              </CardTitle>
              <CardDescription>
                调整检索窗口、上下文重叠和引用展示数量。
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 xl:grid-cols-[1fr_260px]">
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <RagControl
                  label="Chunk Size"
                  value={ragSettings.chunkSize}
                  min={200}
                  max={2000}
                  onChange={(value) => updateRagValue("chunkSize", value)}
                />
                <RagControl
                  label="Chunk Overlap"
                  value={ragSettings.chunkOverlap}
                  min={0}
                  max={400}
                  onChange={(value) => updateRagValue("chunkOverlap", value)}
                />
                <RagControl
                  label="Top K（检索数量）"
                  value={ragSettings.topK}
                  min={1}
                  max={20}
                  onChange={(value) => updateRagValue("topK", value)}
                />
                <RagControl
                  label="Citation Limit"
                  value={ragSettings.citationLimit}
                  min={1}
                  max={10}
                  onChange={(value) => updateRagValue("citationLimit", value)}
                />
                <InlineSelect
                  label="相似度度量"
                  value={ragSettings.similarityMetric}
                  options={["cosine", "dot", "euclidean"]}
                  onChange={(value) =>
                    updateRagValue(
                      "similarityMetric",
                      value as RagSettings["similarityMetric"],
                    )
                  }
                />
              </div>
              <div className="rounded-[6px] border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">
                  参数说明
                </div>
                <ul className="mt-3 flex list-disc flex-col gap-2 pl-4 text-xs leading-5 text-slate-600">
                  <li>更大的 Chunk Size 提升上下文完整性</li>
                  <li>适当的 Overlap 有助于减少信息丢失</li>
                  <li>Top K 越大，召回越高但成本也越高</li>
                  <li>Citation Limit 控制展示的引用来源数量</li>
                </ul>
              </div>
            </CardContent>
          </SectionCard>
        )}

        {activeSection === "storage" && (
          <div className="flex flex-col gap-4">
            <SectionCard>
              <CardHeader>
                <CardTitle className="font-sans text-base normal-case tracking-normal">
                  数据与存储
                </CardTitle>
                <CardDescription>
                  数据库、向量索引、文档数量和容量使用情况。
                </CardDescription>
                <CardAction className="hidden gap-2 sm:flex">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCacheStatus("缓存已清理")}
                  >
                    <Trash2 data-icon="inline-start" />
                    清理缓存
                  </Button>
                  <Button variant="outline" size="sm">
                    <RotateCw data-icon="inline-start" />
                    重建索引
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {storageStats.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className="min-w-0 border-b border-slate-200 pb-4 md:border-r md:border-b-0 md:pr-4 md:last:border-r-0"
                      >
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <Icon aria-hidden="true" className="text-slate-500" />
                          <span className="truncate">{item.label}</span>
                        </div>
                        <div className="mt-2">
                          {item.value ? (
                            <span className="text-xl font-semibold text-slate-900">
                              {item.value}
                            </span>
                          ) : (
                            <StatusPill
                              status={item.status ?? "ready"}
                              tone="green"
                            />
                          )}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {item.detail}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="grid gap-4 rounded-[6px] border border-slate-200 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      存储使用
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      12.4 GB / 50 GB（24.8%）
                    </div>
                    <Progress
                      value={24.8}
                      className="mt-3 h-2 rounded-full bg-slate-100 [&_[data-slot=progress-indicator]]:bg-blue-600"
                    />
                    <div className="mt-2 text-xs text-slate-500">
                      {cacheStatus}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCacheStatus("缓存已清理")}
                    >
                      <Trash2 data-icon="inline-start" />
                      清理缓存
                    </Button>
                    <Button variant="outline" size="sm">
                      <RotateCw data-icon="inline-start" />
                      重建索引
                    </Button>
                  </div>
                </div>
              </CardContent>
            </SectionCard>
          </div>
        )}

        {activeSection === "security" && (
          <div className="flex flex-col gap-4">
            <SectionCard>
              <CardHeader>
                <CardTitle className="font-sans text-base normal-case tracking-normal">
                  安全设置
                </CardTitle>
                <CardDescription>
                  管理 API Key 策略、登录提醒、审计和数据导出。
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 lg:grid-cols-2">
                <ToggleRow
                  icon={KeyRound}
                  title="API Key 定期轮换"
                  description="每 90 天提醒更换模型供应商密钥。"
                  checked={securitySettings.keyRotation}
                  onChange={(keyRotation) =>
                    setSecuritySettings((current) => ({
                      ...current,
                      keyRotation,
                    }))
                  }
                />
                <ToggleRow
                  icon={Bell}
                  title="异常登录提醒"
                  description="新设备或新地区登录时发送提醒。"
                  checked={securitySettings.loginAlert}
                  onChange={(loginAlert) =>
                    setSecuritySettings((current) => ({
                      ...current,
                      loginAlert,
                    }))
                  }
                />
                <ToggleRow
                  icon={LockKeyhole}
                  title="导出审计记录"
                  description="导出知识库和账号数据时保留操作记录。"
                  checked={securitySettings.exportAudit}
                  onChange={(exportAudit) =>
                    setSecuritySettings((current) => ({
                      ...current,
                      exportAudit,
                    }))
                  }
                />
                <div className="rounded-[6px] border border-slate-200 bg-white p-4">
                  <div className="text-sm font-medium text-slate-900">
                    会话超时
                  </div>
                  <InlineSelect
                    label="自动退出时间"
                    value="24 小时"
                    options={["30 分钟", "2 小时", "24 小时", "7 天"]}
                    onChange={() => undefined}
                  />
                </div>
              </CardContent>
            </SectionCard>
            <SectionCard className="border-red-200 bg-red-50/20">
              <CardHeader>
                <CardTitle className="font-sans text-base text-red-700 normal-case tracking-normal">
                  危险操作
                </CardTitle>
                <CardDescription>
                  导出或删除账号数据前，请确认已经备份重要内容。
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button variant="outline" size="sm">
                  <Download data-icon="inline-start" />
                  导出数据
                </Button>
                <Button variant="destructive" size="sm">
                  <Trash2 data-icon="inline-start" />
                  删除账号
                </Button>
              </CardContent>
            </SectionCard>
          </div>
        )}

        {activeSection === "status" && (
          <SectionCard>
            <CardHeader>
              <CardTitle className="font-sans text-base normal-case tracking-normal">
                系统状态
              </CardTitle>
              <CardDescription>
                检查模型、数据库和文档解析服务的运行状态。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500">
                      <th className="py-3 font-medium">服务</th>
                      <th className="py-3 font-medium">状态</th>
                      <th className="py-3 font-medium">详情</th>
                      <th className="py-3 font-medium">最后检查时间</th>
                      <th className="py-3 text-right font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {systemStatusRows.map((row) => (
                      <tr
                        key={row.service}
                        className="border-b border-slate-100 last:border-b-0"
                      >
                        <td className="py-3 text-slate-700">{row.service}</td>
                        <td className="py-3">
                          <span className="inline-flex items-center gap-2 text-emerald-600">
                            <CheckCircle2 aria-hidden="true" />
                            {row.status}
                          </span>
                        </td>
                        <td className="max-w-[360px] py-3 text-slate-600">
                          {row.details}
                        </td>
                        <td className="py-3 text-slate-500">
                          {statusCheckedAt}
                        </td>
                        <td className="py-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label={`刷新 ${row.service}`}
                            onClick={refreshStatus}
                          >
                            <RefreshCw />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-end">
                <span>最后检查：{statusCheckedAt}</span>
                <Button type="button" variant="outline" size="sm" onClick={refreshStatus}>
                  <RefreshCw data-icon="inline-start" />
                  刷新状态
                </Button>
              </div>
            </CardContent>
          </SectionCard>
        )}
      </section>
    </div>
  );
}
