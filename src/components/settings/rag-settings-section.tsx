import { type FormEvent, useState } from "react";
import { Save, SlidersHorizontal } from "lucide-react";

import type { RagSettingsResponse } from "@/api/settings";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  RagControl,
  SectionCard,
  SettingsErrorState,
  SettingsSkeleton,
  StatusPill,
} from "@/components/settings/settings-components";
import {
  clampNumber,
  normalizeRagSettings,
  ragControlConfig,
  toUpdateRagSettingsRequest,
  type RagNumberKey,
} from "@/components/settings/settings-rag";

type RagSettingsSectionProps = {
  settings: RagSettingsResponse | null;
  loading: boolean;
  error: string;
  saving: boolean;
  onRetry: () => void;
  onSave: (settings: RagSettingsResponse) => Promise<void>;
};

function areSameSettings(
  left: RagSettingsResponse | null,
  right: RagSettingsResponse,
) {
  if (!left) {
    return false;
  }

  return (
    left.topK === right.topK &&
    left.maxContextChunks === right.maxContextChunks &&
    left.temperature === right.temperature
  );
}

export function RagSettingsSection({
  settings,
  loading,
  error,
  saving,
  onRetry,
  onSave,
}: RagSettingsSectionProps) {
  const [draftSettings, setDraftSettings] =
    useState<RagSettingsResponse>(() => normalizeRagSettings(settings));

  const isDirty = !areSameSettings(settings, draftSettings);

  function updateRagValue(key: RagNumberKey, value: number) {
    const config = ragControlConfig[key];
    const nextValue = clampNumber(value, config.min, config.max);
    const normalizedValue =
      key === "temperature" ? Number(nextValue.toFixed(1)) : Math.round(nextValue);

    setDraftSettings((current) => ({
      ...current,
      [key]: normalizedValue,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave(normalizeRagSettings(toUpdateRagSettingsRequest(draftSettings)));
  }

  return (
    <SectionCard>
      <CardHeader>
        <CardTitle className="font-sans text-base normal-case tracking-normal">
          RAG 参数
        </CardTitle>
        <CardDescription>
          这些参数保存到后端用户级配置，后续 Chat/RAG 问答会读取并使用。
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <SettingsSkeleton rows={4} />
        ) : error ? (
          <SettingsErrorState message={error} onRetry={onRetry} />
        ) : settings ? (
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <div className="flex flex-wrap gap-2">
              <StatusPill status="Chat/RAG 会读取这些参数" tone="blue" />
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {(
                ["topK", "maxContextChunks", "temperature"] as RagNumberKey[]
              ).map((key) => (
                <RagControl
                  key={key}
                  label={ragControlConfig[key].label}
                  helper={ragControlConfig[key].helper}
                  value={draftSettings[key]}
                  min={ragControlConfig[key].min}
                  max={ragControlConfig[key].max}
                  step={ragControlConfig[key].step}
                  disabled={saving}
                  onChange={(value) => updateRagValue(key, value)}
                />
              ))}
            </div>

            <div className="rounded-[6px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-2 text-sm text-slate-700">
                <SlidersHorizontal
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-blue-600"
                />
                <span>
                  旧版前端本地草稿字段已移除。本区只保留后端当前实际支持并会在 RAG 问答中生效的参数。
                </span>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={!isDirty || saving}>
                <Save data-icon="inline-start" />
                {saving ? "保存中..." : "保存 RAG 参数"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="rounded-[6px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            后端暂未返回 RAG 参数。
          </div>
        )}
      </CardContent>
    </SectionCard>
  );
}
