import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowDown, ArrowRight, ArrowUp, CheckCircle2, Maximize2, MessageSquarePlus, Minimize2, MoreHorizontal, SearchCheck, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ChatComposer, type ChatComposerPayload } from "@/components/chat/ChatComposer";
import { citations, initialConversations, sources, statusMetrics } from "@/components/chat-page/chat-data";
import { ConversationRow, EmptyConversation, MessageBubble, SourceCard } from "@/components/chat-page/chat-components";
import type { ConversationMessage, SortDirection } from "@/components/chat-page/chat-types";
import { createEmptyConversation, createLocalId, getLatestConversation, getNowTime } from "@/components/chat-page/chat-utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const Chat = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState(initialConversations);
  const [conversationMenuOpen, setConversationMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sourceSortDirection, setSourceSortDirection] =
    useState<SortDirection>("desc");
  const sortedConversations = useMemo(
    () =>
      [...conversations].sort(
        (first, second) =>
          new Date(second.updatedAt).getTime() -
          new Date(first.updatedAt).getTime(),
      ),
    [conversations],
  );
  const currentConversation =
    conversations.find((item) => item.id === conversationId) ??
    sortedConversations[0];
  const sortedSources = useMemo(
    () =>
      [...sources].sort((first, second) => {
        const firstScore = Number(first.score);
        const secondScore = Number(second.score);

        return sourceSortDirection === "desc"
          ? secondScore - firstScore
          : firstScore - secondScore;
      }),
    [sourceSortDirection],
  );

  useEffect(() => {
    if (conversationId || conversations.length === 0) {
      return;
    }

    const latest = getLatestConversation(conversations);
    navigate(`/Chat/${latest.id}`, { replace: true });
  }, [conversationId, conversations, navigate]);

  useEffect(() => {
    if (
      !conversationId ||
      conversations.length === 0 ||
      conversations.some((item) => item.id === conversationId)
    ) {
      return;
    }

    const latest = getLatestConversation(conversations);
    navigate(`/Chat/${latest.id}`, { replace: true });
  }, [conversationId, conversations, navigate]);

  const handleCreateConversation = () => {
    const nextConversation = createEmptyConversation();

    setConversations((currentItems) => [nextConversation, ...currentItems]);
    navigate(`/Chat/${nextConversation.id}`);
    toast.success("已新建会话");
  };

  const handleDeleteConversation = () => {
    if (!currentConversation) {
      return;
    }

    const nextConversations = conversations.filter(
      (item) => item.id !== currentConversation.id,
    );

    if (nextConversations.length === 0) {
      const emptyConversation = createEmptyConversation();
      setConversations([emptyConversation]);
      navigate(`/Chat/${emptyConversation.id}`, { replace: true });
    } else {
      setConversations(nextConversations);
      navigate(`/Chat/${getLatestConversation(nextConversations).id}`, {
        replace: true,
      });
    }

    setConversationMenuOpen(false);
    setDeleteOpen(false);
    toast.success("已删除会话");
  };

  const handleToggleFavorite = () => {
    if (!currentConversation) {
      return;
    }

    setConversations((currentItems) =>
      currentItems.map((item) =>
        item.id === currentConversation.id
          ? { ...item, favorite: !item.favorite }
          : item,
      ),
    );
    toast.success(currentConversation.favorite ? "已取消常用" : "已标记常用");
  };

  const handleSubmit = (payload: ChatComposerPayload) => {
    if (!currentConversation) {
      return;
    }

    const now = new Date();
    const time = getNowTime();
    const messageTitle =
      payload.message || payload.attachments.map((item) => item.name).join("、");
    const userMessage: ConversationMessage = {
      id: createLocalId("user-message"),
      role: "user",
      time,
      content: messageTitle,
    };
    const assistantMessage: ConversationMessage = {
      id: createLocalId("assistant-message"),
      role: "assistant",
      time,
      content: `已收到你的问题。当前选择模型为 ${payload.modelId}，${
        payload.ragEnabled ? "RAG 已启用" : "RAG 已关闭"
      }。这里先展示本地 mock 回答，后续接入接口后可替换为真实流式生成内容。`,
      citations: payload.ragEnabled ? citations.slice(0, 2) : [],
    };

    setConversations((currentItems) =>
      currentItems.map((item) =>
        item.id === currentConversation.id
          ? {
              ...item,
              title:
                item.messages.length === 0
                  ? messageTitle.slice(0, 24) || item.title
                  : item.title,
              time,
              updatedAt: now.toISOString(),
              sourceCount: payload.ragEnabled ? Math.max(item.sourceCount, 2) : 0,
              messages: [...item.messages, userMessage, assistantMessage],
            }
          : item,
      ),
    );
    toast.success("消息已添加到本地对话");
  };

  const currentMessages = currentConversation?.messages ?? [];
  const sortIcon =
    sourceSortDirection === "desc" ? (
      <ArrowDown data-icon="inline-end" />
    ) : (
      <ArrowUp data-icon="inline-end" />
    );

  return (
    <section className="h-[calc(100svh-5rem)] min-h-[720px] overflow-hidden bg-white text-slate-900">
      <div
        className={cn(
          "grid h-full min-h-0 grid-cols-1 overflow-hidden border border-slate-200 bg-white shadow-sm",
          isFullscreen
            ? "xl:grid-cols-[minmax(520px,1fr)]"
            : "xl:grid-cols-[280px_minmax(520px,1fr)_360px]",
        )}
      >
        {!isFullscreen && (
          <aside
            aria-label="最近会话"
            className="flex min-h-0 flex-col border-b border-slate-200 bg-white xl:border-r xl:border-b-0"
          >
            <div className="shrink-0 px-4 py-4">
              <Button
                type="button"
                className="h-10 w-full rounded-[6px] bg-blue-600 text-sm font-medium tracking-normal text-white normal-case shadow-sm hover:bg-blue-700"
                onClick={handleCreateConversation}
              >
                <MessageSquarePlus data-icon="inline-start" />
                新建会话
              </Button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col px-3 pb-4">
              <div className="mb-2 px-1 text-xs font-medium text-slate-500">
                最近会话
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto pr-1">
                {sortedConversations.map((item) => (
                  <ConversationRow
                    key={item.id}
                    item={item}
                    active={item.id === currentConversation?.id}
                    onOpen={(id) => navigate(`/Chat/${id}`)}
                  />
                ))}
              </div>
              <button
                type="button"
                className="mt-3 flex h-9 items-center gap-2 px-1 text-left text-xs font-medium text-slate-500 hover:text-blue-600"
              >
                查看全部会话
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          </aside>
        )}

        <main
          aria-label="聊天问答"
          className="flex min-h-0 flex-col border-b border-slate-200 bg-white xl:border-b-0"
        >
          <header className="flex min-h-16 shrink-0 flex-col gap-3 border-b border-slate-200 px-4 py-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="text-sm text-slate-600">知识库：</span>
              <span className="flex h-8 min-w-0 max-w-[220px] items-center rounded-[5px] px-2 text-sm font-medium text-slate-700">
                <span className="min-w-0 truncate">Frontend Interview</span>
              </span>
              <span className="rounded-[5px] border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500">
                12 个文档
              </span>
              <span className="rounded-[5px] border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500">
                168 个 chunks
              </span>
              <span className="inline-flex items-center gap-1 rounded-[5px] border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                RAG 已启用
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon-xs"
                aria-label={isFullscreen ? "退出全屏" : "进入全屏"}
                className="rounded-[5px] border-slate-200 text-slate-600"
                onClick={() => setIsFullscreen((currentValue) => !currentValue)}
              >
                {isFullscreen ? <Minimize2 /> : <Maximize2 />}
              </Button>
              <DropdownMenu
                open={conversationMenuOpen}
                onOpenChange={setConversationMenuOpen}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-xs"
                    aria-label="更多操作"
                    className="rounded-[5px] border-slate-200 text-slate-600"
                  >
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 rounded-[8px]">
                  <DropdownMenuGroup>
                    <DropdownMenuItem onSelect={handleToggleFavorite}>
                      <Star />
                      {currentConversation?.favorite
                        ? "取消常用"
                        : "标记常用"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => {
                        setConversationMenuOpen(false);
                        setDeleteOpen(true);
                      }}
                    >
                      <Trash2 />
                      删除会话
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-auto bg-white px-4 py-5 lg:px-8">
            <div className="mx-auto flex max-w-[760px] flex-col gap-5">
              {currentMessages.length > 0 ? (
                currentMessages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))
              ) : (
                <EmptyConversation />
              )}

              {currentMessages.length > 0 && (
                <div className="ml-0 rounded-[8px] border border-emerald-200 bg-emerald-50/50 px-4 py-3 text-xs text-slate-600 sm:ml-14">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                      <span className="min-w-0 truncate">
                        检索到 6 个相关片段 · 已引用{" "}
                        {currentConversation?.sourceCount ?? 0} 个来源
                      </span>
                    </span>
                    <span className="shrink-0 text-slate-500">耗时 1.23s</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <footer className="shrink-0 border-t border-slate-100 px-4 py-4 lg:px-6">
            <ChatComposer
              placeholder="继续追问这个知识库..."
              onSubmit={handleSubmit}
            />
          </footer>
        </main>

        {!isFullscreen && (
          <aside
            aria-label="引用来源"
            className="flex min-h-0 flex-col bg-white xl:border-l xl:border-slate-200"
          >
            <header className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="truncate text-base font-semibold text-slate-900">
                  引用来源
                </h2>
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-500">
                  {sortedSources.length}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 rounded-[5px] border-slate-200 px-3 text-xs font-medium tracking-normal text-slate-500 normal-case"
                onClick={() =>
                  setSourceSortDirection((currentValue) =>
                    currentValue === "desc" ? "asc" : "desc",
                  )
                }
              >
                {sourceSortDirection === "desc" ? "相似度降序" : "相似度升序"}
                {sortIcon}
              </Button>
            </header>

            <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
              <div className="flex flex-col gap-3">
                {sortedSources.map((source, index) => (
                  <SourceCard
                    key={source.id}
                    source={source}
                    rank={index + 1}
                  />
                ))}
              </div>

              <section className="mt-4 rounded-[8px] border border-slate-200 bg-white p-4 text-xs leading-6 text-slate-600 shadow-sm">
                <h3 className="mb-2 text-sm font-semibold text-slate-900">
                  选中来源详情
                </h3>
                <div className="font-medium text-slate-800">
                  javascript-event-loop.pdf
                  <span className="ml-2 font-normal text-slate-500">
                    Chunk #03
                  </span>
                </div>
                <p className="mt-2">
                  事件循环的运行流程：先执行同步代码，遇到异步任务后将回调放入相应队列；当前宏任务执行完毕后清空微任务队列，再执行下一个宏任务。
                </p>
                <p className="mt-2 text-slate-500">
                  这种机制保证了 JavaScript 的高效执行和良好的用户体验。
                </p>
                <div className="mt-2 text-slate-400">
                  第 2 页 · 字符 256 - 512
                </div>
              </section>

              <section className="mt-4 rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-900">
                    检索调试
                  </h3>
                  <SearchCheck className="size-4 text-slate-400" />
                </div>
                <div className="flex flex-col gap-2">
                  {statusMetrics.map((metric) => (
                    <div
                      key={metric.label}
                      className="grid grid-cols-[88px_minmax(0,1fr)] gap-2 text-xs"
                    >
                      <span className="text-slate-500">{metric.label}：</span>
                      <span className="min-w-0 truncate text-slate-700">
                        {metric.value}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </aside>
        )}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-[8px]">
          <AlertDialogHeader>
            <AlertDialogTitle>删除会话</AlertDialogTitle>
            <AlertDialogDescription>
              确认删除“{currentConversation?.title ?? "当前会话"}”吗？当前只会从本地
              mock 列表移除，刷新页面后会恢复初始数据。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-[6px] tracking-normal normal-case">
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-[6px] bg-red-600 tracking-normal text-white normal-case hover:bg-red-700"
              onClick={handleDeleteConversation}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export default Chat;
