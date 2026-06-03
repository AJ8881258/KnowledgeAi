import { type FormEvent, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
  ShieldX,
} from "lucide-react";

import {
  type FetchModelListRequest,
  type ModelConnectionTestRequest,
  type ModelConnectionTestResponse,
  type ModelListItem,
  type ModelSettingsResponse,
  type UpdateModelSettingsRequest,
} from "@/api/settings";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  SectionCard,
  SettingsErrorState,
  SettingsSkeleton,
  StatusPill,
  TextField,
} from "@/components/settings/settings-components";

const DEFAULT_TIMEOUT_SECONDS = 60;

type ModelSettingsDraft = {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutSeconds: string;
};

type ModelSettingsSectionProps = {
  settings: ModelSettingsResponse | null;
  loading: boolean;
  error: string;
  saving: boolean;
  fetchingModels: boolean;
  testingModel: boolean;
  modelOptions: ModelListItem[];
  modelFetchError: string;
  onRetry: () => void;
  onFetchModels: (request: FetchModelListRequest) => Promise<void>;
  onTestModel: (
    request: ModelConnectionTestRequest,
  ) => Promise<ModelConnectionTestResponse | null>;
  onSave: (request: UpdateModelSettingsRequest) => Promise<boolean>;
};

function createDraft(settings: ModelSettingsResponse | null): ModelSettingsDraft {
  return {
    baseUrl: settings?.baseUrl ?? "",
    apiKey: "",
    model: settings?.model ?? "",
    timeoutSeconds: String(settings?.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS),
  };
}

function normalizeUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function normalizeTimeout(value: string) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return Math.round(parsedValue);
}

function validateDraft(
  draft: ModelSettingsDraft,
  settings: ModelSettingsResponse | null,
) {
  const baseUrl = normalizeUrl(draft.baseUrl);
  const model = draft.model.trim();
  const timeoutSeconds = normalizeTimeout(draft.timeoutSeconds);

  if (!baseUrl) {
    return "请输入 Base URL。";
  }

  if (!model) {
    return "请选择或输入模型名称。";
  }

  if (!timeoutSeconds || timeoutSeconds < 1 || timeoutSeconds > 300) {
    return "超时时间必须在 1 到 300 秒之间。";
  }

  if (!draft.apiKey.trim() && !settings?.apiKeyConfigured) {
    return "首次保存或测试模型配置时需要填写 API Key。";
  }

  return "";
}

