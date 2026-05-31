import { type FormEvent, useState } from "react";
import { Save, SlidersHorizontal } from "lucide-react";

import type { RagRetrievalMode, RagSettingsResponse } from "@/api/settings";
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
  SettingsSelect,
  SettingsSkeleton,
  StatusPill,
} from "@/components/settings/settings-components";
import {
  clampNumber,
  normalizeRagSettings,
  ragControlConfig,
  ragRetrievalModes,
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

  const normalizedLeft = normalizeRagSettings(left);
  const normalizedRight = normalizeRagSettings(right);

  return (
    normalizedLeft.topK === normalizedRight.topK &&
    normalizedLeft.maxContextChunks === normalizedRight.maxContextChunks &&
    normalizedLeft.temperature === normalizedRight.temperature &&
    normalizedLeft.retrievalMode === normalizedRight.retrievalMode &&
    normalizedLeft.semanticWeight === normalizedRight.semanticWeight &&
    normalizedLeft.fulltextWeight === normalizedRight.fulltextWeight
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
  const normalizedSettings = normalizeRagSettings(settings);
  const [syncedSettings, setSyncedSettings] =
    useState<RagSettingsResponse | null>(settings);
  const [draftSettings, setDraftSettings] =
    useState<RagSettingsResponse>(() => normalizedSettings);

  if (settings !== syncedSettings) {
    setSyncedSettings(settings);
    setDraftSettings(normalizedSettings);
  }

  const isDirty = !areSameSettings(settings, draftSettings);
  const retrievalModeHelper =
    ragRetrievalModes.find((mode) => mode.value === draftSettings.retrievalMode)
      ?.helper ?? "";

  function updateRagValue(key: RagNumberKey, value: number) {
    const config = ragControlConfig[key];
    const nextValue = clampNumber(value, config.min, config.max);
    const normalizedValue =
      key === "temperature"
        ? Number(nextValue.toFixed(1))
        : Math.round(nextValue);

    setDraftSettings((current) => ({
      ...current,
      [key]: normalizedValue,
    }));
  }

  function updateRetrievalMode(value: string) {
    const retrievalMode: RagRetrievalMode =
      value === "FULLTEXT" ? "FULLTEXT" : "HYBRID";

    setDraftSettings((current) =>
      normalizeRagSettings({
        ...current,
        retrievalMode,
        semanticWeight:
          retrievalMode === "FULLTEXT"
            ? 0
            : current.semanticWeight || 0.7,
      }),
    );
  }

  function updateSemanticWeight(value: number) {
    setDraftSettings((current) =>
      normalizeRagSettings({
        ...current,
        semanticWeight: clampNumber(value, 0, 1),
      }),
    );
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
          <SettingsSkeleton rows={5} />
        ) : error ? (
          <SettingsErrorState message={error} onRetry={onRetry} />
        ) : settings ? (
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <div className="flex flex-wrap gap-2">
              <StatusPill status="Chat/RAG 会读取这些参数" tone="blue" />
            </div>

            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <div className="flex flex-col gap-2">
                <SettingsSelect
                  label="检索策略"
                  value={draftSettings.retrievalMode}
                  options={ragRetrievalModes.map((mode) => mode.value)}
                  disabled={saving}
                  onChange={updateRetrievalMode}
                />
                <p className="text-xs leading-5 text-slate-500">
                  {retrievalModeHelper}
                </p>
              </div>
              <RagControl
                label="语义权重"
                helper="控制混合检索中语义向量得分的占比；全文权重会自动按 1 - 语义权重派生。"
                value={draftSettings.semanticWeight}
                min={0}
                max={1}
                step={0.05}
                disabled={saving || draftSettings.retrievalMode === "FULLTEXT"}
                onChange={updateSemanticWeight}
              />
            </div>

            <div className="grid gap-3 text-xs text-slate-600 md:grid-cols-3">
              <div className="rounded-[6px] border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="font-medium text-slate-500">当前策略</div>
                <div className="mt-1 font-semibold text-slate-900">
                  {draftSettings.retrievalMode}
                </div>
              </div>
              <div className="rounded-[6px] border border-blue-200 bg-blue-50 px-3 py-2">
                <div className="font-medium text-blue-700">语义权重</div>
                <div className="mt-1 font-semibold text-blue-900">
                  {draftSettings.semanticWeight.toFixed(2)}
                </div>
              </div>
              <div className="rounded-[6px] border border-slate-200 bg-white px-3 py-2">
                <div className="font-medium text-slate-500">全文权重</div>
                <div className="mt-1 font-semibold text-slate-900">
                  {draftSettings.fulltextWeight.toFixed(2)}
                </div>
              </div>
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
                  旧版本地草稿字段已移除。本区只保留后端当前实际支持，并会在
                  RAG 问答中生效的参数。
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
