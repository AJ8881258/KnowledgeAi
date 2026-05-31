package com.knowflow.backend.document.service;

import com.knowflow.backend.document.dto.response.DocumentProcessingJobResponse;
import com.knowflow.backend.document.entity.Document;
import com.knowflow.backend.document.entity.DocumentChunk;
import com.knowflow.backend.document.entity.DocumentProcessingJob;
import com.knowflow.backend.document.rag.DocumentRetrievalService;
import com.knowflow.backend.document.rag.EmbeddingModelClient;
import com.knowflow.backend.document.repository.DocumentChunkRepository;
import com.knowflow.backend.document.repository.DocumentProcessingJobRepository;
import com.knowflow.backend.document.repository.DocumentRepository;
import com.knowflow.backend.knowledgebase.service.KnowledgeBaseAccessService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
public class DocumentProcessingJobService {
    public static final String JOB_TYPE_UPLOAD_INDEX = "UPLOAD_INDEX";
    public static final String JOB_TYPE_REPROCESS = "REPROCESS";
    public static final String JOB_TYPE_REBUILD_SEMANTIC_INDEX = "REBUILD_SEMANTIC_INDEX";
    public static final String JOB_STATUS_QUEUED = "QUEUED";
    public static final String JOB_STATUS_RUNNING = "RUNNING";
    public static final String JOB_STATUS_SUCCEEDED = "SUCCEEDED";
    public static final String JOB_STATUS_FAILED = "FAILED";
    public static final String JOB_STATUS_CANCELED = "CANCELED";
    public static final String JOB_STATUS_ACTIVE = "ACTIVE";

    private static final String STATUS_PROCESSING = "PROCESSING";
    private static final String STATUS_INDEXED = "INDEXED";
    private static final String STATUS_FAILED = "FAILED";
    private static final String EMBEDDING_STATUS_PROCESSING = "PROCESSING";
    private static final String EMBEDDING_STATUS_INDEXED = "INDEXED";
    private static final String EMBEDDING_STATUS_SKIPPED = "SKIPPED";
    private static final String EMBEDDING_STATUS_FAILED = "FAILED";
    private static final int CHUNK_SIZE = 1000;
    private static final int CHUNK_OVERLAP = 150;
    private static final String NO_REPROCESS_SOURCE_MESSAGE =
            "Document cannot be reprocessed because no source or indexed text is available";
    private static final Set<String> RETRYABLE_STATUSES = Set.of(JOB_STATUS_FAILED, JOB_STATUS_CANCELED);
    private static final Set<String> ACTIVE_STATUSES = Set.of(JOB_STATUS_QUEUED, JOB_STATUS_RUNNING);

    private final KnowledgeBaseAccessService accessService;
    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final DocumentProcessingJobRepository jobRepository;
    private final DocumentTextExtractor documentTextExtractor;
    private final EmbeddingModelClient embeddingModelClient;
    private final TransactionTemplate transactionTemplate;

    public DocumentProcessingJobService(
            KnowledgeBaseAccessService accessService,
            DocumentRepository documentRepository,
            DocumentChunkRepository documentChunkRepository,
            DocumentProcessingJobRepository jobRepository,
            DocumentTextExtractor documentTextExtractor,
            EmbeddingModelClient embeddingModelClient,
            TransactionTemplate transactionTemplate) {
        this.accessService = accessService;
        this.documentRepository = documentRepository;
        this.documentChunkRepository = documentChunkRepository;
        this.jobRepository = jobRepository;
        this.documentTextExtractor = documentTextExtractor;
        this.embeddingModelClient = embeddingModelClient;
        this.transactionTemplate = transactionTemplate;
    }

    /**
     * Creates an upload indexing job for a newly inserted document.
     *
     * @param document document row containing saved source_bytes from the upload request
     * @param requestedBy current user who uploaded the file
     * @return durable job row in QUEUED status
     */
    public DocumentProcessingJob createUploadJob(Document document, Long requestedBy) {
        return createJob(document.getId(), document.getKnowledgeBaseId(), requestedBy, JOB_TYPE_UPLOAD_INDEX);
    }

    /**
     * Creates a reprocess job for an existing accessible document.
     *
     * @param document document row; source fields are loaded by the controller before this call
     * @param requestedBy current user who requested the reprocess action
     * @return durable job row in QUEUED status
     */
    public DocumentProcessingJob createReprocessJob(Document document, Long requestedBy) {
        return createJob(document.getId(), document.getKnowledgeBaseId(), requestedBy, JOB_TYPE_REPROCESS);
    }