export function ModelSettingsSection({
  settings,
  loading,
  error,
  saving,
  fetchingModels,
  testingModel,
  modelOptions,
  modelFetchError,
  onRetry,
  onFetchModels,
  onTestModel,
  onSave,
}: ModelSettingsSectionProps) {
  const [draft, setDraft] = useState<ModelSettingsDraft>(() =>
    createDraft(settings),
  );
  const [showApiKey, setShowApiKey] = useState(false);
  const [formError, setFormError] = useState("");
  const [testResult, setTestResult] =
    useState<ModelConnectionTestResponse | null>(null);

  function updateDraft(key: keyof ModelSettingsDraft, value: string) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
    setFormError("");
    setTestResult(null);
  }

  async function handleFetchModels() {
    const baseUrl = normalizeUrl(draft.baseUrl || settings?.baseUrl || "");
    const apiKey = draft.apiKey.trim();
    const request: FetchModelListRequest = {};

    if (baseUrl) {
      request.baseUrl = baseUrl;
    }

    if (apiKey) {
      request.apiKey = apiKey;
    }

    if (!baseUrl && !settings?.baseUrlConfigured) {
      setFormError("请先填写 Base URL。");
      return;
    }

    if (!apiKey && !settings?.apiKeyConfigured) {
      setFormError("获取模型列表需要填写本次使用的 API Key。");
      return;
    }

    await onFetchModels(request);
  }

  async function handleTestModel() {
    const validationError = validateDraft(draft, settings);

    if (validationError) {
      setFormError(validationError);
      setTestResult(null);
      return;
    }

    const apiKey = draft.apiKey.trim();
    const request: ModelConnectionTestRequest = {
      baseUrl: normalizeUrl(draft.baseUrl),
      model: draft.model.trim(),
    };

    if (apiKey) {
      request.apiKey = apiKey;
    }

    const result = await onTestModel(request);

    setTestResult(result);
    setFormError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateDraft(draft, settings);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    const apiKey = draft.apiKey.trim();
    const request: UpdateModelSettingsRequest = {
      baseUrl: normalizeUrl(draft.baseUrl),
      model: draft.model.trim(),
      timeoutSeconds: normalizeTimeout(draft.timeoutSeconds) ?? DEFAULT_TIMEOUT_SECONDS,
    };

    if (apiKey) {
      request.apiKey = apiKey;
    }

    const saved = await onSave(request);

    if (saved) {
      setDraft((current) => ({
        ...current,
        baseUrl: request.baseUrl,
        apiKey: "",
      }));
      setShowApiKey(false);
    }
  }

  return (
    <SectionCard>
      <CardHeader>
        <CardTitle className="font-sans text-base normal-case tracking-normal">
          模型配置
        </CardTitle>
        <CardDescription>
          保存当前用户的 OpenAI-compatible 配置。API Key 只会提交给后端加密保存，已保存的 Key 不会明文回显。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {loading ? (
          <SettingsSkeleton rows={6} />
        ) : error ? (
          <SettingsErrorState message={error} onRetry={onRetry} />
        ) : settings ? (
          <form className="flex min-w-0 flex-col gap-5" onSubmit={handleSubmit}>
            <div className="flex flex-wrap gap-2">
              <StatusPill
                status={settings.configured ? "配置已保存" : "需要补齐配置"}
                tone={settings.configured ? "blue" : "orange"}
              />
              <StatusPill
                status={settings.apiKeyConfigured ? "API Key 已保存" : "API Key 未保存"}
                tone={settings.apiKeyConfigured ? "blue" : "slate"}
              />
            </div>

            <div className="grid min-w-0 gap-4 lg:grid-cols-2">
              <TextField
                id="model-base-url"
                label="Base URL"
                value={draft.baseUrl}
                placeholder="https://api.openai.com/v1"
                disabled={saving || fetchingModels || testingModel}
                error={formError.includes("Base URL") ? formError : undefined}
                helpText={
                  settings.baseUrlConfigured
                    ? "Base URL 会回显；重新填写会覆盖已保存地址。"
                    : "填写 OpenAI-compatible 根地址，例如 https://api.openai.com/v1。"
                }
                onChange={(value) => updateDraft("baseUrl", value)}
              />

              <TextField
                id="model-api-key"
                label="API Key"
                type={showApiKey ? "text" : "password"}
                value={draft.apiKey}
                placeholder={
                  settings.apiKeyConfigured ? "已保存，可重新填写覆盖" : "填写 API Key"
                }
                disabled={saving || fetchingModels || testingModel}
                error={formError.includes("API Key") ? formError : undefined}
                helpText="不填写时不会覆盖已保存 Key；获取模型列表和测试模型可复用已保存 Key。"
                onChange={(value) => updateDraft("apiKey", value)}
                action={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={showApiKey ? "隐藏 API Key" : "显示 API Key"}
                    className="ml-2 rounded-[5px] text-slate-500 hover:bg-slate-100"
                    disabled={
                      saving || fetchingModels || testingModel || !draft.apiKey
                    }
                    onClick={() => setShowApiKey((current) => !current)}
                  >
                    {showApiKey ? <EyeOff /> : <Eye />}
                  </Button>
                }
              />

              <div className="flex min-w-0 flex-col gap-2">
                <label
                  htmlFor="model-name"
                  className="text-sm font-medium text-slate-700"
                >
                  Chat Model
                </label>
                <div className="flex min-w-0 rounded-[6px] border border-slate-200 bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                  <Input
                    id="model-name"
                    value={draft.model}
                    placeholder="gpt-4.1-mini"
                    disabled={saving || testingModel}
                    aria-invalid={formError.includes("模型")}
                    className="h-10 min-w-0 flex-1 rounded-[6px] border-0 bg-transparent px-3 text-sm shadow-none focus-visible:ring-0"
                    onChange={(event) => updateDraft("model", event.target.value)}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="h-10 w-10 shrink-0 rounded-[6px] text-slate-500 hover:bg-slate-100"
                        disabled={
                          saving ||
                          fetchingModels ||
                          testingModel ||
                          modelOptions.length === 0
                        }
                        aria-label="选择模型"
                        title={
                          modelOptions.length > 0
                            ? "从已获取的模型列表中选择"
                            : "请先获取模型列表，或直接手动输入模型 ID"
                        }
                      >
                        <ChevronDown className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="max-h-72 w-72 overflow-auto rounded-[8px]"
                    >
                      <DropdownMenuGroup>
                        {modelOptions.map((model) => {
                          const label = model.name || model.id;

                          return (
                            <DropdownMenuItem
                              key={model.id}
                              title={label}
                              className="cursor-pointer gap-2"
                              onSelect={() => updateDraft("model", model.id)}
                            >
                              <Check
                                className={
                                  draft.model === model.id
                                    ? "size-4 opacity-100"
                                    : "size-4 opacity-0"
                                }
                              />
                              <span className="min-w-0 truncate">{label}</span>
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p
                  className={
                    formError.includes("模型")
                      ? "text-xs leading-5 text-orange-600"
                      : "text-xs leading-5 text-slate-500"
                  }
                >
                  {formError.includes("模型")
                    ? formError
                    : modelFetchError ||
                      "可手动输入模型 ID；获取模型列表后也可通过右侧下拉按钮选择。"}
                </p>
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 min-w-0 rounded-[6px] normal-case tracking-normal sm:w-auto"
                    disabled={saving || fetchingModels || testingModel}
                    onClick={() => void handleFetchModels()}
                  >
                    {fetchingModels ? (
                      <Loader2 data-icon="inline-start" className="animate-spin" />
                    ) : (
                      <RefreshCw data-icon="inline-start" />
                    )}
                    获取模型列表
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 min-w-0 rounded-[6px] normal-case tracking-normal sm:w-auto"
                    disabled={saving || fetchingModels || testingModel}
                    onClick={() => void handleTestModel()}
                  >
                    {testingModel ? (
                      <Loader2 data-icon="inline-start" className="animate-spin" />
                    ) : (
                      <ShieldCheck data-icon="inline-start" />
                    )}
                    测试模型
                  </Button>
                </div>
              </div>

              <TextField
                id="model-timeout"
                label="超时时间（秒）"
                type="number"
                value={draft.timeoutSeconds}
                placeholder="60"
                disabled={saving || testingModel}
                error={formError.includes("超时") ? formError : undefined}
                helpText="允许范围 1-300 秒。"
                onChange={(value) => updateDraft("timeoutSeconds", value)}
              />
            </div>

            {(formError || modelFetchError || testResult) && (
              <div
                role="alert"
                className={
                  testResult?.success
                    ? "flex min-w-0 items-start gap-2 rounded-[6px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
                    : "flex min-w-0 items-start gap-2 rounded-[6px] border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700"
                }
              >
                {testResult?.success ? (
                  <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                ) : (
                  <ShieldX className="mt-0.5 size-4 shrink-0" />
                )}
                <span className="min-w-0 break-words">
                  {testResult?.message || formError || modelFetchError}
                </span>
              </div>
            )}

            <div className="flex min-w-0 flex-col gap-3 rounded-[6px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <span className="inline-flex min-w-0 items-center gap-2">
                {settings.configured ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                ) : (
                  <KeyRound className="size-4 shrink-0 text-orange-500" />
                )}
                <span className="min-w-0 break-words">
                  {settings.configured
                    ? `当前已保存模型：${settings.model}`
                    : "保存 Base URL、API Key、模型和超时时间后，Chat 将优先使用当前用户配置。"}
                </span>
              </span>
              {settings.updatedAt && (
                <span className="shrink-0 text-xs text-slate-500">
                  更新于 {new Date(settings.updatedAt).toLocaleString("zh-CN")}
                </span>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={saving || fetchingModels || testingModel}
              >
                {saving ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <Save data-icon="inline-start" />
                )}
                保存模型配置
              </Button>
            </div>
          </form>
        ) : (
          <div className="rounded-[6px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            后端暂未返回模型配置状态。
          </div>
        )}
      </CardContent>
    </SectionCard>
  );
}
