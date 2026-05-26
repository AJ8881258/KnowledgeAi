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
import com.knowflow.backend.knowledgebase.service.KnowledgeBaseAccessService;
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

import static com.knowflow.backend.common.utils.AuthUtils.getCurrentUserId;

@RestController
@RequestMapping("/api")
public class DocumentController {

    private static final long MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;//大小
    private static final int CHUNK_SIZE = 1000;//区块大小
    private static final int CHUNK_OVERLAP = 150;//重叠量
    private static final int CONTENT_TYPE_MAX_LENGTH = 64;//内容类型最大长度

    private static final String STATUS_UPLOADED = "UPLOADED";//上传中
    private static final String STATUS_PROCESSING = "PROCESSING";//处理中
    private static final String STATUS_INDEXED = "INDEXED";//已索引
    private static final String STATUS_FAILED = "FAILED";//失败

    private static final int DEFAULT_SEARCH_LIMIT = 5;//默认搜索限制
    private static final int MAX_SEARCH_LIMIT = 20;//最大搜索限制

    private final KnowledgeBaseAccessService accessService;
    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final DocumentTextExtractor documentTextExtractor;

    public DocumentController(
            KnowledgeBaseAccessService accessService,
            DocumentRepository documentRepository,
            DocumentChunkRepository documentChunkRepository,
            DocumentTextExtractor documentTextExtractor) {
        this.accessService = accessService;
        this.documentRepository = documentRepository;
        this.documentChunkRepository = documentChunkRepository;
        this.documentTextExtractor = documentTextExtractor;
    }

