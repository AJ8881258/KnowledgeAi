import { Bot, CheckCircle2, CircleAlert, KeyRound, Server } from "lucide-react";

import type { ModelSettingsResponse } from "@/api/settings";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ReadonlyField,
  SectionCard,
  SettingsErrorState,
  SettingsSkeleton,
  StatusPill,
} from "@/components/settings/settings-components";

type ModelSettingsSectionProps = {
  settings: ModelSettingsResponse | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
};

function formatMode(mode: string) {
  return mode === "ENVIRONMENT" ? "后端环境变量" : mode || "未返回";
}

export function ModelSettingsSection({
  settings,
  loading,
  error,
  onRetry,
}: ModelSettingsSectionProps) {
  const isEnvironmentManaged = settings?.mode === "ENVIRONMENT";

  return (
    <SectionCard>
      <CardHeader>
        <CardTitle className="font-sans text-base normal-case tracking-normal">
          模型配置状态
        </CardTitle>
        <CardDescription>
          只展示后端返回的脱敏配置状态。前端不保存模型密钥，也不展示 API Key 或 Base URL 明文。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {loading ? (
          <SettingsSkeleton rows={4} />
        ) : error ? (
          <SettingsErrorState message={error} onRetry={onRetry} />
        ) : settings ? (
          <>
            <div className="flex flex-wrap gap-2">
              <StatusPill
                status={settings.configured ? "模型可用" : "模型未完整配置"}
                tone={settings.configured ? "green" : "orange"}
              />
              <StatusPill
                status={
                  isEnvironmentManaged
                    ? "由后端环境变量管理"
                    : "当前页面只读展示"
                }
                tone="blue"
              />
            </div>

            {!settings.configured && (
              <div className="flex items-start gap-2 rounded-[6px] border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
                <CircleAlert
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0"
                />
                <span>
                  模型未完整配置，Chat 发送问题时可能返回模型调用错误。请在后端环境变量中补齐配置。
                </span>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <ReadonlyField
                label="Chat Model"
                value={settings.model || "未配置"}
              />
              <ReadonlyField label="配置模式" value={formatMode(settings.mode)} />
              <ReadonlyField
                label="请求超时"
                value={
                  settings.timeoutSeconds
                    ? `${settings.timeoutSeconds} 秒`
                    : "未返回"
                }
              />
              <ReadonlyField
                label="Base URL"
                value={
                  <span className="inline-flex items-center gap-2">
                    <Server aria-hidden="true" className="size-4" />
                    {settings.baseUrlConfigured ? "已配置" : "未配置"}
                  </span>
                }
              />
              <ReadonlyField
                label="API Key"
                value={
                  <span className="inline-flex items-center gap-2">
                    <KeyRound aria-hidden="true" className="size-4" />
                    {settings.apiKeyConfigured ? "已配置，前端不可见" : "未配置"}
                  </span>
                }
              />
              <ReadonlyField
                label="保存入口"
                value={
                  <span className="inline-flex items-center gap-2">
                    {settings.editable && !isEnvironmentManaged ? (
                      <Bot aria-hidden="true" className="size-4" />
                    ) : (
                      <CheckCircle2 aria-hidden="true" className="size-4" />
                    )}
                    本阶段只读展示
                  </span>
                }
              />
            </div>
          </>
        ) : (
          <div className="rounded-[6px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            后端暂未返回模型配置状态。
          </div>
        )}
      </CardContent>
    </SectionCard>
  );
}
