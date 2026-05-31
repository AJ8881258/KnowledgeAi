import { type ChangeEvent, type FormEvent, useRef, useState } from "react";
import { Mail, Save, Trash2, Upload, UserRound } from "lucide-react";

import type { CurrentUserResponse } from "@/api/auth";
import type { UserPreferenceResponse } from "@/api/settings";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  uploadingAvatar: boolean;
  deletingAvatar: boolean;
  preferences: UserPreferenceResponse | null;
  preferencesLoading: boolean;
  preferencesError: string;
  savingPreferences: boolean;
  browserTimezone: string;
  onRetry: () => void;
  onUploadAvatar: (file: File) => Promise<void>;
  onDeleteAvatar: () => Promise<void>;
  onSave: (
    email: string | null,
    preferences: UserPreferenceResponse,
    changes: { emailChanged: boolean; preferencesChanged: boolean },
  ) => Promise<void>;
  onRetryPreferences: () => void;
  onLogout: () => void;
};

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function validateEmail(email: string) {
  if (!email) {
    return "";
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? ""
    : "请输入有效的邮箱地址。";
}

function validateAvatarFile(file: File) {
  if (!AVATAR_ACCEPTED_TYPES.includes(file.type)) {
    return "请选择 JPEG、PNG 或 WebP 图片。";
  }

  if (file.size > AVATAR_MAX_BYTES) {
    return "头像图片不能超过 2MB。";
  }

  return "";
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
  uploadingAvatar,
  deletingAvatar,
  preferences,
  preferencesLoading,
  preferencesError,
  savingPreferences,
  browserTimezone,
  onRetry,
  onUploadAvatar,
  onDeleteAvatar,
  onSave,
  onRetryPreferences,
  onLogout,
}: AccountProfileSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [emailDraft, setEmailDraft] = useState(() => user?.email ?? "");
  const [emailError, setEmailError] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarError, setAvatarError] = useState("");
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
  const avatarBusy = uploadingAvatar || deletingAvatar;
  const canDeleteAvatar = Boolean(user?.avatarConfigured || user?.avatarUrl);

  function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    setAvatarError("");

    if (!file) {
      setAvatarFile(null);
      return;
    }

    const nextError = validateAvatarFile(file);

    if (nextError) {
      setAvatarFile(null);
      setAvatarError(nextError);
      event.target.value = "";
      return;
    }

    setAvatarFile(file);
  }

  async function handleAvatarUpload() {
    if (!avatarFile) {
      setAvatarError("请先选择头像图片。");
      return;
    }

    const nextError = validateAvatarFile(avatarFile);
    setAvatarError(nextError);

    if (nextError) {
      return;
    }

    try {
      await onUploadAvatar(avatarFile);
      setAvatarFile(null);
      setAvatarError("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (uploadError) {
      setAvatarError(
        uploadError instanceof Error
          ? uploadError.message
          : "头像上传失败，请稍后重试。",
      );
    }
  }

  async function handleAvatarDelete() {
    setAvatarError("");

    try {
      await onDeleteAvatar();
      setAvatarFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (deleteError) {
      setAvatarError(
        deleteError instanceof Error
          ? deleteError.message
          : "头像删除失败，请稍后重试。",
      );
    }
  }

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
                {user.avatarUrl ? (
                  <AvatarImage src={user.avatarUrl} alt={`${user.username} 头像`} />
                ) : null}
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
              <div className="mt-3 flex flex-wrap items-center gap-2 sm:ml-20">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={avatarBusy}
                  onChange={handleAvatarFileChange}
                  className="h-8 max-w-72 cursor-pointer rounded-[6px] border-slate-200 bg-white px-2 py-1 text-xs file:mr-3 file:rounded-[5px] file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={!avatarFile || avatarBusy}
                  onClick={handleAvatarUpload}
                >
                  <Upload data-icon="inline-start" />
                  {uploadingAvatar ? "上传中..." : "上传头像"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!canDeleteAvatar || avatarBusy}
                  onClick={handleAvatarDelete}
                >
                  <Trash2 data-icon="inline-start" />
                  {deletingAvatar ? "删除中..." : "删除头像"}
                </Button>
              </div>
              {avatarFile ? (
                <p className="mt-2 text-xs leading-4 text-slate-500 sm:ml-20">
                  已选择：{avatarFile.name}
                </p>
              ) : null}
              {avatarError ? (
                <p className="mt-2 text-xs leading-4 text-red-600 sm:ml-20">
                  {avatarError}
                </p>
              ) : null}
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
