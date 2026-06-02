import { type ChangeEvent, type FormEvent, useRef, useState } from "react";
import { Edit3, Mail, Phone, Save, UserRound } from "lucide-react";

import type {
  CurrentUserResponse,
  DefaultAvatarPresetId,
  UpdateCurrentUserRequest,
} from "@/api/auth";
import type { UserPreferenceResponse } from "@/api/settings";
import {
  AvatarPresetPicker,
  UserAvatar,
} from "@/components/user-avatar";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ReadonlyField,
  SectionCard,
  SettingsErrorState,
  SettingsSelect,
  SettingsSkeleton,
  TextField,
} from "@/components/settings/settings-components";
import { getTimezoneOptions } from "@/components/settings/timezone-options";

type AccountProfileSectionProps = {
  user: CurrentUserResponse | null;
  loading: boolean;
  error: string;
  savingProfile: boolean;
  savingAvatar: boolean;
  uploadingAvatar: boolean;
  savingPreferences: boolean;
  preferences: UserPreferenceResponse | null;
  preferencesLoading: boolean;
  preferencesError: string;
  browserTimezone: string;
  onRetry: () => void;
  onSaveProfile: (request: UpdateCurrentUserRequest) => Promise<void>;
  onSaveTimezone: (timezone: string) => Promise<void>;
  onUploadAvatar: (file: File) => Promise<void>;
  onSelectAvatarPreset: (presetId: DefaultAvatarPresetId) => Promise<void>;
  onRetryPreferences: () => void;
  onLogout: () => void;
};

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_ACCOUNT_NAME_LENGTH = 100;
const MIN_PHONE_LENGTH = 5;
const MAX_PHONE_LENGTH = 32;
const MIN_PHONE_DIGIT_COUNT = 5;
const PHONE_ALLOWED_PATTERN = /^[0-9 +\-()]+$/;

function getInitialPresetSelection(user: CurrentUserResponse | null) {
  if (!user || user.avatarSource === "NONE") {
    return "blue";
  }

  if (user.avatarSource === "PRESET") {
    return user.avatarPresetId ?? "blue";
  }

  return null;
}

function validateUsername(username: string) {
  const normalizedUsername = username.trim();

  if (!normalizedUsername) {
    return "请输入用户名。";
  }

  if (normalizedUsername.length > MAX_ACCOUNT_NAME_LENGTH) {
    return `用户名不能超过 ${MAX_ACCOUNT_NAME_LENGTH} 个字符。`;
  }

  return "";
}

