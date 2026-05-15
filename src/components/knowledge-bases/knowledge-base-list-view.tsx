import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, Check, ChevronDown, FolderPlus, Grid2X2, LayoutList, Loader2, MessageCircle, MoreVertical, Pencil, Plus, Search, Star, Trash2, X } from "lucide-react";

import type { CreateKnowledgeBaseRequest, UpdateKnowledgeBaseRequest } from "@/api/knowledge-bases";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { KnowledgeBaseMark, StatusPill } from "./knowledge-base-common";
import { knowledgeBaseTabs, knowledgeBaseThemePresets } from "./knowledge-base-data";
import type { KnowledgeBase, KnowledgeBaseSortMode, KnowledgeBaseTab, KnowledgeBaseViewMode, NewKnowledgeBaseForm, SortDirection } from "./knowledge-base-types";
import { formatDateTime, searchKnowledgeBases, sortKnowledgeBases } from "./knowledge-base-utils";

function getFilteredKnowledgeBases(
  items: KnowledgeBase[],
  tab: KnowledgeBaseTab,
) {
  if (tab === "mine") {
    return items.filter((item) => item.createdByMe);
  }

  if (tab === "featured") {
    return items.filter((item) => item.featured);
  }

  return items;
}

function FeaturedCard({
  item,
  onOpen,
}: {
  item: KnowledgeBase;
  onOpen: (slug: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item.slug)}
      className={cn(
        "group relative min-h-[184px] overflow-hidden rounded-[8px] border border-slate-200 bg-gradient-to-br p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md",
        item.theme.coverClass,
      )}
    >
      <div className="absolute -right-10 -top-10 size-32 rounded-full bg-white/60" />
      <div
        className={cn(
          "absolute bottom-0 left-0 h-1 w-full",
          item.theme.coverAccent,
        )}
      />
      <div className="relative flex h-full flex-col justify-between gap-8">
        <div className="flex items-center gap-3">
          <KnowledgeBaseMark item={item} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-900">
              {item.name}
            </div>
            <div className="text-xs text-slate-500">{item.docs} 个文档</div>
          </div>
        </div>
        <div>
          <p className="line-clamp-2 max-w-[16rem] break-words text-sm leading-6 text-slate-600">
            {item.description}
          </p>
          <div className="mt-4 flex items-center justify-between gap-3 text-xs font-medium text-slate-600">
            <span className="min-w-0 truncate">
              {item.updatedAt} · {item.sources} 个来源
            </span>
            <span className="flex size-8 items-center justify-center rounded-full border border-white bg-white/80 text-slate-700 shadow-sm transition-transform group-hover:translate-x-0.5">
              <ArrowRight className="size-4" />
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function KnowledgeBaseEmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-[8px] border border-dashed border-slate-300 bg-white">
      <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_220px]">
        <div className="flex flex-col justify-center px-6 py-10 sm:px-8">
          <div className="flex size-12 items-center justify-center rounded-[8px] border border-blue-100 bg-blue-50 text-blue-700">
            <FolderPlus className="size-5" />
          </div>
          <h3 className="mt-5 text-lg font-semibold tracking-normal text-slate-950">
            {title}
          </h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            {description}
          </p>
          {actionLabel && onAction && (
            <Button
              type="button"
              className="mt-5 h-10 w-fit rounded-[6px] bg-blue-600 px-4 text-sm tracking-normal text-white hover:bg-blue-700 normal-case"
              onClick={onAction}
            >
              <Plus data-icon="inline-start" />
              {actionLabel}
            </Button>
          )}
        </div>
        <div className="hidden border-l border-slate-100 bg-slate-50/80 p-5 md:block">
          <div className="grid h-full content-center gap-3">
            <div className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="h-3 w-24 rounded bg-slate-200" />
              <div className="mt-3 h-2 w-full rounded bg-slate-100" />
              <div className="mt-2 h-2 w-3/4 rounded bg-slate-100" />
            </div>
            <div className="rounded-[8px] border border-blue-100 bg-blue-50 p-4">
              <div className="h-3 w-20 rounded bg-blue-200" />
              <div className="mt-3 h-2 w-full rounded bg-blue-100" />
              <div className="mt-2 h-2 w-2/3 rounded bg-blue-100" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KnowledgeBaseActionsMenu({
  item,
  onOpen,
  onEdit,
  onDelete,
  isSubmitting,
}: {
  item: KnowledgeBase;
  onOpen: (slug: string) => void;
  onEdit: (item: KnowledgeBase) => void;
  onDelete: (item: KnowledgeBase) => void;
  isSubmitting: boolean;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const stopCardClick = (event: MouseEvent | Event) => {
    event.stopPropagation();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="知识库操作"
            className="rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            onClick={stopCardClick}
          >
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-44 rounded-[8px]"
          onClick={stopCardClick}
        >
          <DropdownMenuGroup>
            <DropdownMenuItem
              onSelect={(event) => {
                stopCardClick(event);
                onOpen(item.slug);
              }}
            >
              <MessageCircle />
              使用对话
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(event) => {
                stopCardClick(event);
                onEdit(item);
              }}
            >
              <Pencil />
              编辑知识库
            </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={(event) => {
                  stopCardClick(event);
                  event.preventDefault();
                  if (!isSubmitting) {
                    setDeleteOpen(true);
                  }
                }}
              >
                <Trash2 />
                删除知识库
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent
          onClick={(event) => event.stopPropagation()}
          className="rounded-[8px]"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>删除知识库</AlertDialogTitle>
            <AlertDialogDescription>
              确认删除“{item.name}”吗？删除后无法恢复。后续知识库下有文档时，相关文档也会一并删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-[6px] tracking-normal normal-case">
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="rounded-[6px] tracking-normal normal-case"
              disabled={isSubmitting}
              onClick={() => onDelete(item)}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function RecentCard({
  item,
  onOpen,
  onEdit,
  onDelete,
  isSubmitting,
}: {
  item: KnowledgeBase;
  onOpen: (slug: string) => void;
  onEdit: (item: KnowledgeBase) => void;
  onDelete: (item: KnowledgeBase) => void;
  isSubmitting: boolean;
}) {
  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen(item.slug);
    }
  };

  return (
    <>
      <article
        tabIndex={0}
        onClick={() => onOpen(item.slug)}
        onKeyDown={handleCardKeyDown}
        className="group flex min-h-[160px] cursor-pointer flex-col rounded-[8px] border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <KnowledgeBaseMark item={item} size="lg" />
            <div className="min-w-0 pt-0.5">
              <div className="truncate text-base font-semibold text-slate-900">
                {item.name}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {item.docs} 个文档
              </div>
            </div>
          </div>
          <KnowledgeBaseActionsMenu
            item={item}
            onOpen={onOpen}
            onEdit={onEdit}
            onDelete={onDelete}
            isSubmitting={isSubmitting}
          />
        </div>
        <p className="mt-5 line-clamp-2 min-w-0 break-words text-sm leading-6 text-slate-500">
          {item.description}
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-5 text-xs text-slate-500">
          <span className="min-w-0 truncate">更新于 {item.updatedAt}</span>
          <StatusPill status={item.status} />
        </div>
      </article>
    </>
  );
}

