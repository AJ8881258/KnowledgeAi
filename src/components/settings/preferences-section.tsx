import type { UserPreferenceResponse } from "@/api/settings";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SettingsSelect,
  SettingsErrorState,
  SettingsSkeleton,
} from "@/components/settings/settings-components";
import { getTimezoneOptions } from "@/components/settings/timezone-options";
import { cn } from "@/lib/utils";

type PreferencesSectionProps = {
  preferences: UserPreferenceResponse | null;
  loading: boolean;
  error: string;
  saving: boolean;
  browserTimezone: string;
  onRetry: () => void;
};

type TimezonePreferenceDraft = Pick<UserPreferenceResponse, "timezone">;

type PreferencesFieldsProps = PreferencesSectionProps & {
  className?: string;
  value?: TimezonePreferenceDraft | null;
  onDraftChange?: (preferences: TimezonePreferenceDraft) => void;
  compact?: boolean;
};

function createPreferenceDraft(
  preferences: UserPreferenceResponse | null,
  browserTimezone: string,
): TimezonePreferenceDraft {
  return (
    preferences ?? {
      timezone: browserTimezone,
    }
  );
}

export function PreferencesFields({
  preferences,
  value,
  loading,
  error,
  saving,
  browserTimezone,
  onRetry,
  onDraftChange,
  className,
  compact = false,
}: PreferencesFieldsProps) {
  const effectiveDraft = value ?? createPreferenceDraft(preferences, browserTimezone);
  const updateDraft = (nextDraft: TimezonePreferenceDraft) => {
    onDraftChange?.(nextDraft);
  };
  const timezoneOptions = getTimezoneOptions(effectiveDraft.timezone, browserTimezone);

  if (loading) {
    return <SettingsSkeleton rows={3} />;
  }

  if (error) {
    return <SettingsErrorState message={error} onRetry={onRetry} />;
  }

  if (!preferences) {
    return (
      <div
        className={cn(
          "rounded-[6px] border border-slate-200 bg-slate-50 text-sm text-slate-600",
          compact ? "px-0 py-1" : "p-4",
        )}
      >
        后端暂未返回偏好设置。
      </div>
    );
  }

  if (compact) {
    return (
      <div className={cn("grid grid-cols-1 gap-2", className)}>
        <Select
          value={effectiveDraft.timezone}
          disabled={saving}
          onValueChange={(timezone) =>
            updateDraft({ ...effectiveDraft, timezone })
          }
        >
          <SelectTrigger
            aria-label="时区"
            size="sm"
            className="h-8 min-w-0 w-full overflow-hidden rounded-[5px] border border-slate-200 bg-white px-2 py-0 text-xs font-medium normal-case tracking-normal text-slate-700 focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-w-[calc(100vw-2rem)]" position="popper">
            <SelectGroup>
              {timezoneOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  <span className="min-w-0 truncate">{option}</span>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className={className ?? "flex flex-col gap-5"}>
      <div className="grid gap-3">
        <SettingsSelect
          label="时区"
          value={effectiveDraft.timezone}
          options={timezoneOptions}
          disabled={saving}
          onChange={(timezone) =>
            updateDraft({ ...effectiveDraft, timezone })
          }
        />
      </div>
    </div>
  );
}