    /**
     * 上传指定数据库的文档
     *
     * @param knowledgeBaseId
     * @param file
     * @param jwt
     * @return
     */
    @PostMapping("/knowledge-bases/{knowledgeBaseId}/documents")
    @ResponseStatus(HttpStatus.CREATED)
    public DocumentResponse uploadDocument(
            @PathVariable Long knowledgeBaseId,
            @RequestPart("file") MultipartFile file,
            @AuthenticationPrincipal Jwt jwt) {
        Long userId = getCurrentUserId(jwt);

        // Stage 12: upload is a write action, so OWNER / EDITOR can proceed and VIEWER gets 403.
        accessService.requireEditor(knowledgeBaseId, userId);

        // 验证文件是否符合要求
        validateBasicFile(file);

        // 创建文档实体
        Document document = new Document();
        document.setKnowledgeBaseId(knowledgeBaseId);
        document.setOriginalFilename(file.getOriginalFilename());
        document.setContentType(safeContentType(file.getContentType()));
        document.setSizeBytes(file.getSize());
        document.setStatus(STATUS_UPLOADED);
        document.setErrorMessage(null);
        document.setCreatedBy(userId);

        // 插入文档
        int insertedRows = documentRepository.insert(document);
        if (insertedRows != 1) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "document upload failed");
        }

        // 更新文档状态为处理中
        documentRepository.updateStatusByIdAndCreatedBy(document.getId(), userId, STATUS_PROCESSING, null);

        // 提取文档文本
        try {
            String text = documentTextExtractor.extract(file);
            if (text.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Document content is blank");
            }

            // 分块文本
            List<String> chunks = splitText(text);
            for (int index = 0; index < chunks.size(); index++) {
                String content = chunks.get(index);
                // 创建文档块实体
                DocumentChunk chunk = new DocumentChunk();
                chunk.setDocumentId(document.getId());
                chunk.setKnowledgeBaseId(knowledgeBaseId);
                chunk.setChunkIndex(index);
                chunk.setContent(content);
                chunk.setCharCount(content.length());
                // 插入文档块实体
                documentChunkRepository.insert(chunk);
            }
            // 更新文档状态为已索引
            documentRepository.updateStatusByIdAndCreatedBy(document.getId(), userId, STATUS_INDEXED, null);
            // 获取文档实体确认索引状态
            Document saved = getAccessibleDocumentOr404(document.getId(), userId);
            // 统计文档块数量
            Long chunkCount = documentChunkRepository.countByDocumentId(saved.getId());
            return new DocumentResponse(saved, chunkCount);
        } catch (DocumentTextExtractor.ExtractionFailure exception) {
            //捕获文本提取异常
            failDocument(document.getId(), userId, exception.getUserMessage());
            throw new ResponseStatusException(exception.getStatus(), exception.getUserMessage());
        } catch (ResponseStatusException exception) {
            //捕获其他异常
            String safeMessage = safeReason(exception);
            failDocument(document.getId(), userId, safeMessage);
            throw new ResponseStatusException(resolveStatus(exception), safeMessage);
        } catch (Exception exception) {
            //捕获最终无法预估的异常
            failDocument(document.getId(), userId, "Document processing failed");
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Process document failed");
        }
    }


    /**
     * 获取指定数据库的所有文档
     *
     * @param knowledgeBaseId
     * @param jwt
     * @return
     */
    @GetMapping("/knowledge-bases/{knowledgeBaseId}/documents")
    public List<DocumentResponse> listDocuments(@PathVariable Long knowledgeBaseId, @AuthenticationPrincipal Jwt jwt) {
        Long userId = getCurrentUserId(jwt);
        // 检查数据库是否存在
        accessService.requireMember(knowledgeBaseId, userId);
        // 查询所有文档
        return documentRepository.findAllByKnowledgeBaseId(knowledgeBaseId)
                .stream()
                .map(document -> new DocumentResponse(
                        document,
                        documentChunkRepository.countByDocumentId(document.getId())))
                .toList();
    }

    /**
     * 搜索指定数据库中的文档
     * @param knowledgeBaseId
     * @param request
     * @param jwt
     * @return
     */
    @PostMapping("/knowledge-bases/{knowledgeBaseId}/search")
    public SearchDocumentResponse searchDocuments(
            @PathVariable Long knowledgeBaseId,
            @RequestBody SearchDocumentRequest request, //讲json转换为SearchDocumentRequest对象
            @AuthenticationPrincipal Jwt jwt) {
        Long userId = getCurrentUserId(jwt);

        // 检查数据库是否存在
        // Stage 12: search is read access for every member; non-members still receive 404.
        accessService.requireMember(knowledgeBaseId, userId);


        // 规范搜索查询
        String query = normalizeSearchQuery(request == null ? null : request.getQuery());
        Integer limit = normalizeSearchLimit(request == null ? null : request.getLimit());


        // 搜索文档块
        List<SearchResultResponse> results = documentChunkRepository.searchIndexedChunks(
                knowledgeBaseId,
                userId,
                query,
                limit);
        return new SearchDocumentResponse(query, results);
    }


    /**
     * 获取指定文档的详细信息
     * @param documentId
     * @param jwt
     * @return
     */
    @GetMapping("/documents/{documentId}")
    public DocumentResponse getDocument(@PathVariable Long documentId, @AuthenticationPrincipal Jwt jwt) {
        Long userId = getCurrentUserId(jwt);
        Document document = getAccessibleDocumentOr404(documentId, userId);
        Long chunkCount = documentChunkRepository.countByDocumentId(documentId);
        return new DocumentResponse(document, chunkCount);
    }


    /**
     * 获取指定文档的所有块
     * @param documentId
     * @param jwt
     * @return
     */
    @GetMapping("/documents/{documentId}/chunks")
    public List<DocumentChunkResponse> listChunks(@PathVariable Long documentId, @AuthenticationPrincipal Jwt jwt) {
        Long userId = getCurrentUserId(jwt);
        getAccessibleDocumentOr404(documentId,userId);

        return documentChunkRepository.findAllByDocumentId(documentId)
                .stream()
                .map(DocumentChunkResponse::new)//等价于 chunk -> new DocumentChunkResponse(chunk)
                .toList();
    }


    /**
     * 删除指定文档
     * @param documentId
     * @param jwt
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

    // 规范搜索查询
    private String normalizeSearchQuery(String query) {
        if (query == null || query.trim().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "query is empty");
        }
        return query.trim();
    }

    // 规范搜索限制
    private Integer normalizeSearchLimit(Integer limit) {
        if (limit == null) {
            return DEFAULT_SEARCH_LIMIT;
        }
        if (limit < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "limit must be >=1");
        }
        return Math.min(limit, MAX_SEARCH_LIMIT);
    }

    // 分块文本算法
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

    // 验证文件是否符合要求
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


    // 处理文档处理失败并更新失败状态
    private void failDocument(Long documentId, Long userId, String safeMessage) {
        documentRepository.updateStatusByIdAndCreatedBy(documentId, userId, STATUS_FAILED, safeMessage);
    }

    // 处理异常消息，确保不为空
    private String safeReason(ResponseStatusException exception) {
        if (exception.getReason() == null || exception.getReason().isBlank()) {
            return "Document processing failed";
        }
        return exception.getReason();
    }

    /**
     * 解析异常状态码
     * @param exception
     * @return
     */
    private HttpStatus resolveStatus(ResponseStatusException exception) {
        HttpStatus status = HttpStatus.resolve(exception.getStatusCode().value());
        return status == null ? HttpStatus.INTERNAL_SERVER_ERROR : status;
    }

    /**
     * 获取可访问文档
     * @param documentId
     * @param userId
     * @return
     */
    private Document getAccessibleDocumentOr404(Long documentId, Long userId) {
        return documentRepository.findAccessibleById(documentId, userId)
                // 非成员访问文档也返回 404，避免通过 documentId 探测资源。
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
    }
}