function KnowledgeBaseListItem({
  item,
  onOpen,
  onEdit,
  onDelete,
  isSubmitting,
}: {
  item: KnowledgeBase;
  onOpen: (slug: string) => void;
  onEdit: (item: KnowledgeBase) => void;
  onDelete: (item: KnowledgeBase) => void;
  isSubmitting: boolean;
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen(item.slug);
    }
  };

  return (
    <article
      tabIndex={0}
      onClick={() => onOpen(item.slug)}
      onKeyDown={handleKeyDown}
      className="group flex cursor-pointer flex-col gap-4 rounded-[8px] border border-slate-200 bg-white p-4 text-left shadow-sm transition-all duration-300 hover:border-sky-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 md:flex-row md:items-center"
    >
      <div
        className={cn(
          "relative flex h-24 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-gradient-to-br md:w-40",
          item.theme.coverClass,
        )}
      >
        <div className="absolute -right-8 -top-8 size-24 rounded-full bg-white/60" />
        <div
          className={cn(
            "absolute bottom-0 left-0 h-1 w-full",
            item.theme.coverAccent,
          )}
        />
        <KnowledgeBaseMark item={item} size="lg" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-base font-semibold text-slate-950">
            {item.name}
          </h3>
          {item.featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
              <Star />
              精选
            </span>
          )}
          <StatusPill status={item.status} />
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
          {item.description}
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
          <span>{item.docs} 个文档</span>
          <span>{item.sources} 个来源</span>
          <span>创建于 {formatDateTime(new Date(item.createdAt))}</span>
          <span>更新于 {item.updatedAt}</span>
        </div>
      </div>
      <KnowledgeBaseActionsMenu
        item={item}
        onOpen={onOpen}
        onEdit={onEdit}
        onDelete={onDelete}
        isSubmitting={isSubmitting}
      />
    </article>
  );
}

