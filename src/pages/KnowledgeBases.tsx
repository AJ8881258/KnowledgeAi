import { useCallback, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { useLocation, useNavigate, useParams } from "react-router";
import { Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { getKnowledgeBaseDocuments } from "@/api/documents";
import { createKnowledgeBase as createKnowledgeBaseApi, deleteKnowledgeBase as deleteKnowledgeBaseApi, getKnowledgeBases, updateKnowledgeBase as updateKnowledgeBaseApi, type CreateKnowledgeBaseRequest, type UpdateKnowledgeBaseRequest } from "@/api/knowledge-bases";
import { KnowledgeBaseDetailView } from "@/components/knowledge-bases/knowledge-base-detail-view";
import { KnowledgeBaseListView } from "@/components/knowledge-bases/knowledge-base-list-view";
import type { KnowledgeBase } from "@/components/knowledge-bases/knowledge-base-types";
import { mapKnowledgeBaseResponse } from "@/components/knowledge-bases/knowledge-base-utils";
import { Button } from "@/components/ui/button";
import { clearMockAuthSession } from "@/lib/mock-auth";
import { useKnowledgeBaseUsageStore } from "@/store/knowledge-base-usage";

async function withDocumentStats(items: KnowledgeBase[]) {
  return Promise.all(
    items.map(async (item) => {
      try {
        const documents = await getKnowledgeBaseDocuments(item.id);
        const indexedDocuments = documents.filter(
          (document) => document.status === "INDEXED",
        );

        return {
          ...item,
          docs: documents.length,
          chunks: documents.reduce(
            (total, document) => total + document.chunkCount,
            0,
          ),
          sources: indexedDocuments.length,
        };
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) {
          return item;
        }

        throw error;
      }
    }),
  );
}

const KnowledgeBases = () => {
  const { knowledgeBaseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState<KnowledgeBase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const rememberKnowledgeBase = useKnowledgeBaseUsageStore(
    (state) => state.rememberKnowledgeBase,
  );

  const redirectToLogin = useCallback(() => {
    clearMockAuthSession();
    navigate("/login", {
      replace: true,
      state: { from: location.pathname },
    });
  }, [location.pathname, navigate]);

  const handleKnowledgeBaseError = useCallback(
    (error: unknown) => {
      if (isAxiosError(error)) {
        const status = error.response?.status;

        if (status === 401) {
          toast.error("登录状态已失效，请重新登录");
          redirectToLogin();
          return "登录状态已失效，请重新登录";
        }

        if (status === 400) {
          toast.error("请输入知识库名称");
          return "请输入知识库名称";
        }

        if (status === 404) {
          toast.error("知识库不存在或无权访问");
          return "知识库不存在或无权访问";
        }

        if (!error.response) {
          toast.error("无法连接知识库服务，请确认后端已启动");
          return "无法连接知识库服务，请确认后端已启动";
        }

        if (status && status >= 500) {
          toast.error("知识库服务异常，请确认后端已启动");
          return "知识库服务异常，请确认后端已启动";
        }
      }

      toast.error("操作失败，请稍后重试");
      return "操作失败，请稍后重试";
    },
    [redirectToLogin],
  );

  const loadKnowledgeBases = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const knowledgeBases = await getKnowledgeBases();
      const nextItems = await withDocumentStats(
        knowledgeBases.map(mapKnowledgeBaseResponse),
      );

      setItems(nextItems);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) {
        toast.error("登录状态已失效，请重新登录");
        redirectToLogin();
        setLoadError("登录状态已失效，请重新登录");
      } else if (
        isAxiosError(error) &&
        (!error.response || (error.response.status >= 500))
      ) {
        toast.error("知识库服务异常，请确认后端已启动");
        setLoadError("知识库服务异常，请确认后端已启动");
      } else {
        toast.error("操作失败，请稍后重试");
        setLoadError("操作失败，请稍后重试");
      }
    } finally {
      setIsLoading(false);
    }
  }, [redirectToLogin]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadKnowledgeBases();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadKnowledgeBases]);

  const createKnowledgeBase = async (request: CreateKnowledgeBaseRequest) => {
    setIsSubmitting(true);

    try {
      const createdKnowledgeBase = await createKnowledgeBaseApi(request);
      const nextItem = mapKnowledgeBaseResponse(createdKnowledgeBase);

      setItems((currentItems) => [nextItem, ...currentItems]);
      toast.success(`已新建知识库：${nextItem.name}`);
    } catch (error) {
      handleKnowledgeBaseError(error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateKnowledgeBase = async (
    item: KnowledgeBase,
    request: UpdateKnowledgeBaseRequest,
  ) => {
    setIsSubmitting(true);

    try {
      const updatedKnowledgeBase = await updateKnowledgeBaseApi(
        item.id,
        request,
      );
      const nextItem = mapKnowledgeBaseResponse(updatedKnowledgeBase);

      setItems((currentItems) =>
        currentItems.map((currentItem) => {
          if (currentItem.id !== nextItem.id) {
            return currentItem;
          }

          return {
            ...nextItem,
            docs: currentItem.docs,
            chunks: currentItem.chunks,
            sources: currentItem.sources,
          };
        }),
      );
      toast.success(`已更新知识库：${nextItem.name}`);
    } catch (error) {
      handleKnowledgeBaseError(error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteKnowledgeBase = async (item: KnowledgeBase) => {
    setIsSubmitting(true);

    try {
      await deleteKnowledgeBaseApi(item.id);

      setItems((currentItems) =>
        currentItems.filter((currentItem) => currentItem.id !== item.id),
      );
      toast.success(`已删除知识库：${item.name}`);

      if (knowledgeBaseId === item.id) {
        navigate("/KnowledgeBases");
      }
    } catch (error) {
      handleKnowledgeBaseError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const current = knowledgeBaseId
    ? items.find((item) => item.id === knowledgeBaseId)
    : undefined;

  useEffect(() => {
    if (current) {
      rememberKnowledgeBase(current.id);
    }
  }, [current, rememberKnowledgeBase]);

  if (isLoading) {
    return (
      <section className="flex min-h-[calc(100svh-5rem)] items-center justify-center bg-slate-50/60 px-5 text-slate-600">
        <div className="flex items-center gap-3 rounded-[8px] border border-slate-200 bg-white px-5 py-4 text-sm shadow-sm">
          <Loader2 className="size-4 animate-spin text-sky-500" />
          正在加载知识库...
        </div>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="flex min-h-[calc(100svh-5rem)] items-center justify-center bg-slate-50/60 px-5 text-slate-900">
        <div className="w-full max-w-md rounded-[8px] border border-slate-200 bg-white px-6 py-8 text-center shadow-sm">
          <TriangleAlert className="mx-auto size-8 text-orange-500" />
          <h2 className="mt-4 text-base font-semibold">知识库加载失败</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{loadError}</p>
          <Button
            type="button"
            className="mt-5 rounded-[6px] tracking-normal normal-case"
            onClick={() => void loadKnowledgeBases()}
          >
            重新加载
          </Button>
        </div>
      </section>
    );
  }

  if (!knowledgeBaseId) {
    return (
      <KnowledgeBaseListView
        items={items}
        onCreate={createKnowledgeBase}
        onUpdate={updateKnowledgeBase}
        onDelete={deleteKnowledgeBase}
        isSubmitting={isSubmitting}
      />
    );
  }

  if (!current) {
    return (
      <section className="flex min-h-[calc(100svh-5rem)] items-center justify-center bg-slate-50/60 px-5 text-slate-900">
        <div className="w-full max-w-md rounded-[8px] border border-slate-200 bg-white px-6 py-8 text-center shadow-sm">
          <TriangleAlert className="mx-auto size-8 text-orange-500" />
          <h2 className="mt-4 text-base font-semibold">知识库不存在</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            这个知识库不存在，或你没有访问权限。
          </p>
          <Button
            type="button"
            className="mt-5 rounded-[6px] tracking-normal normal-case"
            onClick={() => navigate("/KnowledgeBases")}
          >
            返回知识库列表
          </Button>
        </div>
      </section>
    );
  }

  return <KnowledgeBaseDetailView current={current} items={items} />;
};

export default KnowledgeBases;
