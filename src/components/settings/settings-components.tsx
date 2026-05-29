import { type ReactNode } from "react";
import type { InputHTMLAttributes } from "react";
import { CircleAlert, CircleHelp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
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
  tone?: "green" | "blue" | "orange" | "red" | "slate";
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center gap-2 rounded-[5px] border px-2.5 text-xs font-medium",
        tone === "green" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        tone === "blue" && "border-blue-200 bg-blue-50 text-blue-700",
        tone === "orange" && "border-orange-200 bg-orange-50 text-orange-700",
        tone === "red" && "border-red-200 bg-red-50 text-red-700",
        tone === "slate" && "border-slate-200 bg-slate-50 text-slate-600",
      )}
    >
      <span
        className={cn(
          "size-2 rounded-full",
          tone === "green" && "bg-emerald-500",
          tone === "blue" && "bg-blue-500",
          tone === "orange" && "bg-orange-500",
          tone === "red" && "bg-red-500",
          tone === "slate" && "bg-slate-400",
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
  disabled = false,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Field className="gap-2">
      <FieldLabel className="text-sm font-normal normal-case tracking-normal text-slate-700">
        {label}
      </FieldLabel>
      <Select value={value} disabled={disabled} onValueChange={onChange}>
        <SelectTrigger className="h-10 w-full rounded-[5px] border border-slate-200 bg-white px-3 text-sm normal-case tracking-normal text-slate-700 focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500">
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
  disabled = false,
  placeholder,
  error,
  helpText,
  onChange,
  action,
  inputProps,
}: {
  id?: string;
  label: string;
  value: string;
  type?: string;
  readOnly?: boolean;
  disabled?: boolean;
  placeholder?: string;
  error?: string;
  helpText?: string;
  onChange?: (value: string) => void;
  action?: ReactNode;
  inputProps?: Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "id" | "type" | "value" | "readOnly" | "disabled" | "placeholder" | "onChange"
  >;
}) {
  return (
    <Field className="gap-2" data-invalid={Boolean(error)}>
      <FieldLabel
        htmlFor={id}
        className="text-sm font-normal normal-case tracking-normal text-slate-700"
      >
        {label}
      </FieldLabel>
      <div
        className={cn(
          "flex min-h-10 min-w-0 items-center rounded-[5px] border border-slate-200 bg-white px-3 transition-colors focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100",
          (readOnly || disabled) && "bg-slate-50",
          error && "border-red-300 focus-within:border-red-400 focus-within:ring-red-100",
        )}
      >
        <Input
          id={id}
          type={type}
          value={value}
          readOnly={readOnly}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          onChange={(event) => onChange?.(event.target.value)}
          className="h-8 border-0 px-0 text-sm text-slate-700 focus-visible:border-0 disabled:cursor-not-allowed disabled:text-slate-500"
          {...inputProps}
        />
        {action}
      </div>
      {error ? (
        <FieldError>{error}</FieldError>
      ) : helpText ? (
        <p className="text-xs leading-5 text-slate-500">{helpText}</p>
      ) : null}
    </Field>
  );
}

export function ReadonlyField({
  label,
  value,
  emptyText = "暂无数据",
}: {
  label: string;
  value: ReactNode;
  emptyText?: string;
}) {
  return (
    <div className="min-w-0 rounded-[6px] border border-slate-200 bg-slate-50 px-3 py-2.5">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 break-words text-sm font-medium text-slate-900">
        {value || emptyText}
      </div>
    </div>
  );
}

export function RagControl({
  label,
  helper,
  value,
  min,
  max,
  step = 1,
  disabled = false,
  onChange,
}: {
  label: string;
  helper: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <Field className="gap-3">
      <FieldLabel className="flex items-center gap-1 text-sm font-normal normal-case tracking-normal text-slate-700">
        {label}
        <CircleHelp aria-hidden="true" className="size-4 text-slate-400" />
      </FieldLabel>
      <Input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-9 rounded-[5px] border border-slate-200 bg-white px-3 text-sm focus-visible:border-blue-400 disabled:cursor-not-allowed disabled:bg-slate-50"
      />
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        disabled={disabled}
        onValueChange={([nextValue]) => onChange(nextValue)}
        className="py-2"
      />
      <div className="flex justify-between text-xs text-slate-500">
        <span>{min}</span>
        <span>{max}</span>
      </div>
      <p className="text-xs leading-5 text-slate-500">{helper}</p>
    </Field>
  );
}

export function SettingsErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[6px] border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2">
        <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>{message}</span>
      </div>
      {onRetry && (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          重试
        </Button>
      )}
    </div>
  );
}

export function SettingsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-10 rounded-[6px]" />
      ))}
    </div>
  );
}