function NewKnowledgeBaseCard({ onCreate }: { onCreate: () => void }) {
  return (
    <button
      type="button"
      onClick={onCreate}
      className="flex min-h-[160px] flex-col items-center justify-center gap-4 rounded-[8px] border border-dashed border-slate-300 bg-white text-slate-500 transition-all duration-300 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-sky-100 text-sky-700">
        <Plus />
      </span>
      <span className="text-sm font-semibold">新建知识库</span>
    </button>
  );
}

function NewKnowledgeBaseListRow({ onCreate }: { onCreate: () => void }) {
  return (
    <button
      type="button"
      onClick={onCreate}
      className="flex min-h-[96px] items-center justify-center gap-3 rounded-[8px] border border-dashed border-slate-300 bg-white px-4 text-sm font-semibold text-slate-500 transition-all duration-300 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-sky-100 text-sky-700">
        <Plus />
      </span>
      新建知识库
    </button>
  );
}

// 知识库列表视图
export function KnowledgeBaseListView({
  items,
  onCreate,
  onUpdate,
  onDelete,
  isSubmitting,
}: {
  items: KnowledgeBase[];
  onCreate: (request: CreateKnowledgeBaseRequest) => Promise<void>;
  onUpdate: (
    item: KnowledgeBase,
    request: UpdateKnowledgeBaseRequest,
  ) => Promise<void>;
  onDelete: (item: KnowledgeBase) => void;
  isSubmitting: boolean;
}) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<KnowledgeBaseTab>("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<KnowledgeBaseViewMode>("card");
  const [sortMode, setSortMode] = useState<KnowledgeBaseSortMode>("recent");
  const [createdTimeDirection, setCreatedTimeDirection] =
    useState<SortDirection>("desc");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeBase | null>(null);
  const [form, setForm] = useState<NewKnowledgeBaseForm>({
    title: "",
    description: "",
    featured: false,
    themeId: knowledgeBaseThemePresets[0].id,
  });
  const [formErrors, setFormErrors] = useState<
    Partial<Record<"title" | "description", string>>
  >({});
  const searchInputRef = useRef<HTMLInputElement>(null);
  const activeTabMeta =
    knowledgeBaseTabs.find((item) => item.value === activeTab) ??
    knowledgeBaseTabs[0];
  const tabItems = getFilteredKnowledgeBases(items, activeTab);
  const visibleItems = sortKnowledgeBases(
    searchKnowledgeBases(tabItems, searchTerm),
    sortMode,
    sortMode === "createdTime" ? createdTimeDirection : "desc",
  );
  const featuredItems = items
    .filter((item) => item.featured)
    .slice(0, 4);
  const sortLabel =
    sortMode === "recent"
      ? "最近"
      : `创建时间 ${createdTimeDirection === "desc" ? "倒序" : "正序"}`;
  const hasSearchTerm = searchTerm.trim().length > 0;
  const isEditing = !!editingItem;

  const openKnowledgeBase = (slug: string) => {
    navigate(`/KnowledgeBases/${slug}`);
  };

  const openCreateSheet = () => {
    setCreateOpen(true);
  };

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      featured: false,
      themeId: knowledgeBaseThemePresets[0].id,
    });
    setFormErrors({});
    setEditingItem(null);
  };

  const handleCreateOpenChange = (open: boolean) => {
    if (!open && isSubmitting) {
      return;
    }

    setCreateOpen(open);

    if (!open) {
      resetForm();
    }
  };

  const handleSearchButtonClick = () => {
    if (!searchOpen) {
      setSearchOpen(true);
      return;
    }

    if (!searchTerm.trim()) {
      setSearchOpen(false);
    }
  };

  const handleRecentSort = () => {
    setSortMode("recent");
    setCreatedTimeDirection("desc");
  };

  const handleCreatedTimeSort = () => {
    if (sortMode !== "createdTime") {
      setSortMode("createdTime");
      setCreatedTimeDirection("desc");
      return;
    }

    setCreatedTimeDirection((current) => (current === "desc" ? "asc" : "desc"));
  };

  const openEditSheet = (item: KnowledgeBase) => {
    const themePreset =
      knowledgeBaseThemePresets.find(
        (preset) => preset.iconClass === item.theme.iconClass,
      ) ?? knowledgeBaseThemePresets[0];

    setEditingItem(item);
    setForm({
      title: item.name,
      description: item.description,
      featured: item.featured,
      themeId: themePreset.id,
    });
    setFormErrors({});
    setCreateOpen(true);
  };

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = form.title.trim();
    const description = form.description.trim();
    const nextErrors: Partial<Record<"title" | "description", string>> = {};

    if (!title) {
      nextErrors.title = "请输入知识库标题";
    }

    if (!description) {
      nextErrors.description = "请输入知识库介绍";
    }

    setFormErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const request = {
      name: title,
      description,
      featured: form.featured,
      themeId: form.themeId,
    };

    try {
      if (editingItem) {
        await onUpdate(editingItem, request);
      } else {
        await onCreate(request);
      }
    } catch {
      return;
    }

    setCreateOpen(false);
    resetForm();
  };

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  return (
    <section className="min-h-[calc(100svh-5rem)] bg-slate-50/60 px-3 py-4 text-slate-900 sm:px-5">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as KnowledgeBaseTab)}
        className="mx-auto flex max-w-[1440px] flex-col gap-10"
      >
        <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <TabsList
            variant="line"
            className="flex h-auto flex-wrap justify-start gap-3 p-0"
          >
            {knowledgeBaseTabs.map((item) => (
              <TabsTrigger
                key={item.value}
                value={item.value}
                className="h-10 flex-none rounded-full px-5 text-sm font-semibold tracking-normal normal-case text-slate-600 hover:bg-white hover:text-slate-950 data-active:bg-white data-active:text-slate-950 data-active:shadow-sm data-active:hover:bg-white data-active:hover:text-slate-950 group-data-[variant=line]/tabs-list:data-active:after:opacity-0"
              >
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-row-reverse items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-full border-slate-200 bg-white text-slate-700"
                aria-label={searchOpen ? "收起搜索" : "搜索知识库"}
                onClick={handleSearchButtonClick}
              >
                <Search />
              </Button>
              <div
                className={cn(
                  "grid transition-all duration-300",
                  searchOpen
                    ? "w-64 opacity-100"
                    : "pointer-events-none w-0 opacity-0",
                )}
              >
                <div className="flex h-10 min-w-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 shadow-sm">
                  <Input
                    ref={searchInputRef}
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="搜索知识库"
                    aria-label="搜索知识库"
                    className="h-8 border-b-transparent py-0 text-sm focus-visible:border-b-transparent"
                  />
                  {searchTerm && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label="清空搜索"
                      className="rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      onClick={() => setSearchTerm("")}
                    >
                      <X />
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex overflow-hidden rounded-full border border-slate-200 bg-white">
              <Button
                type="button"
                variant={viewMode === "card" ? "default" : "ghost"}
                className={cn(
                  "h-10 rounded-none px-3",
                  viewMode === "card"
                    ? "bg-sky-300 text-white hover:bg-sky-400"
                    : "text-slate-600",
                )}
                aria-label="网格视图"
                onClick={() => setViewMode("card")}
              >
                {viewMode === "card" && <Check />}
                <Grid2X2 />
              </Button>
              <Button
                type="button"
                variant={viewMode === "list" ? "default" : "ghost"}
                className={cn(
                  "h-10 rounded-none px-3",
                  viewMode === "list"
                    ? "bg-sky-300 text-white hover:bg-sky-400"
                    : "text-slate-600",
                )}
                aria-label="列表视图"
                onClick={() => setViewMode("list")}
              >
                {viewMode === "list" && <Check />}
                <LayoutList />
              </Button>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-full border-slate-200 bg-white px-5 text-sm tracking-normal normal-case"
                >
                  {sortLabel}
                  <ChevronDown data-icon="inline-end" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 rounded-[8px]">
                <DropdownMenuGroup>
                  <DropdownMenuItem onSelect={handleRecentSort}>
                    {sortMode === "recent" && <Check />}
                    最近
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={handleCreatedTimeSort}>
                    {sortMode === "createdTime" && <Check />}
                    创建时间
                    <span className="ml-auto text-xs text-slate-400">
                      {sortMode === "createdTime"
                        ? createdTimeDirection === "desc"
                          ? "倒序"
                          : "正序"
                        : "倒序"}
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              type="button"
              className="h-10 rounded-full bg-white px-5 text-sm tracking-normal text-slate-900 shadow-sm hover:bg-slate-50 normal-case"
              onClick={openCreateSheet}
            >
              <Plus data-icon="inline-start" />
              新建
            </Button>
          </div>
        </header>

        {activeTab === "all" && (
          <section>
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold tracking-normal text-slate-950">
              精选知识库
            </h2>
            <Button
              variant="outline"
              className="hidden h-10 rounded-full border-slate-200 bg-white px-5 text-sm tracking-normal normal-case sm:flex"
              onClick={() => setActiveTab("mine")}
            >
              查看全部
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {featuredItems.map((item) => (
              <FeaturedCard
                key={item.id}
                item={item}
                onOpen={openKnowledgeBase}
              />
            ))}
          </div>
          {featuredItems.length === 0 && (
            <KnowledgeBaseEmptyState
              title="暂无精选知识库"
              description="在新建或编辑知识库时勾选精选，这里会展示你的常用知识库。"
            />
          )}
          </section>
        )}

        <TabsContent value={activeTab} forceMount className="m-0">
          <section>
          <h2 className="mb-5 text-2xl font-semibold tracking-normal text-slate-950">
            {activeTabMeta.title}
          </h2>
          {viewMode === "card" ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {activeTab !== "featured" && visibleItems.length > 0 && (
                <NewKnowledgeBaseCard onCreate={openCreateSheet} />
              )}
              {visibleItems.map((item) => (
                <RecentCard
                  key={item.id}
                  item={item}
                  onOpen={openKnowledgeBase}
                  onEdit={openEditSheet}
                  onDelete={onDelete}
                  isSubmitting={isSubmitting}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {activeTab !== "featured" && visibleItems.length > 0 && (
                <NewKnowledgeBaseListRow onCreate={openCreateSheet} />
              )}
              {visibleItems.map((item) => (
                <KnowledgeBaseListItem
                  key={item.id}
                  item={item}
                  onOpen={openKnowledgeBase}
                  onEdit={openEditSheet}
                  onDelete={onDelete}
                  isSubmitting={isSubmitting}
                />
              ))}
            </div>
          )}
          {visibleItems.length === 0 && (
            <KnowledgeBaseEmptyState
              title={hasSearchTerm ? "没有匹配的知识库" : activeTabMeta.empty}
              description={
                hasSearchTerm
                  ? "换一个关键词试试，或清空搜索条件查看全部知识库。"
                  : "创建第一个知识库后，就可以继续上传资料、整理文档，并在后续阶段基于这些资料进行问答。"
              }
              actionLabel={
                !hasSearchTerm && activeTab !== "featured"
                  ? "新建知识库"
                  : undefined
              }
              onAction={
                !hasSearchTerm && activeTab !== "featured"
                  ? openCreateSheet
                  : undefined
              }
            />
          )}
          </section>
        </TabsContent>
      </Tabs>
      <Sheet open={createOpen} onOpenChange={handleCreateOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <form
            onSubmit={handleFormSubmit}
            className="flex min-h-0 flex-1 flex-col"
          >
            <SheetHeader>
              <SheetTitle>{isEditing ? "编辑知识库" : "新建知识库"}</SheetTitle>
              <SheetDescription>
                {isEditing
                  ? "修改知识库名称和介绍，保存后会同步到后端。"
                  : "创建后会保存到当前登录账号的知识库列表。"}
              </SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-auto px-8">
              <FieldGroup className="gap-7">
                <Field data-invalid={!!formErrors.title}>
                  <FieldLabel htmlFor="knowledge-base-title">标题</FieldLabel>
                  <Input
                    id="knowledge-base-title"
                    value={form.title}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }));
                      setFormErrors((current) => ({
                        ...current,
                        title: undefined,
                      }));
                    }}
                    aria-invalid={!!formErrors.title}
                    placeholder="例如：产品需求库"
                  />
                  <FieldError>{formErrors.title}</FieldError>
                </Field>
                <Field data-invalid={!!formErrors.description}>
                  <FieldLabel htmlFor="knowledge-base-description">
                    介绍
                  </FieldLabel>
                  <Textarea
                    id="knowledge-base-description"
                    value={form.description}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }));
                      setFormErrors((current) => ({
                        ...current,
                        description: undefined,
                      }));
                    }}
                    aria-invalid={!!formErrors.description}
                    placeholder="简要描述这个知识库包含的内容"
                    className="min-h-16"
                  />
                  <FieldError>{formErrors.description}</FieldError>
                </Field>
                <Field
                  orientation="horizontal"
                  className="rounded-[8px] border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <Checkbox
                    id="knowledge-base-featured"
                    checked={form.featured}
                    onCheckedChange={(checked) =>
                      setForm((current) => ({
                        ...current,
                        featured: checked === true,
                      }))
                    }
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <FieldLabel
                      htmlFor="knowledge-base-featured"
                      className="text-sm font-medium normal-case tracking-normal text-slate-700"
                    >
                      精选知识库
                    </FieldLabel>
                    <FieldDescription className="text-xs leading-5 text-slate-500">
                      勾选后会展示在精选知识库区域，并随创建或编辑一起保存。
                    </FieldDescription>
                  </div>
                </Field>
                <FieldSet>
                  <FieldLegend>封面</FieldLegend>
                  <div className="grid grid-cols-2 gap-3">
                    {knowledgeBaseThemePresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            themeId: preset.id,
                          }))
                        }
                        className={cn(
                          "relative h-20 overflow-hidden rounded-[8px] border bg-gradient-to-br text-left transition-all duration-200",
                          preset.coverClass,
                          form.themeId === preset.id
                            ? "border-sky-300 ring-2 ring-sky-200"
                            : "border-slate-200 hover:border-sky-200",
                        )}
                      >
                        <span className="absolute -right-5 -top-5 size-16 rounded-full bg-white/60" />
                        <span
                          className={cn(
                            "absolute bottom-0 left-0 h-1 w-full",
                            preset.coverAccent,
                          )}
                        />
                        <span className="relative flex h-full items-center px-3 text-sm font-semibold text-slate-800">
                          {preset.label}
                        </span>
                      </button>
                    ))}
                  </div>
                  <FieldDescription>
                    封面使用本地预设样式，不上传图片。
                  </FieldDescription>
                </FieldSet>
              </FieldGroup>
            </div>
            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-[6px] tracking-normal normal-case"
                onClick={() => setCreateOpen(false)}
                disabled={isSubmitting}
              >
                取消
              </Button>
              <Button
                type="submit"
                className="rounded-[6px] tracking-normal normal-case"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 data-icon="inline-start" />}
                {isEditing ? "保存修改" : "创建知识库"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </section>
  );
}
