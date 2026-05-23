import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { useLocation, useNavigate, useParams } from "react-router";
import { Loader2, MessageCircle, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { getKnowledgeBaseDocuments } from "@/api/documents";
import { getKnowledgeBases } from "@/api/knowledge-bases";
import { RagChatWorkspace } from "@/components/chat-page/rag-chat-workspace";
import type { KnowledgeBase } from "@/components/knowledge-bases/knowledge-base-types";
import { mapKnowledgeBaseResponse } from "@/components/knowledge-bases/knowledge-base-utils";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";
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

const Chat = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const locationPathnameRef = useRef(location.pathname);
  const navigateRef = useRef(navigate);
  const recentKnowledgeBaseIdRef = useRef<string | null>(null);
  const recentKnowledgeBaseId = useKnowledgeBaseUsageStore(
    (state) => state.recentKnowledgeBaseId,
  );
  const rememberKnowledgeBase = useKnowledgeBaseUsageStore(
    (state) => state.rememberKnowledgeBase,
  );
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    locationPathnameRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  useEffect(() => {
    recentKnowledgeBaseIdRef.current = recentKnowledgeBaseId;
  }, [recentKnowledgeBaseId]);

  const redirectToLogin = useCallback(() => {
    clearSession();
    navigateRef.current("/login", {
      replace: true,
      state: { from: locationPathnameRef.current },
    });
  }, [clearSession]);

  const loadKnowledgeBases = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const response = await getKnowledgeBases();
      const nextKnowledgeBases = await withDocumentStats(
        response.map(mapKnowledgeBaseResponse),
      );
      const preferredKnowledgeBaseId = recentKnowledgeBaseIdRef.current;
      const preferredKnowledgeBase =
        nextKnowledgeBases.find((item) => item.id === preferredKnowledgeBaseId) ??
        nextKnowledgeBases[0] ??
        null;

      setKnowledgeBases(nextKnowledgeBases);
      setSelectedKnowledgeBaseId(preferredKnowledgeBase?.id ?? "");
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) {
        toast.error("登录状态已失效，请重新登录");
        redirectToLogin();
        setLoadError("登录状态已失效，请重新登录");
      } else if (
        isAxiosError(error) &&
        (!error.response || error.response.status >= 500)
      ) {
        setLoadError("知识库服务异常，请确认后端已启动");
      } else {
        setLoadError("知识库加载失败，请稍后重试");
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

  const selectedKnowledgeBase = useMemo(
    () =>
      knowledgeBases.find((item) => item.id === selectedKnowledgeBaseId) ??
      knowledgeBases[0],
    [knowledgeBases, selectedKnowledgeBaseId],
  );

  const handleKnowledgeBaseChange = useCallback(
    (knowledgeBaseId: string) => {
      if (knowledgeBaseId === selectedKnowledgeBaseId) {
        return;
      }

      setSelectedKnowledgeBaseId(knowledgeBaseId);
      rememberKnowledgeBase(knowledgeBaseId);

      if (conversationId) {
        navigate("/Chat", { replace: true });
      }
    },
    [conversationId, navigate, rememberKnowledgeBase, selectedKnowledgeBaseId],
  );

  const handleSessionChange = useCallback(
    (sessionId: string) => {
      if (conversationId === sessionId) {
        return;
      }

      navigate(`/Chat/${sessionId}`, { replace: true });
    },
    [conversationId, navigate],
  );

  const handleSessionCleared = useCallback(() => {
    if (!conversationId) {
      return;
    }

    navigate("/Chat", { replace: true });
  }, [conversationId, navigate]);

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
          <h2 className="mt-4 text-base font-semibold">问答入口加载失败</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{loadError}</p>
          <Button
            type="button"
            className="mt-5 cursor-pointer rounded-[6px] tracking-normal normal-case"
            onClick={() => void loadKnowledgeBases()}
          >
            重新加载
          </Button>
        </div>
      </section>
    );
  }

  if (!selectedKnowledgeBase) {
    return (
      <section className="flex min-h-[calc(100svh-5rem)] items-center justify-center bg-slate-50/60 px-5 text-slate-900">
        <div className="w-full max-w-md rounded-[8px] border border-dashed border-slate-300 bg-white px-6 py-8 text-center shadow-sm">
          <MessageCircle className="mx-auto size-9 text-slate-400" />
          <h2 className="mt-4 text-base font-semibold">暂无可问答的知识库</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            请先创建知识库并上传文档，再回到这里发起 RAG 问答。
          </p>
          <Button
            type="button"
            className="mt-5 cursor-pointer rounded-[6px] tracking-normal normal-case"
            onClick={() => navigate("/KnowledgeBases")}
          >
            去创建知识库
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="h-[calc(100svh-5rem)] min-h-[720px] overflow-hidden border border-slate-200 bg-white shadow-sm">
      <RagChatWorkspace
        knowledgeBase={selectedKnowledgeBase}
        knowledgeBases={knowledgeBases}
        onKnowledgeBaseChange={handleKnowledgeBaseChange}
        initialSessionId={conversationId}
        onSessionChange={handleSessionChange}
        onSessionCleared={handleSessionCleared}
        onUnauthorized={redirectToLogin}
      />
    </section>
  );
};

export default Chat;
