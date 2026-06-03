import { type FormEvent, useCallback, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { Loader2, RefreshCw, ShieldCheck, Trash2, UserPlus, UsersRound } from "lucide-react";
import { toast } from "sonner";

import {
  addKnowledgeBaseMember,
  deleteKnowledgeBaseMember,
  getKnowledgeBaseMembers,
  updateKnowledgeBaseMember,
  type KnowledgeBaseMemberResponse,
  type ManageableKnowledgeBaseRole,
} from "@/api/knowledge-base-members";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { KnowledgeBase } from "./knowledge-base-types";
import { formatCompactDateTime } from "./knowledge-base-utils";
import { knowledgeBaseRoleCopy } from "./knowledge-base-permissions";

const MEMBER_ROLE_OPTIONS: {
  value: ManageableKnowledgeBaseRole;
  label: string;
}[] = [
  { value: "EDITOR", label: "可编辑" },
  { value: "VIEWER", label: "只读" },
];

function getBackendMessage(error: unknown) {
  if (!isAxiosError(error)) {
    return "";
  }

  const responseData = error.response?.data;

  if (
    typeof responseData !== "object" ||
    responseData === null ||
    !("message" in responseData)
  ) {
    return "";
  }

  const message = (responseData as { message?: unknown }).message;

  return typeof message === "string" ? message.trim() : "";
}

function getMemberErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const backendMessage = getBackendMessage(error);

    if (backendMessage) {
      return backendMessage;
    }

    if (status === 400) {
      return "成员信息不符合要求，请检查用户名和角色。";
    }

    if (status === 403) {
      return "当前角色无权执行此操作。";
    }

    if (status === 404) {
      return "知识库不存在，或你没有访问权限。";
    }

    if (!error.response) {
      return "无法连接成员管理服务，请确认后端已启动。";
    }

    if (status && status >= 500) {
      return "成员管理服务异常，请稍后重试。";
    }
  }

  return "成员操作失败，请稍后重试。";
}

function MemberRolePill({ role }: { role: KnowledgeBaseMemberResponse["role"] }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium",
        role === "OWNER" && "border-blue-200 bg-blue-50 text-blue-700",
        role === "EDITOR" &&
          "border-emerald-200 bg-emerald-50 text-emerald-700",
        role === "VIEWER" && "border-slate-200 bg-slate-50 text-slate-600",
      )}
    >
      {role === "OWNER" && <ShieldCheck className="size-3" />}
      {knowledgeBaseRoleCopy[role]}
    </span>
  );
}

