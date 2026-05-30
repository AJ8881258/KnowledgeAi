package com.knowflow.backend.document.controller;

import com.knowflow.backend.chat.model.ChatModelClient;
import com.knowflow.backend.document.dto.request.GenerateDocumentSummaryRequest;
import com.knowflow.backend.document.dto.request.SearchDocumentRequest;
import com.knowflow.backend.document.dto.response.DocumentChunkResponse;
import com.knowflow.backend.document.dto.response.DocumentQualityResponse;
import com.knowflow.backend.document.dto.response.DocumentResponse;
import com.knowflow.backend.document.dto.response.DocumentSummaryResponse;
import com.knowflow.backend.document.dto.response.SearchDocumentResponse;
import com.knowflow.backend.document.dto.response.SearchResultResponse;
import com.knowflow.backend.document.entity.Document;
import com.knowflow.backend.document.entity.DocumentChunk;
import com.knowflow.backend.document.repository.DocumentChunkRepository;
import com.knowflow.backend.document.repository.DocumentRepository;
import com.knowflow.backend.document.service.DocumentTextExtractor;
import com.knowflow.backend.knowledgebase.service.KnowledgeBaseAccessService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import static com.knowflow.backend.common.model.ModelProviderErrors.safeMessage;
import static com.knowflow.backend.common.utils.AuthUtils.getCurrentUserId;

@RestController
@RequestMapping("/api")
public class DocumentController {

    private static final long MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
    private static final int CHUNK_SIZE = 1000;
    private static final int CHUNK_OVERLAP = 150;
    private static final int CONTENT_TYPE_MAX_LENGTH = 64;

    private static final String STATUS_UPLOADED = "UPLOADED";
    private static final String STATUS_PROCESSING = "PROCESSING";
    private static final String STATUS_INDEXED = "INDEXED";
    private static final String STATUS_FAILED = "FAILED";

    private static final int DEFAULT_SEARCH_LIMIT = 5;
    private static final int MAX_SEARCH_LIMIT = 20;
    private static final int MIN_USEFUL_DOCUMENT_CHARS = 100;
    private static final int SHORT_CHUNK_WARNING_LENGTH = 20;
    private static final int LONG_CHUNK_WARNING_LENGTH = 1800;
    private static final int SUMMARY_INPUT_MAX_CHARS = 12_000;
    private static final int DEFAULT_SUMMARY_OUTPUT_MAX_CHARS = 500;
    private static final int MAX_SUMMARY_OUTPUT_MAX_CHARS = 4_000;
    private static final String NO_REPROCESS_SOURCE_MESSAGE =
            "Document cannot be reprocessed because no source or indexed text is available";

    private final KnowledgeBaseAccessService accessService;
    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final DocumentTextExtractor documentTextExtractor;
    private final ChatModelClient chatModelClient;
    private final TransactionTemplate transactionTemplate;

    public DocumentController(
            KnowledgeBaseAccessService accessService,
            DocumentRepository documentRepository,
            DocumentChunkRepository documentChunkRepository,
            DocumentTextExtractor documentTextExtractor,
            ChatModelClient chatModelClient,
            TransactionTemplate transactionTemplate) {
        this.accessService = accessService;
        this.documentRepository = documentRepository;
        this.documentChunkRepository = documentChunkRepository;
        this.documentTextExtractor = documentTextExtractor;
        this.chatModelClient = chatModelClient;
        this.transactionTemplate = transactionTemplate;
    }