    /**
     * Creates a semantic rebuild job without changing the document text status.
     *
     * @param document indexed document whose existing chunks will be re-embedded
     * @param requestedBy current OWNER/EDITOR user requesting the rebuild
     * @return durable job row in QUEUED status
     * @Desc Unlike upload indexing or reprocess, this job must not mark documents.status as
     * PROCESSING because full-text chunks remain valid and searchable while embeddings refresh.
     */
    public DocumentProcessingJob createSemanticRebuildJob(Document document, Long requestedBy) {
        return createJob(document.getId(), document.getKnowledgeBaseId(), requestedBy, JOB_TYPE_REBUILD_SEMANTIC_INDEX);
    }

    /**
     * Executes one durable document processing job and mirrors terminal state back to documents.
     *
     * @param jobId durable job ID; the job determines whether upload indexing or reprocess logic runs
     */
    public void processJob(Long jobId) {
        DocumentProcessingJob job = getJobOrThrow(jobId);
        int runningRows = jobRepository.markRunning(jobId, 10, "READ_SOURCE", "Preparing document source");
        if (runningRows == 0) {
            // Stage 20 cancellation is cooperative: if a queued job was canceled before
            // the worker started, the guarded RUNNING update fails and no document data is touched.
            return;
        }
        if (!JOB_TYPE_REBUILD_SEMANTIC_INDEX.equals(job.getJobType())) {
            documentRepository.updateStatusById(job.getDocumentId(), STATUS_PROCESSING, null);
        }
        documentRepository.updateEmbeddingStatusById(job.getDocumentId(), EMBEDDING_STATUS_PROCESSING, null);

        try {
            if (JOB_TYPE_UPLOAD_INDEX.equals(job.getJobType())) {
                processUploadIndex(job);
            } else if (JOB_TYPE_REPROCESS.equals(job.getJobType())) {
                processReprocess(job);
            } else if (JOB_TYPE_REBUILD_SEMANTIC_INDEX.equals(job.getJobType())) {
                processSemanticRebuild(job);
            } else {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported document processing job type");
            }
        } catch (DocumentTextExtractor.ExtractionFailure exception) {
            failJobAndDocument(job, exception.getUserMessage());
            throw new ResponseStatusException(exception.getStatus(), exception.getUserMessage());
        } catch (JobCanceledException exception) {
            // A cancel request may arrive while parsing or embedding work is in progress.
            // The persisted job row already contains CANCELED, so the worker exits cleanly.
            return;
        } catch (ResponseStatusException exception) {
            String safeMessage = safeReason(exception);
            failJobAndDocument(job, safeMessage);
            throw new ResponseStatusException(resolveStatus(exception), safeMessage);
        } catch (RuntimeException exception) {
            failJobAndDocument(job, "Document processing failed");
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Document processing failed");
        }
    }

    public List<DocumentProcessingJobResponse> findRecentJobsForKnowledgeBase(
            Long knowledgeBaseId,
            Long userId,
            int limit) {
        return jobRepository.findRecentAccessibleByKnowledgeBaseId(knowledgeBaseId, userId, limit)
                .stream()
                .map(DocumentProcessingJobResponse::new)
                .toList();
    }

    public List<DocumentProcessingJobResponse> findRecentJobsForDocument(
            Long documentId,
            Long userId,
            int limit) {
        return jobRepository.findRecentAccessibleByDocumentId(documentId, userId, limit)
                .stream()
                .map(DocumentProcessingJobResponse::new)
                .toList();
    }

    /**
     * Lists recent jobs across all knowledge bases accessible to the current user.
     *
     * @param userId current JWT user; controls tenant/member isolation
     * @param status optional normalized filter. ACTIVE means QUEUED or RUNNING; null means all statuses
     * @param limit bounded max row count
     * @return public task center rows, never including inaccessible knowledge bases
     */
    public List<DocumentProcessingJobResponse> findRecentAccessibleJobs(
            Long userId,
            String status,
            int limit) {
        List<DocumentProcessingJob> jobs;
        if (status == null || status.isBlank()) {
            jobs = jobRepository.findRecentAccessible(userId, limit);
        } else if (JOB_STATUS_ACTIVE.equals(status)) {
            jobs = jobRepository.findRecentAccessibleActive(userId, limit);
        } else {
            jobs = jobRepository.findRecentAccessibleByStatus(userId, status, limit);
        }
        return jobs.stream()
                .map(DocumentProcessingJobResponse::new)
                .toList();
    }