export function KnowledgeBaseMemberDialog({
  knowledgeBase,
  open,
  onOpenChange,
  onUnauthorized,
}: {
  knowledgeBase: KnowledgeBase;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnauthorized: () => void;
}) {
  const [members, setMembers] = useState<KnowledgeBaseMemberResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<ManageableKnowledgeBaseRole>("EDITOR");
  const [formError, setFormError] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [mutatingMemberId, setMutatingMemberId] = useState<number | null>(null);
  const [memberToRemove, setMemberToRemove] =
    useState<KnowledgeBaseMemberResponse | null>(null);

  const handleError = useCallback(
    (error: unknown) => {
      if (isAxiosError(error) && error.response?.status === 401) {
        toast.error("登录状态已失效，请重新登录");
        onUnauthorized();
        return "登录状态已失效，请重新登录";
      }

      const message = getMemberErrorMessage(error);
      toast.error(message);
      return message;
    },
    [onUnauthorized],
  );

  const loadMembers = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const response = await getKnowledgeBaseMembers(knowledgeBase.id);
      setMembers(response);
    } catch (error) {
      setMembers([]);
      setLoadError(handleError(error));
    } finally {
      setIsLoading(false);
    }
  }, [handleError, knowledgeBase.id]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadMembers();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadMembers, open]);

  const handleAddMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextUsername = username.trim();

    if (!nextUsername) {
      setFormError("请输入已注册用户名。");
      return;
    }

    setIsAdding(true);
    setFormError("");

    try {
      const createdMember = await addKnowledgeBaseMember(knowledgeBase.id, {
        username: nextUsername,
        role,
      });

      setMembers((currentMembers) => [...currentMembers, createdMember]);
      setUsername("");
      setRole("EDITOR");
      toast.success(`已添加成员：${createdMember.username}`);
    } catch (error) {
      setFormError(handleError(error));
    } finally {
      setIsAdding(false);
    }
  };

  const handleRoleChange = async (
    member: KnowledgeBaseMemberResponse,
    nextRole: ManageableKnowledgeBaseRole,
  ) => {
    if (member.role === nextRole || member.role === "OWNER") {
      return;
    }

    setMutatingMemberId(member.id);

    try {
      const updatedMember = await updateKnowledgeBaseMember(
        knowledgeBase.id,
        member.id,
        { role: nextRole },
      );

      setMembers((currentMembers) =>
        currentMembers.map((currentMember) =>
          currentMember.id === updatedMember.id ? updatedMember : currentMember,
        ),
      );
      toast.success(`已更新 ${updatedMember.username} 的权限`);
    } catch (error) {
      handleError(error);
    } finally {
      setMutatingMemberId(null);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) {
      return;
    }

    setMutatingMemberId(memberToRemove.id);

    try {
      await deleteKnowledgeBaseMember(knowledgeBase.id, memberToRemove.id);

      setMembers((currentMembers) =>
        currentMembers.filter((member) => member.id !== memberToRemove.id),
      );
      toast.success(`已移除成员：${memberToRemove.username}`);
      setMemberToRemove(null);
    } catch (error) {
      handleError(error);
    } finally {
      setMutatingMemberId(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[min(720px,calc(100svh-2rem))] overflow-hidden rounded-[8px] p-0 sm:max-w-2xl">
          <div className="flex min-h-0 flex-col">
            <DialogHeader className="border-b border-slate-100 px-6 py-5">
              <DialogTitle className="text-base tracking-normal normal-case">
                成员管理
              </DialogTitle>
              <DialogDescription className="line-clamp-2 break-words">
                {knowledgeBase.name}。仅拥有者可以添加成员、修改 editor/viewer
                或移除成员。
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
              <form
                className="rounded-[8px] border border-slate-200 bg-slate-50/60 p-4"
                onSubmit={handleAddMember}
              >
                <FieldGroup className="gap-3">
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_136px_auto] md:items-end">
                    <Field data-invalid={!!formError}>
                      <FieldLabel htmlFor="member-username">
                        用户名
                      </FieldLabel>
                      <Input
                        id="member-username"
                        value={username}
                        onChange={(event) => {
                          setUsername(event.target.value);
                          setFormError("");
                        }}
                        disabled={isAdding}
                        placeholder="输入已注册用户名"
                        className="h-10 rounded-[6px] border border-slate-200 bg-white px-3 text-sm focus-visible:border-blue-400"
                      />
                    </Field>
                    <Field>
                      <FieldLabel>角色</FieldLabel>
                      <Select
                        value={role}
                        onValueChange={(value) =>
                          setRole(value as ManageableKnowledgeBaseRole)
                        }
                        disabled={isAdding}
                      >
                        <SelectTrigger className="h-10 w-full rounded-[6px] border border-slate-200 bg-white px-3 text-sm tracking-normal text-slate-700 focus-visible:border-blue-400">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          <SelectGroup>
                            {MEMBER_ROLE_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Button
                      type="submit"
                      disabled={isAdding}
                      className="h-10 rounded-[6px] bg-blue-600 px-4 text-sm tracking-normal text-white normal-case hover:bg-blue-700"
                    >
                      {isAdding ? (
                        <Loader2
                          data-icon="inline-start"
                          className="animate-spin"
                        />
                      ) : (
                        <UserPlus data-icon="inline-start" />
                      )}
                      添加
                    </Button>
                  </div>
                  <FieldError>{formError}</FieldError>
                </FieldGroup>
              </form>

              <div className="mt-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <UsersRound className="size-4 shrink-0 text-slate-400" />
                    <h3 className="truncate text-sm font-semibold text-slate-900">
                      当前成员
                    </h3>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      {members.length}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="rounded-[5px] text-slate-500"
                    aria-label="刷新成员"
                    disabled={isLoading}
                    onClick={() => void loadMembers()}
                  >
                    <RefreshCw
                      className={cn("size-4", isLoading && "animate-spin")}
                    />
                  </Button>
                </div>

                {isLoading ? (
                  <div className="flex min-h-[160px] items-center justify-center rounded-[8px] border border-dashed border-slate-200 text-sm text-slate-500">
                    <Loader2 className="mr-2 size-4 animate-spin text-blue-600" />
                    正在加载成员...
                  </div>
                ) : loadError ? (
                  <div className="rounded-[8px] border border-orange-200 bg-orange-50 px-4 py-4 text-sm leading-6 text-orange-700">
                    {loadError}
                  </div>
                ) : members.length > 0 ? (
                  <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white">
                    {members.map((member) => {
                      const isOwner = member.role === "OWNER";
                      const isMutating = mutatingMemberId === member.id;

                      return (
                        <div
                          key={member.id}
                          className="grid min-w-0 gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_132px_auto] md:items-center"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-900">
                              {member.username}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span>用户 ID {member.userId}</span>
                              <span className="text-slate-300">/</span>
                              <span>
                                更新于 {formatCompactDateTime(member.updatedAt)}
                              </span>
                            </div>
                          </div>

                          {isOwner ? (
                            <MemberRolePill role={member.role} />
                          ) : (
                            <Select
                              value={member.role}
                              disabled={isMutating}
                              onValueChange={(value) =>
                                void handleRoleChange(
                                  member,
                                  value as ManageableKnowledgeBaseRole,
                                )
                              }
                            >
                              <SelectTrigger className="h-9 w-full rounded-[6px] border border-slate-200 bg-white px-3 text-xs tracking-normal text-slate-700 focus-visible:border-blue-400">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent position="popper">
                                <SelectGroup>
                                  {MEMBER_ROLE_OPTIONS.map((option) => (
                                    <SelectItem
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          )}

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`移除 ${member.username}`}
                            disabled={isOwner || isMutating}
                            title={isOwner ? "拥有者不能被移除" : undefined}
                            className="rounded-[6px] text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:bg-transparent disabled:text-slate-300"
                            onClick={() => setMemberToRemove(member)}
                          >
                            {isMutating ? (
                              <Loader2 className="animate-spin" />
                            ) : (
                              <Trash2 />
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-[8px] border border-dashed border-slate-200 px-4 py-8 text-center">
                    <UsersRound className="mx-auto size-8 text-slate-300" />
                    <p className="mt-3 text-sm text-slate-500">
                      暂无普通成员。添加 editor 或 viewer 后，对方会在“共享给我”中看到该知识库。
                    </p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="border-t border-slate-100 px-6 py-4">
              <Button
                type="button"
                variant="outline"
                className="rounded-[6px] tracking-normal normal-case"
                onClick={() => onOpenChange(false)}
              >
                关闭
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!memberToRemove}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && mutatingMemberId !== memberToRemove?.id) {
            setMemberToRemove(null);
          }
        }}
      >
        <AlertDialogContent className="rounded-[8px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base tracking-normal normal-case">
              移除成员
            </AlertDialogTitle>
            <AlertDialogDescription>
              确认移除“{memberToRemove?.username}”吗？移除后该用户将无法继续访问这个知识库。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-[6px] tracking-normal normal-case"
              disabled={mutatingMemberId === memberToRemove?.id}
            >
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="rounded-[6px] tracking-normal normal-case"
              disabled={mutatingMemberId === memberToRemove?.id}
              onClick={(event) => {
                event.preventDefault();
                void handleRemoveMember();
              }}
            >
              {mutatingMemberId === memberToRemove?.id && (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              )}
              移除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
