import { useState } from "react";
import { ShieldAlert, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { SectionCard } from "@/components/settings/settings-components";

type DangerZoneSectionProps = {
  username: string;
  deleting: boolean;
  onDeleteAccount: () => Promise<void>;
};

export function DangerZoneSection({
  username,
  deleting,
  onDeleteAccount,
}: DangerZoneSectionProps) {
  const [open, setOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const canDelete = confirmationText === username && !deleting;

  async function handleDelete() {
    if (!canDelete) {
      return;
    }

    await onDeleteAccount();
    setOpen(false);
    setConfirmationText("");
  }

  return (
    <SectionCard className="border-red-200 bg-red-50/20">
      <CardHeader>
        <CardTitle className="font-sans text-base text-red-700 normal-case tracking-normal">
          危险区
        </CardTitle>
        <CardDescription>
          删除账号会删除当前账号以及关联的知识库、文档、chunks、会话、消息和引用来源。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start gap-2 rounded-[6px] border border-red-200 bg-white p-4 text-sm text-red-700">
          <ShieldAlert
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0"
          />
          <span>
            这是不可逆操作。本阶段不提供账号恢复功能，请确认当前演示数据不再需要后再删除。
          </span>
        </div>

        <div>
          <AlertDialog
            open={open}
            onOpenChange={(nextOpen) => {
              if (deleting) {
                return;
              }

              setOpen(nextOpen);
              if (!nextOpen) {
                setConfirmationText("");
              }
            }}
          >
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive" size="sm">
                <Trash2 data-icon="inline-start" />
                删除当前账号
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[8px]">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-sans text-lg normal-case tracking-normal text-red-700">
                  确认删除账号
                </AlertDialogTitle>
                <AlertDialogDescription>
                  删除后会立即清空登录状态并返回登录页。请输入当前用户名确认删除。
                </AlertDialogDescription>
              </AlertDialogHeader>

              <Field className="gap-2">
                <FieldLabel
                  htmlFor="delete-account-confirmation"
                  className="text-sm font-medium normal-case tracking-normal"
                >
                  输入用户名：{username}
                </FieldLabel>
                <Input
                  id="delete-account-confirmation"
                  value={confirmationText}
                  disabled={deleting}
                  autoComplete="off"
                  onChange={(event) => setConfirmationText(event.target.value)}
                  className="h-10 rounded-[5px]"
                />
              </Field>

              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={!canDelete}
                  onClick={handleDelete}
                >
                  {deleting ? "删除中..." : "确认删除"}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </SectionCard>
  );
}
