import { type FormEvent, type ReactNode, useState } from "react";
import { CircleHelp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type { MockUserProfile } from "@/lib/mock-auth";
import { cn } from "@/lib/utils";

export function SectionCard({
  children,
  className,
}: {
  children: ReactNode;
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

export function StatusPill({
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

export function SettingsSelect({
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
    <Field className="gap-2">
      <FieldLabel className="text-sm font-normal normal-case tracking-normal text-slate-700">
        {label}
      </FieldLabel>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-10 w-full rounded-[5px] border border-slate-200 bg-white px-3 text-sm normal-case tracking-normal text-slate-700 focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

export function TextField({
  id,
  label,
  value,
  type = "text",
  readOnly = false,
  onChange,
  action,
}: {
  id?: string;
  label: string;
  value: string;
  type?: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  action?: ReactNode;
}) {
  return (
    <Field className="gap-2">
      <FieldLabel
        htmlFor={id}
        className="text-sm font-normal normal-case tracking-normal text-slate-700"
      >
        {label}
      </FieldLabel>
      <div className="flex h-10 min-w-0 items-center rounded-[5px] border border-slate-200 bg-white px-3 transition-colors focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
        <Input
          id={id}
          type={type}
          value={value}
          readOnly={readOnly}
          onChange={(event) => onChange?.(event.target.value)}
          className="h-8 border-0 px-0 text-sm text-slate-700 focus-visible:border-0"
        />
        {action}
      </div>
    </Field>
  );
}

export function RagControl({
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
  return (
    <Field className="gap-3">
      <FieldLabel className="flex items-center gap-1 text-sm font-normal normal-case tracking-normal text-slate-700">
        {label}
        <CircleHelp aria-hidden="true" className="text-slate-400" />
      </FieldLabel>
      <Input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-9 rounded-[5px] border border-slate-200 bg-white px-3 text-sm focus-visible:border-blue-400"
      />
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([nextValue]) => onChange(nextValue)}
        className="py-2"
      />
      <div className="flex justify-between text-xs text-slate-500">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </Field>
  );
}

export function ProfileEditDialog({
  open,
  profile,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  profile: MockUserProfile;
  onOpenChange: (open: boolean) => void;
  onSave: (profile: MockUserProfile) => void;
}) {
  const [draftProfile, setDraftProfile] = useState(profile);
  const [emailError, setEmailError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const displayName = draftProfile.displayName.trim();
    const email = draftProfile.email.trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("请输入有效的邮箱地址。");
      return;
    }

    onSave({
      displayName: displayName || profile.displayName,
      email,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[8px]">
        <DialogHeader>
          <DialogTitle className="font-sans text-lg normal-case tracking-normal">
            编辑资料
          </DialogTitle>
          <DialogDescription>
            修改当前账号在前端显示的名称和邮箱。
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <FieldGroup className="gap-5">
            <Field className="gap-2">
              <FieldLabel
                htmlFor="profile-display-name"
                className="text-sm font-medium normal-case tracking-normal"
              >
                显示名称
              </FieldLabel>
              <Input
                id="profile-display-name"
                value={draftProfile.displayName}
                onChange={(event) =>
                  setDraftProfile((current) => ({
                    ...current,
                    displayName: event.target.value,
                  }))
                }
                className="h-10 rounded-[5px]"
              />
            </Field>
            <Field className="gap-2" data-invalid={Boolean(emailError)}>
              <FieldLabel
                htmlFor="profile-email"
                className="text-sm font-medium normal-case tracking-normal"
              >
                邮箱
              </FieldLabel>
              <Input
                id="profile-email"
                type="email"
                value={draftProfile.email}
                aria-invalid={Boolean(emailError)}
                onChange={(event) => {
                  setEmailError("");
                  setDraftProfile((current) => ({
                    ...current,
                    email: event.target.value,
                  }));
                }}
                className="h-10 rounded-[5px]"
              />
              <FieldError>{emailError}</FieldError>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                取消
              </Button>
            </DialogClose>
            <Button type="submit">保存</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
