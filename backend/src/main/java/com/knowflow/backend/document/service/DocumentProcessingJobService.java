package com.knowflow.backend.document.service;

import com.knowflow.backend.document.dto.response.DocumentProcessingJobResponse;
import com.knowflow.backend.document.entity.Document;
import com.knowflow.backend.document.entity.DocumentChunk;
import com.knowflow.backend.document.entity.DocumentProcessingJob;
import com.knowflow.backend.document.repository.DocumentChunkRepository;
import com.knowflow.backend.document.repository.DocumentProcessingJobRepository;
import com.knowflow.backend.document.repository.DocumentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

@Service
public class DocumentProcessingJobService {
    public static final String JOB_TYPE_UPLOAD_INDEX = "UPLOAD_INDEX";
    public static final String JOB_TYPE_REPROCESS = "REPROCESS";
    public static final String JOB_STATUS_QUEUED = "QUEUED";
    public static final String JOB_STATUS_RUNNING = "RUNNING";
    public static final String JOB_STATUS_SUCCEEDED = "SUCCEEDED";
    public static final String JOB_STATUS_FAILED = "FAILED";

    private static final String STATUS_PROCESSING = "PROCESSING";
    private static final String STATUS_INDEXED = "INDEXED";
    private static final String STATUS_FAILED = "FAILED";
    private static final int CHUNK_SIZE = 1000;
    private static final int CHUNK_OVERLAP = 150;
    private static final String NO_REPROCESS_SOURCE_MESSAGE =
            "Document cannot be reprocessed because no source or indexed text is available";

    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final DocumentProcessingJobRepository jobRepository;
    private final DocumentTextExtractor documentTextExtractor;
    private final TransactionTemplate transactionTemplate;

    public DocumentProcessingJobService(
            DocumentRepository documentRepository,
            DocumentChunkRepository documentChunkRepository,
            DocumentProcessingJobRepository jobRepository,
            DocumentTextExtractor documentTextExtractor,
            TransactionTemplate transactionTemplate) {
        this.documentRepository = documentRepository;
        this.documentChunkRepository = documentChunkRepository;
        this.jobRepository = jobRepository;
        this.documentTextExtractor = documentTextExtractor;
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
     * Executes one durable document processing job and mirrors terminal state back to documents.
     *
     * @param jobId durable job ID; the job determines whether upload indexing or reprocess logic runs
     */
    public void processJob(Long jobId) {
        DocumentProcessingJob job = getJobOrThrow(jobId);
        jobRepository.markRunning(jobId, 10, "READ_SOURCE", "准备处理文档来源");
        documentRepository.updateStatusById(job.getDocumentId(), STATUS_PROCESSING, null);

        try {
            if (JOB_TYPE_UPLOAD_INDEX.equals(job.getJobType())) {
                processUploadIndex(job);
            } else if (JOB_TYPE_REPROCESS.equals(job.getJobType())) {
                processReprocess(job);
            } else {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported document processing job type");
            }
        } catch (DocumentTextExtractor.ExtractionFailure exception) {
            failJobAndDocument(job, exception.getUserMessage());
            throw new ResponseStatusException(exception.getStatus(), exception.getUserMessage());
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

    public DocumentProcessingJobResponse findAccessibleJob(Long jobId, Long userId) {
        DocumentProcessingJob job = jobRepository.findAccessibleById(jobId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document processing job not found"));
        return new DocumentProcessingJobResponse(job);
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
        job.setMessage("等待后台处理");
        job.setErrorMessage(null);

        int insertedRows = jobRepository.insert(job);
        if (insertedRows != 1) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Document processing job creation failed");
        }
        // Mark the document as PROCESSING as soon as the durable job exists. In async mode the
        // request can return before parsing starts, so the materialized document status must not
        // remain UPLOADED and make the UI look idle.
        documentRepository.updateStatusById(documentId, STATUS_PROCESSING, null);
        return job;
    }

    private DocumentProcessingJob getJobOrThrow(Long jobId) {
        return jobRepository.findById(jobId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document processing job not found"));
    }

    private void processUploadIndex(DocumentProcessingJob job) {
        Document document = documentRepository.findAccessibleSourceById(job.getDocumentId(), job.getRequestedBy())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
        jobRepository.updateProgress(job.getId(), 30, "EXTRACT_TEXT", "正在提取文档文本");
        String text = documentTextExtractor.extract(document.getOriginalFilename(), document.getSourceBytes());
        writeIndexedChunks(job, document, text, false);
    }

    private void processReprocess(DocumentProcessingJob job) {
        Document document = documentRepository.findAccessibleSourceById(job.getDocumentId(), job.getRequestedBy())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
        jobRepository.updateProgress(job.getId(), 30, "EXTRACT_TEXT", "正在重建文档文本");
        String text = resolveReprocessText(document);
        writeIndexedChunks(job, document, text, true);
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

        jobRepository.updateProgress(job.getId(), 60, "SPLIT_CHUNKS", "正在切分文档片段");
        List<String> chunks = splitText(text);
        jobRepository.updateProgress(job.getId(), 80, "WRITE_CHUNKS", "正在写入检索索引");

        transactionTemplate.executeWithoutResult(status -> {
            if (replaceExistingChunks) {
                documentChunkRepository.deleteByDocumentId(document.getId());
            }
            saveChunks(document.getId(), document.getKnowledgeBaseId(), chunks);
            documentRepository.updateSourceTextById(document.getId(), text);
            documentRepository.updateStatusById(document.getId(), STATUS_INDEXED, null);
        });
        jobRepository.markSucceeded(job.getId(), "COMPLETED", "文档处理完成");
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
        documentRepository.updateStatusById(job.getDocumentId(), STATUS_FAILED, safeMessage);
        jobRepository.markFailed(job.getId(), "FAILED", "文档处理失败", safeMessage);
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
}
