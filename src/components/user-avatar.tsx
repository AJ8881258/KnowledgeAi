import { Check } from "lucide-react";
import type { ComponentProps } from "react";

import {
  type AvatarSource,
  type DefaultAvatarPresetId,
} from "@/api/auth";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export type { AvatarSource, DefaultAvatarPresetId };

type DefaultAvatarPreset = {
  id: DefaultAvatarPresetId;
  label: string;
  className: string;
};

const DEFAULT_AVATAR_PRESETS: DefaultAvatarPreset[] = [
  {
    id: "blue",
    label: "蓝色",
    className: "bg-[linear-gradient(135deg,#2563eb,#38bdf8)] text-white",
  },
  {
    id: "green",
    label: "绿色",
    className: "bg-[linear-gradient(135deg,#15803d,#86efac)] text-white",
  },
  {
    id: "coral",
    label: "珊瑚",
    className: "bg-[linear-gradient(135deg,#e11d48,#fb7185)] text-white",
  },
  {
    id: "violet",
    label: "紫色",
    className: "bg-[linear-gradient(135deg,#7c3aed,#c4b5fd)] text-white",
  },
  {
    id: "mint",
    label: "薄荷",
    className: "bg-[linear-gradient(135deg,#0f766e,#99f6e4)] text-white",
  },
  {
    id: "rose",
    label: "玫瑰",
    className: "bg-[linear-gradient(135deg,#be123c,#fda4af)] text-white",
  },
  {
    id: "amber",
    label: "琥珀",
    className: "bg-[linear-gradient(135deg,#b45309,#fcd34d)] text-white",
  },
  {
    id: "slate",
    label: "石板",
    className: "bg-[linear-gradient(135deg,#334155,#94a3b8)] text-white",
  },
];

type UserAvatarProps = Omit<ComponentProps<typeof Avatar>, "children"> & {
  username: string;
  avatarUrl?: string | null;
  avatarSource?: AvatarSource | null;
  avatarPresetId?: DefaultAvatarPresetId | null;
};

function getInitial(username: string) {
  return (username || "U").slice(0, 1).toUpperCase();
}

function getPreset(avatarPresetId?: DefaultAvatarPresetId | null) {
  return DEFAULT_AVATAR_PRESETS.find((preset) => preset.id === avatarPresetId);
}

export function UserAvatar({
  username,
  avatarUrl,
  avatarSource,
  avatarPresetId,
  size = "default",
  className,
  ...props
}: UserAvatarProps) {
  const preset = avatarSource === "PRESET" ? getPreset(avatarPresetId) : null;

  return (
    <Avatar size={size} className={className} {...props}>
      {avatarSource === "UPLOAD" && avatarUrl ? (
        <AvatarImage src={avatarUrl} alt={`${username} 头像`} />
      ) : null}
      <AvatarFallback
        className={cn(
          "font-semibold",
          preset?.className ?? "bg-slate-100 text-slate-700",
        )}
      >
        {getInitial(username)}
      </AvatarFallback>
    </Avatar>
  );
}

type AvatarPresetPickerProps = {
  value: DefaultAvatarPresetId | null;
  username: string;
  disabled?: boolean;
  onChange: (value: DefaultAvatarPresetId) => void;
};

export function AvatarPresetPicker({
  value,
  username,
  disabled = false,
  onChange,
}: AvatarPresetPickerProps) {
  return (
    <div className="grid min-w-0 grid-cols-4 gap-2 sm:grid-cols-8">
      {DEFAULT_AVATAR_PRESETS.map((preset) => {
        const selected = value === preset.id;

        return (
          <Button
            key={preset.id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={`选择${preset.label}默认头像`}
            aria-pressed={selected}
            className={cn(
              "relative h-12 min-w-0 rounded-[8px] border-slate-200 p-1 hover:bg-slate-50",
              selected && "border-slate-900 ring-2 ring-slate-900/10",
            )}
            onClick={() => onChange(preset.id)}
          >
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full text-sm font-semibold",
                preset.className,
              )}
            >
              {getInitial(username)}
            </span>
            {selected ? (
              <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-slate-900 text-white">
                <Check className="size-3" aria-hidden="true" />
              </span>
            ) : null}
          </Button>
        );
      })}
    </div>
  );
}