    public DocumentProcessingJobResponse findAccessibleJob(Long jobId, Long userId) {
        return new DocumentProcessingJobResponse(findAccessibleJobEntity(jobId, userId));
    }

    /**
     * Creates a new processing attempt from a FAILED or CANCELED job without mutating the old attempt.
     *
     * @param jobId source job to retry
     * @param userId current JWT user; must be OWNER or EDITOR on the job's knowledge base
     * @return queued retry job. The controller starts the runner after this method returns
     * @Desc Retrying creates a new row so the task center can show historical failures and the
     * latest attempt separately. This differs from document status, which only shows the latest
     * materialized search state.
     */
    public DocumentProcessingJob retryJob(Long jobId, Long userId) {
        DocumentProcessingJob previousJob = findAccessibleJobEntity(jobId, userId);
        accessService.requireEditor(previousJob.getKnowledgeBaseId(), userId);
        if (!RETRYABLE_STATUSES.contains(previousJob.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only failed or canceled jobs can be retried");
        }
        return createJob(
                previousJob.getDocumentId(),
                previousJob.getKnowledgeBaseId(),
                userId,
                previousJob.getJobType());
    }

    /**
     * Cancels a queued or running processing job for an OWNER/EDITOR.
     *
     * @param jobId active job ID
     * @param userId current JWT user; VIEWER receives 403 and non-members receive 404
     * @return refreshed job response after cancellation
     * @Desc Cancellation is implemented as a guarded state transition. The worker may still be
     * inside a parser/model call, but guarded SQL updates prevent late SUCCEEDED/FAILED writes from
     * overwriting CANCELED.
     */
    public DocumentProcessingJobResponse cancelJob(Long jobId, Long userId) {
        DocumentProcessingJob job = findAccessibleJobEntity(jobId, userId);
        accessService.requireEditor(job.getKnowledgeBaseId(), userId);
        if (!ACTIVE_STATUSES.contains(job.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only queued or running jobs can be canceled");
        }

        int updatedRows = jobRepository.markCanceled(jobId, JOB_STATUS_CANCELED, "Document processing job canceled");
        if (updatedRows == 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Document processing job is already finished");
        }
        return findAccessibleJob(jobId, userId);
    }

    /**
     * Counts active visible jobs for diagnostics. The same membership filter as the task center
     * is used so diagnostics never leak private knowledge-base activity.
     */
    public long countAccessibleActiveJobs(Long userId) {
        return jobRepository.countAccessibleActive(userId);
    }

    /**
     * Counts failed visible jobs for diagnostics.
     */
    public long countAccessibleFailedJobs(Long userId) {
        return jobRepository.countAccessibleFailed(userId);
    }

    private DocumentProcessingJob findAccessibleJobEntity(Long jobId, Long userId) {
        return jobRepository.findAccessibleById(jobId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document processing job not found"));
    }

    private DocumentProcessingJob createJob(Long documentId, Long knowledgeBaseId, Long requestedBy, String jobType) {
        DocumentProcessingJob job = new DocumentProcessingJob();
        job.setDocumentId(documentId);
        job.setKnowledgeBaseId(knowledgeBaseId);
        job.setRequestedBy(requestedBy);
        job.setJobType(jobType);
        job.setStatus(JOB_STATUS_QUEUED);
        job.setProgressPercent(0);
        job.setStage("QUEUED");
        job.setMessage("Waiting for background processing");
        job.setErrorMessage(null);

        int insertedRows = jobRepository.insert(job);
        if (insertedRows != 1) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Document processing job creation failed");
        }
        // Upload/reprocess rewrite searchable text, so the document status reflects PROCESSING
        // immediately. Semantic rebuild only refreshes vectors and leaves full-text chunks usable.
        if (!JOB_TYPE_REBUILD_SEMANTIC_INDEX.equals(jobType)) {
            documentRepository.updateStatusById(documentId, STATUS_PROCESSING, null);
        }
        return job;
    }

    private DocumentProcessingJob getJobOrThrow(Long jobId) {
        return jobRepository.findById(jobId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document processing job not found"));
    }

    private void processUploadIndex(DocumentProcessingJob job) {
        Document document = documentRepository.findAccessibleSourceById(job.getDocumentId(), job.getRequestedBy())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
        updateProgressOrStop(job.getId(), 30, "EXTRACT_TEXT", "Extracting document text");
        String text = documentTextExtractor.extract(document.getOriginalFilename(), document.getSourceBytes());
        requireActiveJob(job.getId());
        writeIndexedChunks(job, document, text, false);
    }

    private void processReprocess(DocumentProcessingJob job) {
        Document document = documentRepository.findAccessibleSourceById(job.getDocumentId(), job.getRequestedBy())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
        updateProgressOrStop(job.getId(), 30, "EXTRACT_TEXT", "Rebuilding document text");
        String text = resolveReprocessText(document);
        requireActiveJob(job.getId());
        writeIndexedChunks(job, document, text, true);
    }

    /**
     * Rebuilds embeddings for existing chunks only.
     *
     * @param job durable job whose document_id identifies the indexed document
     * @Desc Stage 19 separates semantic index operations from text processing. This method does
     * not re-read source bytes, does not delete chunks, and does not change documents.status; it
     * only updates document/chunk embedding fields and the job progress.
     */
    private void processSemanticRebuild(DocumentProcessingJob job) {
        Document document = documentRepository.findAccessibleById(job.getDocumentId(), job.getRequestedBy())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
        if (!STATUS_INDEXED.equals(document.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Document is not indexed");
        }
        List<DocumentChunk> chunks = documentChunkRepository.findAllByDocumentId(document.getId());
        if (chunks.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Document has no indexed chunks");
        }

        updateProgressOrStop(job.getId(), 40, "READ_CHUNKS", "Reading existing chunks for semantic rebuild");
        List<String> contents = chunks.stream().map(DocumentChunk::getContent).toList();
        EmbeddingWritePlan embeddingPlan = buildEmbeddingWritePlan(job.getRequestedBy(), contents);

        updateProgressOrStop(job.getId(), 80, "WRITE_EMBEDDINGS", "Writing refreshed semantic index");
        requireActiveJob(job.getId());
        transactionTemplate.executeWithoutResult(status -> {
            documentChunkRepository.updateEmbeddingStatusByDocumentId(document.getId(), EMBEDDING_STATUS_PROCESSING);
            applyExistingChunkEmbeddings(document.getId(), chunks, embeddingPlan);
            documentRepository.updateEmbeddingStatusById(
                    document.getId(),
                    embeddingPlan.status(),
                    embeddingPlan.errorMessage());
        });
        jobRepository.markSucceeded(job.getId(), "COMPLETED", "Semantic index rebuild completed");
    }

    /**
     * Writes chunks and final status atomically after text extraction succeeds.
     *
     * @param job current durable job; progress is updated before and after the transaction
     * @param document target document
     * @param text extracted or rebuilt plain text
     * @param replaceExistingChunks true for reprocess, false for first upload indexing
     */
    private void writeIndexedChunks(
            DocumentProcessingJob job,
            Document document,
            String text,
            boolean replaceExistingChunks) {
        if (text == null || text.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Document content is blank");
        }

        updateProgressOrStop(job.getId(), 60, "SPLIT_CHUNKS", "Splitting document into retrieval chunks");
        List<String> chunks = splitText(text);
        EmbeddingWritePlan embeddingPlan = buildEmbeddingWritePlan(job.getRequestedBy(), chunks);
        updateProgressOrStop(job.getId(), 80, "WRITE_CHUNKS", "Writing retrieval chunks");
        requireActiveJob(job.getId());

        transactionTemplate.executeWithoutResult(status -> {
            if (replaceExistingChunks) {
                documentChunkRepository.deleteByDocumentId(document.getId());
            }
            saveChunks(document.getId(), document.getKnowledgeBaseId(), chunks);
            applyChunkEmbeddings(document.getId(), chunks.size(), embeddingPlan);
            documentRepository.updateSourceTextById(document.getId(), text);
            documentRepository.updateStatusById(document.getId(), STATUS_INDEXED, null);
            documentRepository.updateEmbeddingStatusById(
                    document.getId(),
                    embeddingPlan.status(),
                    embeddingPlan.errorMessage());
        });
        jobRepository.markSucceeded(job.getId(), "COMPLETED", "文档处理完成");
    }

    /**
     * @param userId current user who requested processing; controls user-scoped model credentials
     * @param chunks text chunks that will be written to document_chunks
     * @return embedding write plan used inside the database transaction
     * @Desc Embeddings are an optional Stage 18 semantic enhancement. If the embedding
     * provider is missing or fails, document text chunks are still saved for full-text retrieval.
     */
    private EmbeddingWritePlan buildEmbeddingWritePlan(Long userId, List<String> chunks) {
        if (!embeddingModelClient.isConfigured(userId)) {
            return new EmbeddingWritePlan(EMBEDDING_STATUS_SKIPPED, null, List.of());
        }
        try {
            List<List<Double>> vectors = embeddingModelClient.embed(userId, chunks);
            if (vectors.size() != chunks.size()) {
                return new EmbeddingWritePlan(EMBEDDING_STATUS_FAILED, "Embedding generation failed", List.of());
            }
            return new EmbeddingWritePlan(EMBEDDING_STATUS_INDEXED, null, vectors);
        } catch (RuntimeException exception) {
            return new EmbeddingWritePlan(EMBEDDING_STATUS_FAILED, "Embedding generation failed", List.of());
        }
    }

    /**
     * @param documentId target document ID
     * @param chunkCount number of just-inserted chunks
     * @param plan embedding vectors or fallback state for each chunk
     * @Desc Chunk rows are inserted first, then updated by documentId/chunkIndex. This keeps
     * text indexing independent from vector generation and preserves existing upload behavior.
     */
    private void applyChunkEmbeddings(Long documentId, int chunkCount, EmbeddingWritePlan plan) {
        if (EMBEDDING_STATUS_INDEXED.equals(plan.status())) {
            for (int index = 0; index < plan.vectors().size(); index++) {
                documentChunkRepository.updateEmbeddingByDocumentIdAndChunkIndex(
                        documentId,
                        index,
                        EMBEDDING_STATUS_INDEXED,
                        DocumentRetrievalService.toVectorLiteral(plan.vectors().get(index)));
            }
            return;
        }
        for (int index = 0; index < chunkCount; index++) {
            documentChunkRepository.updateEmbeddingStatusByDocumentIdAndChunkIndex(
                    documentId,
                    index,
                    plan.status());
        }
    }

    /**
     * @param documentId document being semantically rebuilt
     * @param chunks existing chunk rows in stable chunk_index order
     * @param plan embedding write decision for those existing chunks
     * @Desc Semantic rebuild cannot assume chunk indexes are freshly generated from 0..n.
     * It writes vectors back to each existing chunk_index and therefore preserves chunk IDs,
     * text, and citations.
     */
    private void applyExistingChunkEmbeddings(Long documentId, List<DocumentChunk> chunks, EmbeddingWritePlan plan) {
        if (EMBEDDING_STATUS_INDEXED.equals(plan.status())) {
            for (int index = 0; index < plan.vectors().size(); index++) {
                documentChunkRepository.updateEmbeddingByDocumentIdAndChunkIndex(
                        documentId,
                        chunks.get(index).getChunkIndex(),
                        EMBEDDING_STATUS_INDEXED,
                        DocumentRetrievalService.toVectorLiteral(plan.vectors().get(index)));
            }
            return;
        }
        documentChunkRepository.updateEmbeddingStatusByDocumentId(documentId, plan.status());
    }

    /**
     * Chooses the source text for reprocessing with Stage 16 priority preserved.
     *
     * @param document document row containing optional original bytes, extracted text, and metadata
     * @return text used to replace current chunks
     */
    private String resolveReprocessText(Document document) {
        if (document.getSourceBytes() != null && document.getSourceBytes().length > 0) {
            return documentTextExtractor.extract(document.getOriginalFilename(), document.getSourceBytes());
        }
        if (document.getSourceText() != null && !document.getSourceText().isBlank()) {
            return document.getSourceText();
        }

        String rebuiltText = documentChunkRepository.concatenateContentByDocumentId(document.getId());
        if (rebuiltText == null || rebuiltText.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, NO_REPROCESS_SOURCE_MESSAGE);
        }
        return rebuiltText;
    }

    private List<String> splitText(String text) {
        List<String> chunks = new ArrayList<>();
        int start = 0;
        int textLength = text.length();
        while (start < textLength) {
            int end = Math.min(start + CHUNK_SIZE, textLength);
            String chunk = text.substring(start, end).trim();

            if (!chunk.isBlank()) {
                chunks.add(chunk);
            }
            if (end >= textLength) {
                break;
            }
            start = end - CHUNK_OVERLAP;
        }
        if (chunks.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Document content is blank");
        }
        return chunks;
    }

    /**
     * Persists chunks with stable indexes so search and Chat citations continue to reference real chunks.
     */
    private void saveChunks(Long documentId, Long knowledgeBaseId, List<String> chunks) {
        for (int index = 0; index < chunks.size(); index++) {
            String content = chunks.get(index);
            DocumentChunk chunk = new DocumentChunk();
            chunk.setDocumentId(documentId);
            chunk.setKnowledgeBaseId(knowledgeBaseId);
            chunk.setChunkIndex(index);
            chunk.setContent(content);
            chunk.setCharCount(content.length());
            documentChunkRepository.insert(chunk);
        }
    }

    private void failJobAndDocument(DocumentProcessingJob job, String safeMessage) {
        if (!isJobActive(job.getId())) {
            return;
        }
        if (JOB_TYPE_REBUILD_SEMANTIC_INDEX.equals(job.getJobType())) {
            // Semantic rebuild failure must not make an already INDEXED document disappear from
            // full-text search. Only embedding fields and the job row reflect the failure.
            documentRepository.updateEmbeddingStatusById(job.getDocumentId(), EMBEDDING_STATUS_FAILED, safeMessage);
            documentChunkRepository.updateEmbeddingStatusByDocumentId(job.getDocumentId(), EMBEDDING_STATUS_FAILED);
            jobRepository.markFailed(job.getId(), "FAILED", "Semantic index rebuild failed", safeMessage);
            return;
        }
        documentRepository.updateStatusById(job.getDocumentId(), STATUS_FAILED, safeMessage);
        documentRepository.updateEmbeddingStatusById(job.getDocumentId(), EMBEDDING_STATUS_FAILED, safeMessage);
        jobRepository.markFailed(job.getId(), "FAILED", "文档处理失败", safeMessage);
    }

    /**
     * Writes a progress milestone only while the job is active.
     *
     * @param jobId durable job ID
     * @param progressPercent coarse 0-100 progress milestone
     * @param stage short stage code shown in task center
     * @param message safe user-facing message
     * @throws JobCanceledException when a cancel request already moved the job to CANCELED
     */
    private void updateProgressOrStop(Long jobId, int progressPercent, String stage, String message) {
        int updatedRows = jobRepository.updateProgress(jobId, progressPercent, stage, message);
        if (updatedRows == 0) {
            throw new JobCanceledException();
        }
    }

    /**
     * Checks the current persisted job state before writing document/chunk side effects.
     */
    private void requireActiveJob(Long jobId) {
        if (!isJobActive(jobId)) {
            throw new JobCanceledException();
        }
    }

    private boolean isJobActive(Long jobId) {
        return jobRepository.findById(jobId)
                .map(job -> ACTIVE_STATUSES.contains(job.getStatus()))
                .orElse(false);
    }

    private String safeReason(ResponseStatusException exception) {
        if (exception.getReason() == null || exception.getReason().isBlank()) {
            return "Document processing failed";
        }
        return exception.getReason();
    }

    private HttpStatus resolveStatus(ResponseStatusException exception) {
        HttpStatus status = HttpStatus.resolve(exception.getStatusCode().value());
        return status == null ? HttpStatus.INTERNAL_SERVER_ERROR : status;
    }

    /**
     * Stage 18 embedding write decision for one processing job.
     *
     * @param status document/chunk embedding status to persist after text chunks are saved
     * @param errorMessage sanitized embedding failure reason; null for INDEXED or SKIPPED
     * @param vectors pgvector-compatible vectors in chunk order; empty when embeddings are skipped or failed
     */
    private record EmbeddingWritePlan(String status, String errorMessage, List<List<Double>> vectors) {
    }

    /**
     * Internal signal used for cooperative cancellation. It is intentionally not returned to
     * clients because the public task state is already stored as CANCELED in the database row.
     */
    private static class JobCanceledException extends RuntimeException {
    }
}