    /**
     * Uploads and synchronously indexes a document for a knowledge base.
     *
     * @param knowledgeBaseId target knowledge base ID
     * @param file uploaded source file
     * @param jwt current authenticated user
     * @return saved document metadata plus chunk quality metrics
     */
    @PostMapping("/knowledge-bases/{knowledgeBaseId}/documents")
    @ResponseStatus(HttpStatus.CREATED)
    public DocumentResponse uploadDocument(
            @PathVariable Long knowledgeBaseId,
            @RequestPart("file") MultipartFile file,
            @AuthenticationPrincipal Jwt jwt) {
        Long userId = getCurrentUserId(jwt);
        accessService.requireEditor(knowledgeBaseId, userId);
        validateBasicFile(file);
        byte[] sourceBytes = readUploadSourceBytes(file);

        Document document = new Document();
        document.setKnowledgeBaseId(knowledgeBaseId);
        document.setOriginalFilename(file.getOriginalFilename());
        document.setContentType(safeContentType(file.getContentType()));
        document.setSizeBytes(file.getSize());
        document.setStatus(STATUS_UPLOADED);
        document.setErrorMessage(null);
        document.setSourceBytes(sourceBytes);
        document.setCreatedBy(userId);

        int insertedRows = documentRepository.insert(document);
        if (insertedRows != 1) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "document upload failed");
        }

        documentRepository.updateStatusByIdAndCreatedBy(document.getId(), userId, STATUS_PROCESSING, null);

        try {
            String text = documentTextExtractor.extract(document.getOriginalFilename(), sourceBytes);
            if (text.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Document content is blank");
            }

            documentRepository.updateSourceTextById(document.getId(), text);
            saveChunks(document.getId(), knowledgeBaseId, splitText(text));
            documentRepository.updateStatusByIdAndCreatedBy(document.getId(), userId, STATUS_INDEXED, null);
            return toDocumentResponse(getAccessibleDocumentOr404(document.getId(), userId));
        } catch (DocumentTextExtractor.ExtractionFailure exception) {
            failDocument(document.getId(), userId, exception.getUserMessage());
            throw new ResponseStatusException(exception.getStatus(), exception.getUserMessage());
        } catch (ResponseStatusException exception) {
            String safeMessage = safeReason(exception);
            failDocument(document.getId(), userId, safeMessage);
            throw new ResponseStatusException(resolveStatus(exception), safeMessage);
        } catch (Exception exception) {
            failDocument(document.getId(), userId, "Document processing failed");
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Process document failed");
        }
    }

    /**
     * Lists documents visible to the current knowledge-base member.
     */
    @GetMapping("/knowledge-bases/{knowledgeBaseId}/documents")
    public List<DocumentResponse> listDocuments(@PathVariable Long knowledgeBaseId, @AuthenticationPrincipal Jwt jwt) {
        Long userId = getCurrentUserId(jwt);
        accessService.requireMember(knowledgeBaseId, userId);
        return documentRepository.findAllByKnowledgeBaseId(knowledgeBaseId)
                .stream()
                .map(this::toDocumentResponse)
                .toList();
    }

    /**
     * Searches indexed chunks in a knowledge base. Summaries are intentionally not queried here.
     */
    @PostMapping("/knowledge-bases/{knowledgeBaseId}/search")
    public SearchDocumentResponse searchDocuments(
            @PathVariable Long knowledgeBaseId,
            @RequestBody SearchDocumentRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        Long userId = getCurrentUserId(jwt);
        accessService.requireMember(knowledgeBaseId, userId);

        String query = normalizeSearchQuery(request == null ? null : request.getQuery());
        Integer limit = normalizeSearchLimit(request == null ? null : request.getLimit());

        List<SearchResultResponse> results = documentChunkRepository.searchIndexedChunks(
                knowledgeBaseId,
                userId,
                query,
                limit);
        return new SearchDocumentResponse(query, results);
    }

    /**
     * Returns document details plus Stage 15 quality fields.
     */
    @GetMapping("/documents/{documentId}")
    public DocumentResponse getDocument(@PathVariable Long documentId, @AuthenticationPrincipal Jwt jwt) {
        Long userId = getCurrentUserId(jwt);
        return toDocumentResponse(getAccessibleDocumentOr404(documentId, userId));
    }

    /**
     * Returns chunk-based quality metrics for a document.
     *
     * @param documentId document ID
     * @param jwt current user
     * @return chunk count, character totals, length distribution, and simple warnings
     */
    @GetMapping("/documents/{documentId}/quality")
    public DocumentQualityResponse getDocumentQuality(@PathVariable Long documentId, @AuthenticationPrincipal Jwt jwt) {
        Long userId = getCurrentUserId(jwt);
        Document document = getAccessibleDocumentOr404(documentId, userId);
        return buildQuality(document);
    }

    /**
     * Reprocesses an existing document from the best available source.
     *
     * <p>Stage 16 tries saved original bytes first, then saved extracted text, and finally the Stage 15
     * chunks fallback for old rows. This makes failed uploads with no chunks truly retryable when their
     * original source was stored.</p>
     *
     * @param documentId document ID
     * @param jwt current user; OWNER/EDITOR allowed, VIEWER gets 403, non-members get 404
     * @return reprocessed document details
     */
    @PostMapping("/documents/{documentId}/reprocess")
    public DocumentResponse reprocessDocument(@PathVariable Long documentId, @AuthenticationPrincipal Jwt jwt) {
        Long userId = getCurrentUserId(jwt);
        Document document = getAccessibleSourceDocumentOr404(documentId, userId);
        accessService.requireEditor(document.getKnowledgeBaseId(), userId);

        // 先把状态置为 PROCESSING，让前端能明确看到用户触发了重新处理。
        documentRepository.updateStatusById(documentId, STATUS_PROCESSING, null);

        try {
            String rebuiltText = resolveReprocessText(document);
            List<String> chunks = splitText(rebuiltText);
            transactionTemplate.executeWithoutResult(status -> {
                documentChunkRepository.deleteByDocumentId(documentId);
                saveChunks(documentId, document.getKnowledgeBaseId(), chunks);
                documentRepository.updateSourceTextById(documentId, rebuiltText);
                documentRepository.updateStatusById(documentId, STATUS_INDEXED, null);
            });
            return toDocumentResponse(getAccessibleDocumentOr404(documentId, userId));
        } catch (DocumentTextExtractor.ExtractionFailure exception) {
            documentRepository.updateStatusById(documentId, STATUS_FAILED, exception.getUserMessage());
            throw new ResponseStatusException(exception.getStatus(), exception.getUserMessage());
        } catch (ResponseStatusException exception) {
            String safeMessage = safeReason(exception);
            documentRepository.updateStatusById(documentId, STATUS_FAILED, safeMessage);
            throw new ResponseStatusException(resolveStatus(exception), safeMessage);
        } catch (RuntimeException exception) {
            documentRepository.updateStatusById(documentId, STATUS_FAILED, "Document processing failed");
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Document processing failed");
        }
    }

    /**
     * Generates and stores a document summary from real chunks.
     *
     * <p>The summary is document metadata only. It is never written to document_chunks or chat_message_sources,
     * so it cannot replace real chunks as a Chat citation source.</p>
     *
     * @param documentId document ID
     * @param jwt current user; every knowledge-base member can generate/view a summary
     * @return generated summary and update timestamp
     */
    @PostMapping("/documents/{documentId}/summary")
    public DocumentSummaryResponse summarizeDocument(
            @PathVariable Long documentId,
            @RequestBody(required = false) GenerateDocumentSummaryRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        Long userId = getCurrentUserId(jwt);
        Document document = getAccessibleDocumentOr404(documentId, userId);
        int maxLength = normalizeSummaryMaxLength(request == null ? null : request.getMaxLength());
        String rebuiltText = documentChunkRepository.concatenateContentByDocumentId(documentId);
        if (rebuiltText == null || rebuiltText.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Document has no indexed text to summarize");
        }

        try {
            String prompt = buildSummaryPrompt(document, limitLength(rebuiltText, SUMMARY_INPUT_MAX_CHARS), maxLength);
            String summary = normalizeSummary(chatModelClient.chat(userId, prompt, 0.2), maxLength);
            documentRepository.updateSummaryById(documentId, summary);
            Document saved = getAccessibleDocumentOr404(documentId, userId);
            return new DocumentSummaryResponse(saved.getId(), saved.getSummary(), saved.getSummaryUpdatedAt());
        } catch (RuntimeException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, safeMessage(exception));
        }
    }

    /**
     * Lists real chunks for a document. Summaries are not mixed into this response.
     */
    @GetMapping("/documents/{documentId}/chunks")
    public List<DocumentChunkResponse> listChunks(@PathVariable Long documentId, @AuthenticationPrincipal Jwt jwt) {
        Long userId = getCurrentUserId(jwt);
        getAccessibleDocumentOr404(documentId, userId);

        return documentChunkRepository.findAllByDocumentId(documentId)
                .stream()
                .map(DocumentChunkResponse::new)
                .toList();
    }

    /**
     * Deletes a document and its chunks. OWNER/EDITOR may delete; VIEWER receives 403.
     */
    @DeleteMapping("/documents/{documentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDocument(@PathVariable Long documentId, @AuthenticationPrincipal Jwt jwt) {
        Long userId = getCurrentUserId(jwt);
        Document document = getAccessibleDocumentOr404(documentId, userId);
        accessService.requireEditor(document.getKnowledgeBaseId(), userId);

        int rows = documentRepository.deleteById(documentId);
        if (rows != 1) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
        }
    }

    private String normalizeSearchQuery(String query) {
        if (query == null || query.trim().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "query is empty");
        }
        return query.trim();
    }

    private Integer normalizeSearchLimit(Integer limit) {
        if (limit == null) {
            return DEFAULT_SEARCH_LIMIT;
        }
        if (limit < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "limit must be >=1");
        }
        return Math.min(limit, MAX_SEARCH_LIMIT);
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
     * Persists chunks with consistent chunk_index and char_count for upload and reprocess paths.
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

    private void validateBasicFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is required");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File size must be <=10MB");
        }

        String filename = file.getOriginalFilename();
        if (filename == null || filename.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Filename is required");
        }
    }

    /**
     * Reads upload bytes once so the same source can be saved and parsed.
     *
     * @param file multipart upload body from the client
     * @return raw file bytes to persist in documents.source_bytes
     */
    private byte[] readUploadSourceBytes(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File reading failed");
        }
    }

    private String safeContentType(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            return null;
        }
        return contentType.length() > CONTENT_TYPE_MAX_LENGTH
                ? contentType.substring(0, CONTENT_TYPE_MAX_LENGTH)
                : contentType;
    }

    private void failDocument(Long documentId, Long userId, String safeMessage) {
        documentRepository.updateStatusByIdAndCreatedBy(documentId, userId, STATUS_FAILED, safeMessage);
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

    private Document getAccessibleDocumentOr404(Long documentId, Long userId) {
        return documentRepository.findAccessibleById(documentId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
    }

    private Document getAccessibleSourceDocumentOr404(Long documentId, Long userId) {
        return documentRepository.findAccessibleSourceById(documentId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
    }

    private DocumentResponse toDocumentResponse(Document document) {
        return new DocumentResponse(document, buildQuality(document));
    }

    /**
     * Chooses the source text for document reprocessing.
     *
     * @param document document row containing optional original bytes, extracted text, and metadata
     * @return normalized text that will replace current chunks
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

    /**
     * Computes Stage 15 quality metrics from document_chunks only.
     */
    private DocumentQualityResponse buildQuality(Document document) {
        Long documentId = document.getId();
        Long chunkCount = documentChunkRepository.countByDocumentId(documentId);
        Long charCount = documentChunkRepository.sumCharCountByDocumentId(documentId);
        Integer minChunkLength = documentChunkRepository.minCharCountByDocumentId(documentId);
        Integer maxChunkLength = documentChunkRepository.maxCharCountByDocumentId(documentId);
        double average = chunkCount == null || chunkCount == 0
                ? 0.0
                : (charCount == null ? 0.0 : (double) charCount / chunkCount);
        return new DocumentQualityResponse(
                documentId,
                document.getStatus(),
                chunkCount == null ? 0L : chunkCount,
                charCount == null ? 0L : charCount,
                average,
                minChunkLength == null ? 0 : minChunkLength,
                maxChunkLength == null ? 0 : maxChunkLength,
                buildQualityWarnings(chunkCount, charCount, minChunkLength, maxChunkLength),
                document.getUpdatedAt());
    }

    private List<String> buildQualityWarnings(Long chunkCount, Long charCount, Integer minChunkLength, Integer maxChunkLength) {
        List<String> warnings = new ArrayList<>();
        if (chunkCount == null || chunkCount == 0) {
            warnings.add("NO_CHUNKS");
        }
        if (charCount == null || charCount < MIN_USEFUL_DOCUMENT_CHARS) {
            warnings.add("DOCUMENT_TOO_SHORT");
        }
        if (minChunkLength != null && minChunkLength > 0 && minChunkLength < SHORT_CHUNK_WARNING_LENGTH) {
            warnings.add("CHUNK_TOO_SHORT");
        }
        if (maxChunkLength != null && maxChunkLength > LONG_CHUNK_WARNING_LENGTH) {
            warnings.add("CHUNK_TOO_LONG");
        }
        return warnings;
    }

    private String buildSummaryPrompt(Document document, String sourceText, int maxLength) {
        return """
                You are KnowFlow AI's document summary assistant.
                Write a concise Chinese summary from the document content below.
                Keep the summary within %d characters.
                Focus on topics, key facts, and RAG-relevant points.
                Do not invent facts, do not output citations, and do not reveal system or provider configuration.
                Document name: %s
                Document content:
                %s
                """.formatted(maxLength, document.getOriginalFilename(), sourceText);
    }

    private String limitLength(String value, int maxLength) {
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }

    /**
     * Normalizes the user-facing summary text and enforces the maxLength request parameter.
     */
    private String normalizeSummary(String summary, int maxLength) {
        if (summary == null || summary.isBlank()) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "AI model call failed");
        }
        return limitLength(summary.trim(), maxLength);
    }

    /**
     * Normalizes requested summary length.
     *
     * @param maxLength optional client requested maximum output characters
     * @return bounded character limit used for both prompt instruction and final truncation
     */
    private int normalizeSummaryMaxLength(Integer maxLength) {
        if (maxLength == null) {
            return DEFAULT_SUMMARY_OUTPUT_MAX_CHARS;
        }
        if (maxLength < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "maxLength must be >=1");
        }
        return Math.min(maxLength, MAX_SUMMARY_OUTPUT_MAX_CHARS);
    }
}
