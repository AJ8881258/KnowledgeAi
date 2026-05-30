import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { isAxiosError } from "axios";
import { useLocation, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import {
  deleteDocument,
  generateDocumentSummary,
  getDocument,
  getDocumentChunks,
  getDocumentQuality,
  getKnowledgeBaseDocuments,
  reprocessDocument,
  uploadKnowledgeBaseDocument,
  type DocumentChunkResponse,
  type DocumentQualityResponse,
} from "@/api/documents";
import { getKnowledgeBases, type KnowledgeBaseResponse } from "@/api/knowledge-bases";
import { DocumentDetails, EmptyDocumentDetails } from "@/components/documents/document-details";
import { DocumentTable } from "@/components/documents/document-table";
import { DocumentToolbar } from "@/components/documents/document-toolbar";
import { DocumentUploadZone } from "@/components/documents/document-upload-zone";
import { ErrorPanel, EmptyPanel, LoadingPanel } from "@/components/documents/document-common";
import { documentUploadAccept } from "@/components/documents/document-data";
import type { DocumentItem, PageSize, StatusFilter, TypeTab } from "@/components/documents/document-types";
import { getApiErrorMessage, getFileValidationMessage, getPaginationItems, isAllowedFile, mapDocument } from "@/components/documents/document-utils";
import { canMutateKnowledgeBaseDocuments } from "@/components/knowledge-bases/knowledge-base-permissions";
import { mapKnowledgeBaseResponse } from "@/components/knowledge-bases/knowledge-base-utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { clearMockAuthSession } from "@/lib/mock-auth";
import { useKnowledgeBaseUsageStore } from "@/store/knowledge-base-usage";

function getKnowledgeBaseUpdatedTime(item: KnowledgeBaseResponse) {
  const time = new Date(item.updatedAt).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function getMostRecentlyUpdatedKnowledgeBase(items: KnowledgeBaseResponse[]) {
  return [...items].sort(
    (first, second) =>
      getKnowledgeBaseUpdatedTime(second) - getKnowledgeBaseUpdatedTime(first),
  )[0];
}

const Documents = () => {
  const { knowledgeBaseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recentKnowledgeBaseId = useKnowledgeBaseUsageStore(
    (state) => state.recentKnowledgeBaseId,
  );
  const rememberKnowledgeBase = useKnowledgeBaseUsageStore(
    (state) => state.rememberKnowledgeBase,
  );

  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseResponse[]>(
    [],
  );
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [chunks, setChunks] = useState<DocumentChunkResponse[]>([]);
  const [typeTab, setTypeTab] = useState<TypeTab>("全部");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(
    null,
  );
  const [documentToDelete, setDocumentToDelete] = useState<DocumentItem | null>(
    null,
  );
  const [documentToReprocess, setDocumentToReprocess] =
    useState<DocumentItem | null>(null);
  const [quality, setQuality] = useState<DocumentQualityResponse | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingKnowledgeBases, setIsLoadingKnowledgeBases] = useState(true);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reprocessingDocumentId, setReprocessingDocumentId] = useState<
    number | null
  >(null);
  const [isLoadingQuality, setIsLoadingQuality] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);
  const [knowledgeBaseLoadError, setKnowledgeBaseLoadError] = useState("");
  const [documentLoadError, setDocumentLoadError] = useState("");
  const [chunkError, setChunkError] = useState("");
  const [qualityError, setQualityError] = useState("");
  const [summaryError, setSummaryError] = useState("");

  const hasKnowledgeBaseId = Boolean(knowledgeBaseId);
  const currentKnowledgeBase = knowledgeBases.find(
    (item) => String(item.id) === String(knowledgeBaseId),
  );
  const currentKnowledgeBaseModel = currentKnowledgeBase
    ? mapKnowledgeBaseResponse(currentKnowledgeBase)
    : null;
  const canMutateDocuments = currentKnowledgeBaseModel
    ? canMutateKnowledgeBaseDocuments(currentKnowledgeBaseModel)
    : false;
  const documentMutationDisabledReason =
    "当前角色为只读，只能查看和检索文档，不能上传、删除或重新处理文档。";
  const getReprocessDisabledReason = (doc: DocumentItem) => {
    if (!canMutateDocuments) {
      return documentMutationDisabledReason;
    }

    if (doc.reprocessAvailable === false) {
      return doc.status === "FAILED"
        ? "此文档没有保存原始来源，无法自动重试，请重新上传文件。"
        : "当前文档缺少可重新处理的原始来源。";
    }

    return "";
  };
  const currentKnowledgeBaseLabel = hasKnowledgeBaseId
    ? currentKnowledgeBase?.name ?? `知识库 #${knowledgeBaseId}`
    : "";

  const redirectToLogin = useCallback(() => {
    clearMockAuthSession();
    navigate("/login", {
      replace: true,
      state: { from: location.pathname },
    });
  }, [location.pathname, navigate]);

  const handleApiError = useCallback(
    (error: unknown) => {
      if (isAxiosError(error) && error.response?.status === 401) {
        toast.error("登录状态已失效，请重新登录");
        redirectToLogin();
        return "登录状态已失效，请重新登录";
      }

      const message = getApiErrorMessage(error);
      toast.error(message);
      return message;
    },
    [redirectToLogin],
  );

  const loadKnowledgeBaseOptions = useCallback(async () => {
    setIsLoadingKnowledgeBases(true);
    setKnowledgeBaseLoadError("");

    try {
      const response = await getKnowledgeBases();
      setKnowledgeBases(response);
    } catch (error) {
      setKnowledgeBaseLoadError(handleApiError(error));
    } finally {
      setIsLoadingKnowledgeBases(false);
    }
  }, [handleApiError]);

  const loadDocuments = useCallback(async () => {
    if (!knowledgeBaseId) {
      setDocuments([]);
      setSelectedDocumentId(null);
      setDocumentLoadError("");
      return;
    }

    setIsLoadingDocuments(true);
    setDocumentLoadError("");

    try {
      const response = await getKnowledgeBaseDocuments(knowledgeBaseId);
      const nextDocuments = response.map(mapDocument);

      setDocuments(nextDocuments);
      setSelectedDocumentId((currentId) => {
        if (currentId && nextDocuments.some((doc) => doc.id === currentId)) {
          return currentId;
        }

        return nextDocuments[0]?.id ?? null;
      });
    } catch (error) {
      setDocuments([]);
      setSelectedDocumentId(null);
      setDocumentLoadError(handleApiError(error));
    } finally {
      setIsLoadingDocuments(false);
    }
  }, [handleApiError, knowledgeBaseId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadKnowledgeBaseOptions();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadKnowledgeBaseOptions]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDocuments();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadDocuments]);

  useEffect(() => {
    if (!knowledgeBaseId || !currentKnowledgeBase) {
      return;
    }

    rememberKnowledgeBase(currentKnowledgeBase.id);
  }, [currentKnowledgeBase, knowledgeBaseId, rememberKnowledgeBase]);

  useEffect(() => {
    if (
      hasKnowledgeBaseId ||
      isLoadingKnowledgeBases ||
      knowledgeBaseLoadError ||
      knowledgeBases.length === 0
    ) {
      return;
    }

    const recentKnowledgeBase = knowledgeBases.find(
      (item) => String(item.id) === recentKnowledgeBaseId,
    );
    const targetKnowledgeBase =
      recentKnowledgeBase ?? getMostRecentlyUpdatedKnowledgeBase(knowledgeBases);

    if (targetKnowledgeBase) {
      navigate(`/Documents/${targetKnowledgeBase.id}`, { replace: true });
    }
  }, [
    hasKnowledgeBaseId,
    isLoadingKnowledgeBases,
    knowledgeBaseLoadError,
    knowledgeBases,
    navigate,
    recentKnowledgeBaseId,
  ]);

  const resetDocumentView = () => {
    setCurrentPage(1);
    setChunks([]);
    setChunkError("");
    setQuality(null);
    setQualityError("");
    setSummaryError("");
  };

  const handleTypeTabChange = (value: TypeTab) => {
    setTypeTab(value);
    resetDocumentView();
  };

  const handleStatusFilterChange = (value: StatusFilter) => {
    setStatusFilter(value);
    resetDocumentView();
  };

  const handlePageSizeChange = (value: PageSize) => {
    setPageSize(value);
    resetDocumentView();
  };

  const typeFiltered =
    typeTab === "全部"
      ? documents
      : documents.filter((doc) => doc.type === typeTab);

  const filteredDocuments =
    statusFilter === "ALL"
      ? typeFiltered
      : typeFiltered.filter((doc) => doc.status === statusFilter);

  const totalItems = filteredDocuments.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * pageSize;
  const displayedDocuments = filteredDocuments.slice(
    pageStartIndex,
    pageStartIndex + pageSize,
  );
  const displayStart = totalItems === 0 ? 0 : pageStartIndex + 1;
  const displayEnd = Math.min(pageStartIndex + displayedDocuments.length, totalItems);
  const paginationItems = getPaginationItems(safeCurrentPage, totalPages);
  const selectedDocument =
    documents.find((doc) => doc.id === selectedDocumentId) ??
    displayedDocuments[0] ??
    null;

  const selectDocument = async (doc: DocumentItem) => {
    setSelectedDocumentId(doc.id);
    setChunks([]);
    setChunkError("");
    setQuality(null);
    setQualityError("");
    setSummaryError("");

    try {
      const detail = await getDocument(doc.id);
      const nextDocument = mapDocument(detail);
      setDocuments((currentDocuments) =>
        currentDocuments.map((currentDocument) =>
          currentDocument.id === nextDocument.id
            ? nextDocument
            : currentDocument,
        ),
      );
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) {
        handleApiError(error);
        return;
      }

      setChunkError(getApiErrorMessage(error));
    }
  };

  const loadChunks = async () => {
    if (!selectedDocument) {
      return;
    }

    setIsLoadingChunks(true);
    setChunkError("");

    try {
      const response = await getDocumentChunks(selectedDocument.id);
      setChunks(response);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) {
        handleApiError(error);
        return;
      }

      setChunkError(getApiErrorMessage(error));
    } finally {
      setIsLoadingChunks(false);
    }
  };

  const loadQuality = async () => {
    if (!selectedDocument) {
      return;
    }

    setIsLoadingQuality(true);
    setQualityError("");

    try {
      const response = await getDocumentQuality(selectedDocument.id);
      setQuality(response);
      setDocuments((currentDocuments) =>
        currentDocuments.map((currentDocument) =>
          currentDocument.id === selectedDocument.id
            ? {
                ...currentDocument,
                status: response.status,
                chunkCount: response.chunkCount,
                charCount: response.charCount,
                averageChunkLength: response.averageChunkLength,
                qualityWarnings: response.qualityWarnings,
                updatedAt: response.updatedAt,
              }
            : currentDocument,
        ),
      );
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) {
        handleApiError(error);
        return;
      }

      setQualityError(getApiErrorMessage(error));
    } finally {
      setIsLoadingQuality(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!selectedDocument || isGeneratingSummary) {
      return;
    }

    setIsGeneratingSummary(true);
    setSummaryError("");

    try {
      const response = await generateDocumentSummary(selectedDocument.id, {
        maxLength: 500,
      });

      setDocuments((currentDocuments) =>
        currentDocuments.map((currentDocument) =>
          currentDocument.id === selectedDocument.id
            ? {
                ...currentDocument,
                summary: response.summary,
                updatedAt: response.updatedAt,
              }
            : currentDocument,
        ),
      );
      toast.success("文档摘要已生成");
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) {
        handleApiError(error);
        return;
      }

      const message = getApiErrorMessage(error);
      setSummaryError(message);
      toast.error(message);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const processFiles = async (files: FileList | null) => {
    if (!files?.length || isUploading) return;

    if (!canMutateDocuments) {
      toast.error(documentMutationDisabledReason);
      return;
    }

    if (!knowledgeBaseId) {
      toast.error("请先选择一个知识库，再上传文档");
      return;
    }

    const fileArray = Array.from(files);
    const invalidMessages = fileArray
      .map(getFileValidationMessage)
      .filter(Boolean);
    const validFiles = fileArray.filter(isAllowedFile);

    if (invalidMessages.length > 0) {
      toast.error(invalidMessages[0]);
    }

    if (validFiles.length === 0) {
      return;
    }

    setIsUploading(true);

    try {
      for (const file of validFiles) {
        await uploadKnowledgeBaseDocument(knowledgeBaseId, file);
      }

      toast.success(`已上传 ${validFiles.length} 个文档`);
      await loadDocuments();
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    void processFiles(event.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    if (!isUploading && knowledgeBaseId && canMutateDocuments) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    void processFiles(event.dataTransfer.files);
  };

  const confirmDeleteDocument = async () => {
    if (!documentToDelete) {
      return;
    }

    if (!canMutateDocuments) {
      toast.error(documentMutationDisabledReason);
      setDocumentToDelete(null);
      return;
    }

    setIsDeleting(true);

    try {
      await deleteDocument(documentToDelete.id);
      toast.success(`已删除文档：${documentToDelete.originalFilename}`);
      setDocumentToDelete(null);
      setChunks([]);
      setQuality(null);
      await loadDocuments();
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmReprocessDocument = async () => {
    if (!documentToReprocess || reprocessingDocumentId) {
      return;
    }

    if (!canMutateDocuments) {
      toast.error(documentMutationDisabledReason);
      setDocumentToReprocess(null);
      return;
    }

    if (documentToReprocess.reprocessAvailable === false) {
      toast.error(getReprocessDisabledReason(documentToReprocess));
      setDocumentToReprocess(null);
      return;
    }

    setReprocessingDocumentId(documentToReprocess.id);
    setChunkError("");
    setQualityError("");
    setSummaryError("");

    try {
      const response = await reprocessDocument(documentToReprocess.id);
      const nextDocument = mapDocument(response);

      setDocuments((currentDocuments) =>
        currentDocuments.map((currentDocument) =>
          currentDocument.id === nextDocument.id
            ? nextDocument
            : currentDocument,
        ),
      );
      setDocumentToReprocess(null);

      if (selectedDocumentId === nextDocument.id) {
        setQuality(null);
        await Promise.all([
          getDocumentQuality(nextDocument.id)
            .then(setQuality)
            .catch((error) => setQualityError(getApiErrorMessage(error))),
          chunks.length > 0
            ? getDocumentChunks(nextDocument.id)
                .then(setChunks)
                .catch((error) => setChunkError(getApiErrorMessage(error)))
            : Promise.resolve(),
        ]);
      }

      await loadDocuments();
      toast.success(
        nextDocument.status === "FAILED"
          ? "重新处理已完成，但文档仍处于失败状态"
          : "文档已重新处理",
      );
    } catch (error) {
      handleApiError(error);
    } finally {
      setReprocessingDocumentId(null);
    }
  };

  const renderMainContent = () => {
    if (!hasKnowledgeBaseId) {
      return (
        <EmptyPanel
          title="暂无可用知识库"
          description="当前账号还没有可用于管理文档的知识库。新建知识库后即可上传、查看和删除文档。"
          actionLabel="前往知识库"
          onAction={() => navigate("/KnowledgeBases")}
        />
      );
    }

    if (isLoadingDocuments) {
      return <LoadingPanel message="正在加载文档..." />;
    }

    if (documentLoadError) {
      return (
        <ErrorPanel
          title="文档加载失败"
          description={documentLoadError}
          onRetry={() => void loadDocuments()}
        />
      );
    }

    return (
      <DocumentTable
        documents={displayedDocuments}
        selectedDocumentId={selectedDocument?.id}
        knowledgeBaseLabel={currentKnowledgeBaseLabel}
        totalItems={totalItems}
        displayStart={displayStart}
        displayEnd={displayEnd}
        currentPage={safeCurrentPage}
        totalPages={totalPages}
        paginationItems={paginationItems}
        pageSize={pageSize}
        isDeleting={isDeleting}
        reprocessingDocumentId={reprocessingDocumentId}
        canDeleteDocuments={canMutateDocuments}
        canReprocessDocuments={canMutateDocuments}
        deleteDisabledReason={documentMutationDisabledReason}
        reprocessDisabledReason={documentMutationDisabledReason}
        onSelectDocument={(doc) => void selectDocument(doc)}
        onDeleteDocument={setDocumentToDelete}
        onReprocessDocument={(doc) => {
          const reason = getReprocessDisabledReason(doc);
          if (reason) {
            toast.error(reason);
            return;
          }
          setDocumentToReprocess(doc);
        }}
        onPageChange={setCurrentPage}
        onPageSizeChange={handlePageSizeChange}
      />
    );
  };

  return (
    <section className="min-h-0 bg-white text-slate-900 xl:h-[calc(100svh-5rem)] xl:max-h-[calc(100svh-5rem)] xl:overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept={documentUploadAccept}
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="grid min-h-0 grid-cols-1 xl:h-full xl:overflow-hidden xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="min-w-0 overflow-auto bg-white px-4 py-4 xl:px-5">
          <div className="flex min-h-full flex-col gap-4">
            <DocumentToolbar
              knowledgeBaseId={knowledgeBaseId}
              knowledgeBases={knowledgeBases}
              isLoadingKnowledgeBases={isLoadingKnowledgeBases}
              currentKnowledgeBaseLabel={currentKnowledgeBaseLabel}
              typeTab={typeTab}
              statusFilter={statusFilter}
              isUploading={isUploading}
              canUpload={canMutateDocuments}
              uploadDisabledReason={documentMutationDisabledReason}
              onNavigate={navigate}
              onTypeTabChange={handleTypeTabChange}
              onStatusFilterChange={handleStatusFilterChange}
              onUploadClick={() => fileInputRef.current?.click()}
            />

            {knowledgeBaseLoadError ? (
              <ErrorPanel
                title="知识库列表加载失败"
                description={knowledgeBaseLoadError}
                onRetry={() => void loadKnowledgeBaseOptions()}
              />
            ) : (
              <>
                <DocumentUploadZone
                  knowledgeBaseId={knowledgeBaseId}
                  isUploading={isUploading}
                  isDragging={isDragging}
                  canUpload={canMutateDocuments}
                  disabledReason={documentMutationDisabledReason}
                  onUploadClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                />

                {renderMainContent()}
              </>
            )}
          </div>
        </main>

        {selectedDocument ? (
          <DocumentDetails
            item={selectedDocument}
            chunks={chunks}
            isLoadingChunks={isLoadingChunks}
            chunkError={chunkError}
            quality={quality}
            isLoadingQuality={isLoadingQuality}
            qualityError={qualityError}
            isGeneratingSummary={isGeneratingSummary}
            summaryError={summaryError}
            isReprocessing={reprocessingDocumentId === selectedDocument.id}
            canReprocess={canMutateDocuments}
            reprocessDisabledReason={getReprocessDisabledReason(selectedDocument)}
            onLoadChunks={() => void loadChunks()}
            onLoadQuality={() => void loadQuality()}
            onGenerateSummary={() => void handleGenerateSummary()}
            onReprocess={() => {
              const reason = getReprocessDisabledReason(selectedDocument);
              if (reason) {
                toast.error(reason);
                return;
              }
              setDocumentToReprocess(selectedDocument);
            }}
            onNavigateChat={() => navigate("/Chat")}
            onClose={() => setSelectedDocumentId(null)}
          />
        ) : (
          <EmptyDocumentDetails />
        )}
      </div>

      <AlertDialog
        open={Boolean(documentToDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDocumentToDelete(null);
          }
        }}
      >
        <AlertDialogContent className="rounded-[8px]">
          <AlertDialogHeader>
            <AlertDialogTitle>删除文档</AlertDialogTitle>
            <AlertDialogDescription>
              确认删除“{documentToDelete?.originalFilename}”吗？删除后对应
              chunks 也会一并删除，无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              className="rounded-[6px] tracking-normal normal-case"
            >
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              className="rounded-[6px] tracking-normal normal-case"
              onClick={(event) => {
                event.preventDefault();
                void confirmDeleteDocument();
              }}
            >
              {isDeleting ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(documentToReprocess)}
        onOpenChange={(open) => {
          if (!open && !reprocessingDocumentId) {
            setDocumentToReprocess(null);
          }
        }}
      >
        <AlertDialogContent className="rounded-[8px]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {documentToReprocess?.status === "FAILED"
                ? "重试失败文档"
                : "重新处理文档"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {documentToReprocess?.sourceStored
                ? `确认重新解析“${documentToReprocess.originalFilename}”并替换当前 chunks 吗？处理完成后，检索和 Chat 引用会使用新的 chunks。`
                : `确认基于当前已索引文本重新处理“${documentToReprocess?.originalFilename}”并替换当前 chunks 吗？这不会恢复原始文件中未成功解析的内容。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={Boolean(reprocessingDocumentId)}
              className="rounded-[6px] tracking-normal normal-case"
            >
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={Boolean(reprocessingDocumentId)}
              className="rounded-[6px] tracking-normal normal-case"
              onClick={(event) => {
                event.preventDefault();
                void confirmReprocessDocument();
              }}
            >
              {reprocessingDocumentId ? "处理中..." : "确认重新处理"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export default Documents;