function validateEmail(email: string) {
  const normalizedEmail = email.trim();

  if (!normalizedEmail) {
    return "";
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ? ""
    : "请输入有效的邮箱地址。";
}

function validatePhone(phone: string) {
  const normalizedPhone = phone.trim();

  if (!normalizedPhone) {
    return "";
  }

  if (
    normalizedPhone.length < MIN_PHONE_LENGTH ||
    normalizedPhone.length > MAX_PHONE_LENGTH
  ) {
    return `联系方式长度需为 ${MIN_PHONE_LENGTH}-${MAX_PHONE_LENGTH} 个字符。`;
  }

  if (!PHONE_ALLOWED_PATTERN.test(normalizedPhone)) {
    return "联系方式只能包含数字、普通空格、+、- 和英文括号。";
  }

  const digitCount = normalizedPhone.replace(/\D/g, "").length;

  if (digitCount < MIN_PHONE_DIGIT_COUNT) {
    return `联系方式至少需要包含 ${MIN_PHONE_DIGIT_COUNT} 个数字。`;
  }

  return "";
}

function normalizePhoneInput(phone: string) {
  return phone.slice(0, MAX_PHONE_LENGTH);
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

export function AccountProfileSection({
  user,
  loading,
  error,
  savingProfile,
  savingAvatar,
  uploadingAvatar,
  savingPreferences,
  preferences,
  preferencesLoading,
  preferencesError,
  browserTimezone,
  onRetry,
  onSaveProfile,
  onSaveTimezone,
  onUploadAvatar,
  onSelectAvatarPreset,
  onRetryPreferences,
  onLogout,
}: AccountProfileSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState(user?.username ?? "");
  const [emailDraft, setEmailDraft] = useState(user?.email ?? "");
  const [phoneDraft, setPhoneDraft] = useState(user?.phone ?? "");
  const [timezoneDraft, setTimezoneDraft] = useState(
    preferences?.timezone || browserTimezone,
  );
  const [usernameError, setUsernameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [timezoneError, setTimezoneError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [avatarMode, setAvatarMode] = useState<"preset" | "upload">("preset");
  const [selectedPresetId, setSelectedPresetId] =
    useState<DefaultAvatarPresetId | null>(() => getInitialPresetSelection(user));
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarError, setAvatarError] = useState("");
  const isSaving =
    savingProfile || savingAvatar || uploadingAvatar || savingPreferences;
  const avatarUploadDisabled = isSaving || user?.avatarStorageConfigured === false;
  const currentTimezone = preferences?.timezone || browserTimezone;
  const timezoneSelectValue = timezoneDraft || currentTimezone;
  const timezoneOptions = Array.from(
    new Set(
      [
        currentTimezone,
        ...getTimezoneOptions(timezoneSelectValue, browserTimezone),
      ].filter((timezone) => timezone.trim()),
    ),
  );

  function resetDraft() {
    setUsernameDraft(user?.username ?? "");
    setEmailDraft(user?.email ?? "");
    setPhoneDraft(user?.phone ?? "");
    setTimezoneDraft(currentTimezone);
    setUsernameError("");
    setEmailError("");
    setPhoneError("");
    setTimezoneError("");
    setProfileError("");
    setAvatarMode(user?.avatarSource === "UPLOAD" ? "upload" : "preset");
    setSelectedPresetId(getInitialPresetSelection(user));
    setAvatarFile(null);
    setAvatarError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setAvatarError("");

    if (user?.avatarStorageConfigured === false) {
      setAvatarFile(null);
      setAvatarMode("preset");
      setAvatarError("头像上传需要先配置 OSS；当前可选择默认头像");
      event.target.value = "";
      return;
    }

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

    setAvatarMode("upload");
    setAvatarFile(file);
  }

  function getSubmitErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error && error.message.trim()
      ? error.message
      : fallback;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedUsername = usernameDraft.trim();
    const normalizedEmail = emailDraft.trim();
    const normalizedPhone = phoneDraft.trim();
    const normalizedTimezone = timezoneSelectValue.trim();
    const nextUsernameError = validateUsername(normalizedUsername);
    const nextEmailError = validateEmail(normalizedEmail);
    const nextPhoneError = validatePhone(normalizedPhone);
    const nextTimezoneError = normalizedTimezone ? "" : "请选择时区。";

    setUsernameError(nextUsernameError);
    setEmailError(nextEmailError);
    setPhoneError(nextPhoneError);
    setTimezoneError(nextTimezoneError);
    setProfileError("");
    setAvatarError("");

    if (
      nextUsernameError ||
      nextEmailError ||
      nextPhoneError ||
      nextTimezoneError
    ) {
      return;
    }

    const profileRequest: UpdateCurrentUserRequest = {};

    if (normalizedUsername !== user?.username) {
      profileRequest.username = normalizedUsername;
    }

    if (normalizedEmail !== (user?.email ?? "")) {
      profileRequest.email = normalizedEmail || null;
    }

    if (normalizedPhone !== (user?.phone ?? "")) {
      profileRequest.phone = normalizedPhone || null;
    }

    try {
      if (Object.keys(profileRequest).length > 0) {
        await onSaveProfile(profileRequest);
      }
    } catch (submitError) {
      setProfileError(
        getSubmitErrorMessage(
          submitError,
          "账号资料保存失败，请稍后重试。",
        ),
      );
      return;
    }

    try {
      if (normalizedTimezone !== currentTimezone) {
        await onSaveTimezone(normalizedTimezone);
      }
    } catch (submitError) {
      setTimezoneError(
        getSubmitErrorMessage(
          submitError,
          "时区保存失败，请稍后重试。",
        ),
      );
      return;
    }

    try {
      if (avatarMode === "upload") {
        if (!avatarFile) {
          if (user?.avatarSource !== "UPLOAD") {
            setAvatarError("请先选择头像图片，或切换到默认头像。");
            return;
          }
        } else if (user?.avatarStorageConfigured === false) {
          setAvatarError("头像上传需要先配置 OSS；当前可选择默认头像");
          return;
        } else {
          const nextAvatarError = validateAvatarFile(avatarFile);
          if (nextAvatarError) {
            setAvatarError(nextAvatarError);
            return;
          }

          await onUploadAvatar(avatarFile);
        }
      } else if (selectedPresetId !== user?.avatarPresetId) {
        await onSelectAvatarPreset(selectedPresetId ?? "blue");
      }

      setDialogOpen(false);
    } catch (submitError) {
      setAvatarError(
        getSubmitErrorMessage(
          submitError,
          "头像保存失败，请稍后重试。",
        ),
      );
    }
  }

  const timezoneValue = preferencesLoading
    ? "加载中..."
    : preferencesError
      ? "加载失败"
      : preferences?.timezone || browserTimezone;

  return (
    <SectionCard>
      <CardHeader>
        <CardTitle className="font-sans text-base normal-case tracking-normal">
          账号资料
        </CardTitle>
        <CardDescription>
          账号资料从后端读取；可在弹窗中修改用户名、邮箱、联系方式和头像。
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
          <div className="flex min-w-0 flex-col gap-5">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
              <UserAvatar
                username={user.username}
                avatarUrl={user.avatarUrl}
                avatarSource={user.avatarSource}
                avatarPresetId={user.avatarPresetId}
                className="size-16"
              />
              <div className="min-w-0 flex-1">
                <div className="break-words text-base font-semibold text-slate-900">
                  {user.username}
                </div>
                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-sm text-slate-500">
                  <Mail aria-hidden="true" className="size-4 shrink-0" />
                  <span className="min-w-0 break-words">
                    {user.email || "尚未设置邮箱"}
                  </span>
                </div>
                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-sm text-slate-500">
                  <Phone aria-hidden="true" className="size-4 shrink-0" />
                  <span className="min-w-0 break-words">
                    {user.phone || "尚未设置联系方式"}
                  </span>
                </div>
              </div>
              <Dialog
                open={dialogOpen}
                onOpenChange={(open) => {
                  setDialogOpen(open);
                  if (open) {
                    resetDraft();
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button type="button" size="sm" variant="outline">
                    <Edit3 data-icon="inline-start" />
                    编辑资料
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-[8px] p-5 sm:max-w-xl">
                  <form className="grid min-w-0 gap-5" onSubmit={handleSubmit}>
                    <DialogHeader>
                      <DialogTitle className="font-sans text-lg normal-case tracking-normal">
                        编辑资料
                      </DialogTitle>
                      <DialogDescription>
                        修改用户名、邮箱、联系方式或头像后保存，Header、Sidebar 会同步更新。
                      </DialogDescription>
                    </DialogHeader>

                    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                      <TextField
                        id="settings-profile-username"
                        label="用户名"
                        value={usernameDraft}
                        disabled={isSaving}
                        error={usernameError}
                        onChange={(value) => {
                          setUsernameDraft(value);
                          setUsernameError("");
                          setProfileError("");
                        }}
                        inputProps={{ maxLength: MAX_ACCOUNT_NAME_LENGTH }}
                      />
                      <TextField
                        id="settings-profile-email"
                        label="邮箱"
                        type="email"
                        value={emailDraft}
                        placeholder="name@example.com"
                        disabled={isSaving}
                        error={emailError}
                        onChange={(value) => {
                          setEmailDraft(value);
                          setEmailError("");
                          setProfileError("");
                        }}
                      />
                      <TextField
                        id="settings-profile-phone"
                        label="联系方式"
                        type="tel"
                        value={phoneDraft}
                        placeholder="+86 138 0000 0000"
                        disabled={isSaving}
                        error={phoneError}
                        helpText="可留空；支持数字、普通空格、+、- 和英文括号。"
                        onChange={(value) => {
                          setPhoneDraft(normalizePhoneInput(value));
                          setPhoneError("");
                          setProfileError("");
                        }}
                        inputProps={{ maxLength: MAX_PHONE_LENGTH }}
                      />
                      <div className="min-w-0">
                        <SettingsSelect
                          label="时区"
                          value={timezoneSelectValue}
                          options={timezoneOptions}
                          disabled={isSaving || preferencesLoading}
                          onChange={(timezone) => {
                            setTimezoneDraft(timezone);
                            setTimezoneError("");
                          }}
                        />
                        {timezoneError ? (
                          <p className="mt-2 text-xs leading-5 text-red-600">
                            {timezoneError}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {profileError ? (
                      <div className="rounded-[6px] border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
                        {profileError}
                      </div>
                    ) : null}

                    {preferencesError ? (
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[6px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        <span>{preferencesError}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={onRetryPreferences}
                        >
                          重试
                        </Button>
                      </div>
                    ) : null}

                    <div className="grid min-w-0 gap-3">
                      <div className="text-sm font-medium text-slate-700">
                        默认头像
                      </div>
                      <AvatarPresetPicker
                        value={selectedPresetId}
                        username={usernameDraft || user.username}
                        disabled={isSaving}
                        onChange={(presetId) => {
                          setAvatarMode("preset");
                          setSelectedPresetId(presetId);
                          setAvatarFile(null);
                          setAvatarError("");
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                        }}
                      />
                    </div>

                    <div className="grid min-w-0 gap-2">
                      <label
                        htmlFor="settings-avatar-file"
                        className="text-sm font-medium text-slate-700"
                      >
                        本地头像
                      </label>
                      <Input
                        ref={fileInputRef}
                        id="settings-avatar-file"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={avatarUploadDisabled}
                        onChange={handleAvatarFileChange}
                        className="min-h-11 min-w-0 cursor-pointer rounded-[6px] border-slate-200 bg-white px-2 py-2 text-sm file:mr-3 file:rounded-[5px] file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
                      />
                      {user.avatarStorageConfigured === false ? (
                        <p className="text-xs leading-5 text-amber-700">
                          头像上传需要先配置 OSS；当前可选择默认头像
                        </p>
                      ) : null}
                      {avatarFile ? (
                        <p className="break-words text-xs leading-5 text-slate-500">
                          已选择：{avatarFile.name}
                        </p>
                      ) : null}
                      {avatarError ? (
                        <p className="text-xs leading-5 text-red-600">
                          {avatarError}
                        </p>
                      ) : null}
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSaving}
                        onClick={() => setDialogOpen(false)}
                      >
                        取消
                      </Button>
                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? (
                          "保存中..."
                        ) : (
                          <>
                            <Save data-icon="inline-start" />
                            保存资料
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <ReadonlyField label="用户名" value={user.username} />
              <ReadonlyField label="邮箱" value={user.email || "尚未设置邮箱"} />
              <ReadonlyField
                label="联系方式"
                value={user.phone || "尚未设置联系方式"}
              />
              <ReadonlyField label="时区" value={timezoneValue} />
            </div>
          </div>
        ) : (
          <div className="rounded-[6px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            暂无账号资料，请重新登录后查看。
          </div>
        )}
      </CardContent>
    </SectionCard>
  );
}
