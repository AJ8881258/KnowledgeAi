import { type FormEvent, useMemo, useState } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  Loader2,
  RefreshCw,
  Save,
} from "lucide-react";

import {
  type FetchModelListRequest,
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SectionCard,
  SettingsErrorState,
  SettingsSkeleton,
  StatusPill,
  TextField,
} from "@/components/settings/settings-components";

const DEFAULT_TIMEOUT_SECONDS = 60;
const MANUAL_MODEL_VALUE = "__manual__";

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
  modelOptions: ModelListItem[];
  modelFetchError: string;
  onRetry: () => void;
  onFetchModels: (request: FetchModelListRequest) => Promise<void>;
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
    return "首次保存模型配置时需要填写 API Key。";
  }

  return "";
}

function getModelSelectValue(draftModel: string, modelOptions: ModelListItem[]) {
  if (!draftModel) {
    return "";
  }

  return modelOptions.some((model) => model.id === draftModel)
    ? draftModel
    : MANUAL_MODEL_VALUE;
}

export function ModelSettingsSection({
  settings,
  loading,
  error,
  saving,
  fetchingModels,
  modelOptions,
  modelFetchError,
  onRetry,
  onFetchModels,
  onSave,
}: ModelSettingsSectionProps) {
  const [draft, setDraft] = useState<ModelSettingsDraft>(() =>
    createDraft(settings),
  );
  const [showApiKey, setShowApiKey] = useState(false);
  const [formError, setFormError] = useState("");
  const modelSelectValue = useMemo(
    () => getModelSelectValue(draft.model, modelOptions),
    [draft.model, modelOptions],
  );

  function updateDraft(key: keyof ModelSettingsDraft, value: string) {
    setDraft((current) => {
      return {
        ...current,
        [key]: value,
      };
    });
    setFormError("");
  }

  async function handleFetchModels() {
    const baseUrl = normalizeUrl(draft.baseUrl || settings?.baseUrl || "");
    const apiKey = draft.apiKey.trim();

    if (!baseUrl) {
      setFormError("请先填写 Base URL。");
      return;
    }

    if (!apiKey && !settings?.apiKeyConfigured) {
      setFormError("获取模型列表需要填写本次使用的 API Key。");
      return;
    }

    await onFetchModels(apiKey ? { baseUrl, apiKey } : { baseUrl });
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
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
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

            <div className="grid gap-4 lg:grid-cols-2">
              <TextField
                id="model-base-url"
                label="Base URL"
                value={draft.baseUrl}
                placeholder="https://api.openai.com/v1"
                disabled={saving || fetchingModels}
                error={formError.includes("Base URL") ? formError : undefined}
                helpText={
                  settings.baseUrlConfigured
                    ? "填写 OpenAI-compatible 根地址，例如 https://api.openai.com/v1；不要填写完整 /chat/completions。已保存的 Base URL 会回显，重新填写会覆盖保存。"
                    : "填写 OpenAI-compatible 根地址，例如 https://api.openai.com/v1；不要填写完整 /chat/completions。"
                }
                onChange={(value) => updateDraft("baseUrl", value)}
              />

              <TextField
                id="model-api-key"
                label="API Key"
                type={showApiKey ? "text" : "password"}
                value={draft.apiKey}
                placeholder={
                  settings.apiKeyConfigured
                    ? "已保存，可重新填写覆盖"
                    : "填写 API Key"
                }
                disabled={saving || fetchingModels}
                error={formError.includes("API Key") ? formError : undefined}
                helpText="不填写时不会覆盖已保存 Key；不会写入组件级 localStorage。"
                onChange={(value) => updateDraft("apiKey", value)}
                action={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={showApiKey ? "隐藏 API Key" : "显示 API Key"}
                    className="ml-2 rounded-[5px] text-slate-500 hover:bg-slate-100"
                    disabled={saving || fetchingModels || !draft.apiKey}
                    onClick={() => setShowApiKey((current) => !current)}
                  >
                    {showApiKey ? <EyeOff /> : <Eye />}
                  </Button>
                }
              />

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="model-select"
                  className="text-sm font-normal text-slate-700"
                >
                  Chat Model
                </label>
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                  <Select
                    value={modelSelectValue}
                    disabled={saving || fetchingModels || modelOptions.length === 0}
                    onValueChange={(value) => {
                      if (value !== MANUAL_MODEL_VALUE) {
                        updateDraft("model", value);
                      }
                    }}
                  >
                    <SelectTrigger
                      id="model-select"
                      className="h-10 min-w-0 flex-1 rounded-[5px] border border-slate-200 bg-white px-3 text-sm normal-case tracking-normal text-slate-700 focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100"
                    >
                      <SelectValue
                        placeholder={
                          modelOptions.length > 0
                            ? "请选择模型"
                            : "先获取模型列表"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-w-[min(420px,90vw)]">
                      <SelectGroup>
                        {draft.model && modelSelectValue === MANUAL_MODEL_VALUE && (
                          <SelectItem value={MANUAL_MODEL_VALUE}>
                            {draft.model}
                          </SelectItem>
                        )}
                        {modelOptions.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <span className="min-w-0 truncate">
                              {model.name || model.id}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 shrink-0 rounded-[6px] tracking-normal normal-case"
                    disabled={saving || fetchingModels}
                    onClick={() => void handleFetchModels()}
                  >
                    {fetchingModels ? (
                      <Loader2 data-icon="inline-start" className="animate-spin" />
                    ) : (
                      <RefreshCw data-icon="inline-start" />
                    )}
                    获取模型列表
                  </Button>
                </div>
                <TextField
                  id="model-name"
                  label="手动模型名称"
                  value={draft.model}
                  placeholder="gpt-4.1-mini"
                  disabled={saving}
                  error={formError.includes("模型") ? formError : undefined}
                  helpText={
                    modelFetchError ||
                    "可从模型列表选择，也可以手动输入兼容服务返回的模型 ID。"
                  }
                  onChange={(value) => updateDraft("model", value)}
                />
              </div>

              <TextField
                id="model-timeout"
                label="超时时间（秒）"
                type="number"
                value={draft.timeoutSeconds}
                placeholder="60"
                disabled={saving}
                error={formError.includes("超时") ? formError : undefined}
                helpText="允许范围 1-300 秒。"
                onChange={(value) => updateDraft("timeoutSeconds", value)}
              />
            </div>

            {(formError || modelFetchError) && (
              <div
                role="alert"
                className="rounded-[6px] border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700"
              >
                {formError || modelFetchError}
              </div>
            )}

            <div className="flex items-start gap-3 rounded-[6px] border border-blue-100 bg-blue-50/70 p-3 text-sm text-blue-800">
              <Info className="mt-0.5 size-4 shrink-0" />
              <p className="min-w-0 leading-5">
                保存成功只表示配置已写入后端，不代表模型调用一定可用。进入 Chat 前请先获取模型列表，确认 Base URL、API Key 和模型权限可用；后续如启用测试连接，以测试通过为准。
              </p>
            </div>

            <div className="flex flex-col gap-3 rounded-[6px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <span className="inline-flex min-w-0 items-center gap-2">
                {settings.configured ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                ) : (
                  <KeyRound className="size-4 shrink-0 text-orange-500" />
                )}
                <span>
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
              <Button type="submit" size="sm" disabled={saving || fetchingModels}>
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
