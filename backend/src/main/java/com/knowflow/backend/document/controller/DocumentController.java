package com.knowflow.backend.document.controller;

import java.util.ArrayList;
import java.util.List;

import com.knowflow.backend.document.dto.request.SearchDocumentRequest;
import com.knowflow.backend.document.dto.response.DocumentChunkResponse;
import com.knowflow.backend.document.dto.response.DocumentResponse;
import com.knowflow.backend.document.dto.response.SearchDocumentResponse;
import com.knowflow.backend.document.dto.response.SearchResultResponse;
import com.knowflow.backend.document.entity.Document;
import com.knowflow.backend.document.entity.DocumentChunk;
import com.knowflow.backend.document.repository.DocumentChunkRepository;
import com.knowflow.backend.document.repository.DocumentRepository;
import com.knowflow.backend.document.service.DocumentTextExtractor;
import com.knowflow.backend.knowledgebase.KnowledgeBaseRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
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

    private final KnowledgeBaseRepository knowledgeBaseRepository;
    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final DocumentTextExtractor documentTextExtractor;

    public DocumentController(
            KnowledgeBaseRepository knowledgeBaseRepository,
            DocumentRepository documentRepository,
            DocumentChunkRepository documentChunkRepository,
            DocumentTextExtractor documentTextExtractor) {
        this.knowledgeBaseRepository = knowledgeBaseRepository;
        this.documentRepository = documentRepository;
        this.documentChunkRepository = documentChunkRepository;
        this.documentTextExtractor = documentTextExtractor;
    }

    @PostMapping("/knowledge-bases/{knowledgeBaseId}/documents")
    @ResponseStatus(HttpStatus.CREATED)
    public DocumentResponse uploadDocument(
            @PathVariable Long knowledgeBaseId,
            @RequestPart("file") MultipartFile file,
            @AuthenticationPrincipal Jwt jwt) {
        Long userId = getCurrentUserId(jwt);

        // Ownership is checked before processing so another user's KB cannot be probed through uploads.
        knowledgeBaseRepository.findByIdAndCreatedBy(knowledgeBaseId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "knowledge base not found"));

        validateBasicFile(file);

        Document document = new Document();
        document.setKnowledgeBaseId(knowledgeBaseId);
        document.setOriginalFilename(file.getOriginalFilename());
        document.setContentType(safeContentType(file.getContentType()));
        document.setSizeBytes(file.getSize());
        document.setStatus(STATUS_UPLOADED);
        document.setErrorMessage(null);
        document.setCreatedBy(userId);

        int insertedRows = documentRepository.insert(document);
        if (insertedRows != 1) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "document upload failed");
        }

        // Keep the existing synchronous state flow: UPLOADED -> PROCESSING -> INDEXED/FAILED.
        documentRepository.updateStatusByIdAndCreatedBy(document.getId(), userId, STATUS_PROCESSING, null);

        try {
            String text = documentTextExtractor.extract(file);
            if (text.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Document content is blank");
            }

            // DOCX/HTML only extend text extraction; chunks still feed existing full-text search and RAG.
            List<String> chunks = splitText(text);
            for (int index = 0; index < chunks.size(); index++) {
                String content = chunks.get(index);

                DocumentChunk chunk = new DocumentChunk();
                chunk.setDocumentId(document.getId());
                chunk.setKnowledgeBaseId(knowledgeBaseId);
                chunk.setChunkIndex(index);
                chunk.setContent(content);
                chunk.setCharCount(content.length());

                documentChunkRepository.insert(chunk);
            }

            documentRepository.updateStatusByIdAndCreatedBy(document.getId(), userId, STATUS_INDEXED, null);

            Document saved = getDocumentOr404(document.getId(), userId);
            Long chunkCount = documentChunkRepository.countByDocumentId(saved.getId());
            return new DocumentResponse(saved, chunkCount);
        } catch (DocumentTextExtractor.ExtractionFailure exception) {
            failDocument(document.getId(), userId, exception.getUserMessage());
            throw new ResponseStatusException(exception.getStatus(), exception.getUserMessage());
        } catch (ResponseStatusException exception) {
            String safeMessage = safeReason(exception);
            failDocument(document.getId(), userId, safeMessage);
            throw new ResponseStatusException(resolveStatus(exception), safeMessage);
        } catch (Exception exception) {
            // Sanitized fallback avoids leaking server paths, temp names, dependency stack traces, or DB details.
            failDocument(document.getId(), userId, "Document processing failed");
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Process document failed");
        }
    }

    @GetMapping("/knowledge-bases/{knowledgeBaseId}/documents")
    public List<DocumentResponse> listDocuments(@PathVariable Long knowledgeBaseId, @AuthenticationPrincipal Jwt jwt) {
        Long userId = getCurrentUserId(jwt);
        knowledgeBaseRepository.findByIdAndCreatedBy(knowledgeBaseId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "knowledge base not found"));

        return documentRepository.findAllByKnowledgeBaseIdAndCreatedBy(knowledgeBaseId, userId)
                .stream()
                .map(document -> new DocumentResponse(
                        document,
                        documentChunkRepository.countByDocumentId(document.getId())))
                .toList();
    }

    @PostMapping("/knowledge-bases/{knowledgeBaseId}/search")
    public SearchDocumentResponse searchDocuments(
            @PathVariable Long knowledgeBaseId,
            @RequestBody SearchDocumentRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        Long userId = getCurrentUserId(jwt);

        // Search must also bind KB and user ID to prevent cross-user chunk access.
        knowledgeBaseRepository.findByIdAndCreatedBy(knowledgeBaseId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Knowledge base not found"));

        String query = normalizeSearchQuery(request == null ? null : request.getQuery());
        Integer limit = normalizeSearchLimit(request == null ? null : request.getLimit());

        List<SearchResultResponse> results = documentChunkRepository.searchIndexedChunks(
                knowledgeBaseId,
                userId,
                query,
                limit);
        return new SearchDocumentResponse(query, results);
    }

    @GetMapping("/documents/{documentId}")
    public DocumentResponse getDocument(@PathVariable Long documentId, @AuthenticationPrincipal Jwt jwt) {
        Long userId = getCurrentUserId(jwt);
        Document document = getDocumentOr404(documentId, userId);
        Long chunkCount = documentChunkRepository.countByDocumentId(documentId);
        return new DocumentResponse(document, chunkCount);
    }

    @GetMapping("/documents/{documentId}/chunks")
    public List<DocumentChunkResponse> listChunks(@PathVariable Long documentId, @AuthenticationPrincipal Jwt jwt) {
        Long userId = getCurrentUserId(jwt);
        getDocumentOr404(documentId, userId);

        return documentChunkRepository.findAllByDocumentId(documentId)
                .stream()
                .map(DocumentChunkResponse::new)
                .toList();
    }

    @DeleteMapping("/documents/{documentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDocument(@PathVariable Long documentId, @AuthenticationPrincipal Jwt jwt) {
        Long userId = getCurrentUserId(jwt);
        int rows = documentRepository.deleteByIdAndCreatedBy(documentId, userId);
        if (rows != 1) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
        }
    }

    private Long getCurrentUserId(Jwt jwt) {
        if (jwt == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing token");
        }
        Number userId = jwt.getClaim("userId");
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing userId");
        }
        return userId.longValue();
    }

    private Document getDocumentOr404(Long documentId, Long userId) {
        return documentRepository.findByIdAndCreatedBy(documentId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
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
            // Overlap keeps nearby context when a sentence is split on a chunk boundary.
            start = end - CHUNK_OVERLAP;
        }
        if (chunks.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Document content is blank");
        }
        return chunks;
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

    private String safeContentType(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            return null;
        }
        // Long Office MIME types are kept as metadata but capped to the documents.content_type column size.
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
}
