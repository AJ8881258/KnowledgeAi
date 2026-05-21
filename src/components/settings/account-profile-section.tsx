import { type FormEvent, useState } from "react";
import { Mail, Save, UserRound } from "lucide-react";

import type { CurrentUserResponse } from "@/api/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
  TextField,
} from "@/components/settings/settings-components";

type AccountProfileSectionProps = {
  user: CurrentUserResponse | null;
  loading: boolean;
  error: string;
  saving: boolean;
  onRetry: () => void;
  onSave: (email: string | null) => Promise<void>;
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

export function AccountProfileSection({
  user,
  loading,
  error,
  saving,
  onRetry,
  onSave,
  onLogout,
}: AccountProfileSectionProps) {
  const [emailDraft, setEmailDraft] = useState(() => user?.email ?? "");
  const [emailError, setEmailError] = useState("");

  const normalizedEmail = emailDraft.trim();
  const initialEmail = user?.email ?? "";
  const isDirty = normalizedEmail !== initialEmail;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextError = validateEmail(normalizedEmail);
    setEmailError(nextError);

    if (nextError) {
      return;
    }

    await onSave(normalizedEmail || null);
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
              <TextField
                id="settings-email"
                label="邮箱"
                type="email"
                value={emailDraft}
                placeholder="name@example.com"
                error={emailError}
                helpText="邮箱为空时会保存为未设置。本阶段不发送邮箱验证邮件。"
                disabled={saving}
                onChange={(value) => {
                  setEmailDraft(value);
                  setEmailError("");
                }}
              />
              <ReadonlyField label="语言和时区" value="暂未接入后端，本阶段不保存" />
            </div>

            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={!isDirty || saving}>
                <Save data-icon="inline-start" />
                {saving ? "保存中..." : "保存邮箱"}
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
