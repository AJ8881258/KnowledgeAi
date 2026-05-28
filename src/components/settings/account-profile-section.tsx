import { type FormEvent, useState } from "react";
import { Mail, Save, UserRound } from "lucide-react";

import type { CurrentUserResponse } from "@/api/auth";
import type { UserPreferenceResponse } from "@/api/settings";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CardAction,
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
} from "@/components/settings/settings-components";
import { PreferencesFields } from "@/components/settings/preferences-section";

type AccountProfileSectionProps = {
  user: CurrentUserResponse | null;
  loading: boolean;
  error: string;
  saving: boolean;
  preferences: UserPreferenceResponse | null;
  preferencesLoading: boolean;
  preferencesError: string;
  savingPreferences: boolean;
  browserTimezone: string;
  onRetry: () => void;
  onSave: (
    email: string | null,
    preferences: UserPreferenceResponse,
    changes: { emailChanged: boolean; preferencesChanged: boolean },
  ) => Promise<void>;
  onRetryPreferences: () => void;
  onLogout: () => void;
};

function validateEmail(email: string) {
  if (!email) {
    return "";
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? ""
    : "请输入有效的邮箱地址。";
}

function createPreferenceDraft(
  preferences: UserPreferenceResponse | null,
  browserTimezone: string,
): UserPreferenceResponse {
  return (
    preferences ?? {
      language: "zh-CN",
      timezone: browserTimezone,
    }
  );
}

export function AccountProfileSection({
  user,
  loading,
  error,
  saving,
  preferences,
  preferencesLoading,
  preferencesError,
  savingPreferences,
  browserTimezone,
  onRetry,
  onSave,
  onRetryPreferences,
  onLogout,
}: AccountProfileSectionProps) {
  const [emailDraft, setEmailDraft] = useState(() => user?.email ?? "");
  const [emailError, setEmailError] = useState("");
  const [preferenceDraftOverride, setPreferenceDraftOverride] =
    useState<UserPreferenceResponse | null>(null);
  const preferenceDraft =
    preferenceDraftOverride ?? createPreferenceDraft(preferences, browserTimezone);

  const normalizedEmail = emailDraft.trim();
  const initialEmail = user?.email ?? "";
  const emailChanged = normalizedEmail !== initialEmail;
  const preferencesChanged =
    !!preferences &&
    (preferenceDraft.language !== preferences.language ||
      preferenceDraft.timezone !== preferences.timezone);
  const isDirty = emailChanged || preferencesChanged;
  const isSavingProfile = saving || savingPreferences;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextError = validateEmail(normalizedEmail);
    setEmailError(nextError);

    if (nextError) {
      return;
    }

    await onSave(normalizedEmail || null, preferenceDraft, {
      emailChanged,
      preferencesChanged,
    });
  }

  return (
    <SectionCard>
      <CardHeader>
        <CardTitle className="font-sans text-base normal-case tracking-normal">
          账号资料
        </CardTitle>
        <CardDescription>
          从后端读取当前登录账号。邮箱会保存到当前用户资料，不包含邮箱验证流程。
        </CardDescription>
        <CardAction>
          <Button type="button" variant="outline" size="sm" onClick={onLogout}>
            <UserRound data-icon="inline-start" />
            退出登录
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {loading ? (
          <SettingsSkeleton rows={4} />
        ) : error ? (
          <SettingsErrorState message={error} onRetry={onRetry} />
        ) : user ? (
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Avatar className="size-16">
                <AvatarFallback>
                  {user.username.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="break-words text-base font-semibold text-slate-900">
                  {user.username}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <Mail aria-hidden="true" className="size-4" />
                  <span>{user.email || "尚未设置邮箱"}</span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <ReadonlyField label="用户名" value={user.username} />
              <ReadonlyField label="角色" value={user.role || "USER"} />
              <div className="min-w-0 rounded-[6px] border border-slate-200 bg-slate-50 px-3 py-2.5">
                <label
                  htmlFor="settings-email"
                  className="text-xs font-medium text-slate-500"
                >
                  邮箱
                </label>
                <Input
                  id="settings-email"
                  type="email"
                  value={emailDraft}
                  placeholder="name@example.com"
                  aria-invalid={Boolean(emailError)}
                  disabled={isSavingProfile}
                  onChange={(event) => {
                    setEmailDraft(event.target.value);
                    setEmailError("");
                  }}
                  className="mt-1 h-5 border-0 border-b-0 bg-transparent px-0 py-0 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus-visible:border-0 focus-visible:border-b-0 disabled:cursor-not-allowed disabled:opacity-70"
                />
                {emailError ? (
                  <p className="mt-1 text-xs leading-4 text-red-600">
                    {emailError}
                  </p>
                ) : null}
              </div>
              <div className="min-w-0 rounded-[6px] border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div className="text-xs font-medium text-slate-500">
                  语言和时区
                </div>
                <PreferencesFields
                  key={
                    preferences
                      ? `${preferences.language}-${preferences.timezone}-${browserTimezone}`
                      : `empty-preferences-${browserTimezone}`
                  }
                  preferences={preferences}
                  loading={preferencesLoading}
                  error={preferencesError}
                  saving={savingPreferences}
                  browserTimezone={browserTimezone}
                  onRetry={onRetryPreferences}
                  value={preferenceDraft}
                  onDraftChange={setPreferenceDraftOverride}
                  compact
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={!isDirty || isSavingProfile}>
                <Save data-icon="inline-start" />
                {isSavingProfile ? "保存中..." : "保存资料"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="rounded-[6px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            暂无账号资料，请重新登录后查看。
          </div>
        )}
      </CardContent>
    </SectionCard>
  );
}
