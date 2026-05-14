package com.knowflow.backend.document;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.knowflow.backend.knowledgebase.KnowledgeBaseRepository;

// @RestController 表示这是 REST API 控制器，返回对象会自动转成 JSON。
@RestController
@RequestMapping("/api")
public class DocumentController {

    // 文件大小、切片长度、状态
    private static final long MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
    private static final int CHUNK_SIZE = 1000;
    private static final int CHUNK_OVERLAP = 150;

    // 文档状态（上传中、处理中、已索引、处理失败）
    private static final String STATUS_UPLOADED = "UPLOADED";
    private static final String STATUS_PROCESSING = "PROCESSING";
    private static final String STATUS_INDEXED = "INDEXED";
    private static final String STATUS_FAILED = "FAILED";

    // rep
    private final KnowledgeBaseRepository knowledgeBaseRepository;
    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;

    // 带参构造函数
    public DocumentController(
            KnowledgeBaseRepository knowledgeBaseRepository,
            DocumentRepository documentRepository,
            DocumentChunkRepository documentChunkRepository) {
        this.knowledgeBaseRepository = knowledgeBaseRepository;
        this.documentRepository = documentRepository;
        this.documentChunkRepository = documentChunkRepository;
    }

    // 路径里的 knowledgeBaseId 表示上传到哪个知识库。
    // @RequestPart("file") 用来接收 multipart/form-data 里的文件字段。
    @PostMapping("/knowledge-bases/{knowledgeBaseId}/documents")
    @ResponseStatus(HttpStatus.CREATED)
    public DocumentResponse uploadDocument(
            // @RequestPart("file") 用来接收 multipart/form-data 里的文件字段。
            @PathVariable Long knowledgeBaseId,
            @RequestPart("file") MultipartFile file,
            @AuthenticationPrincipal Jwt jwt) {
        // 权限校验：知识库必须属于当前登录用户。
        // 如果不存在或不是自己的，统一返回 404，避免泄露别人的资源是否存在。
        Long userId = getCurrentUserId(jwt);
        knowledgeBaseRepository.findByIdAndCreatedBy(knowledgeBaseId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "knowledge base not found"));
        validateFile(file);
        Document document = new Document();
        document.setKnowledgeBaseId(knowledgeBaseId);
        document.setOriginalFilename(file.getOriginalFilename());
        document.setContentType(file.getContentType());
        document.setSizeBytes(file.getSize());
        document.setStatus(STATUS_UPLOADED);
        document.setErrorMessage(null);
        document.setCreatedBy(userId);

        int insertedRows = documentRepository.insert(document);
        if (insertedRows != 1) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "document upload failed");
        }
        documentRepository.updateStatusByIdAndCreatedBy(document.getId(), userId, STATUS_PROCESSING, null);

        try {
            String text = readText(file);
            // 空白文本推荐保留 FAILED 记录：
            // 这样用户能在文档列表看到失败原因，也方便你学习状态流转。

            if (text.isBlank()) {
                documentRepository.updateStatusByIdAndCreatedBy(
                        document.getId(), userId, STATUS_FAILED, "Document is blank");
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Document is blank");
            }
            List<String> chunks = splitText(text);
            for (int i = 0; i < chunks.size(); i++) {

                String content = chunks.get(i);
                DocumentChunk chunk = new DocumentChunk();
                chunk.setDocumentId(document.getId());
                chunk.setKnowledgeBaseId(knowledgeBaseId);
                chunk.setChunkIndex(i);
                chunk.setContent(content);
                chunk.setCharCount(content.length());

                documentChunkRepository.insert(chunk);
            }
            documentRepository.updateStatusByIdAndCreatedBy(document.getId(), userId, STATUS_INDEXED, null);

            Document saved = getDocumentOr404(document.getId(), userId);
            Long chunkCount = documentChunkRepository.countByDocumentId(saved.getId());
            return new DocumentResponse(saved, chunkCount);
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            documentRepository.updateStatusByIdAndCreatedBy(
                    document.getId(), userId, STATUS_FAILED, exception.getMessage());
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Process document failed");
        }
    }

    // 获取某个知识库下文档列表
    @GetMapping("/knowledge-bases/{knowledgeBaseId}/documents")
    public List<DocumentResponse> listDocuments(
            @PathVariable Long knowledgeBaseId,
            @AuthenticationPrincipal Jwt jwt) {
        Long userId = getCurrentUserId(jwt);
        knowledgeBaseRepository.findByIdAndCreatedBy(knowledgeBaseId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "knowledge base not found"));
        return documentRepository.findAllByKnowledgeBaseIdAndCreatedBy(knowledgeBaseId, userId)
                .stream()
                .map(document -> new DocumentResponse(document,
                        documentChunkRepository.countByDocumentId(document.getId())))
                .toList();
    }

    // 获取文档详情
    @GetMapping("/documents/{documentId}")
    public DocumentResponse getDocument(
            @PathVariable Long documentId,
            @AuthenticationPrincipal Jwt jwt) {
        Long userId = getCurrentUserId(jwt);
        Document document = getDocumentOr404(documentId, userId);
        Long chunkCount = documentChunkRepository.countByDocumentId(documentId);
        return new DocumentResponse(document, chunkCount);
    }

    // 获取文档切片列表
    @GetMapping("/documents/{documentId}/chunks")
    public List<DocumentChunkResponse> listChunks(
            @PathVariable Long documentId,
            @AuthenticationPrincipal Jwt jwt) {
        Long userId = getCurrentUserId(jwt);

        // 确认文档所有人
        getDocumentOr404(documentId, userId);
        return documentChunkRepository.findAllByDocumentId(documentId)
                .stream()
                .map(DocumentChunkResponse::new)
                .toList();
    }

    // 删除文档。
    // document_chunks.document_id 已设置 ON DELETE CASCADE，所以删除文档会自动删除 chunks。
    @DeleteMapping("/documents/{documentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDocument(
            @PathVariable Long documentId,
            @AuthenticationPrincipal Jwt jwt) {

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

    private void validateFile(MultipartFile file) {
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
        String lowerName = filename.toLowerCase();
        if (!lowerName.endsWith(".txt") &&
                !lowerName.endsWith(".pdf") &&
                !lowerName.endsWith(".md") &&
                !lowerName.endsWith(".markdown")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File must be txt, pdf, md/markdown");
        }
    }

    private String readText(MultipartFile file) throws IOException {
        String fileName = file.getOriginalFilename();
        // pdf 文件需要使用专门的解析器提取文本
        if (fileName != null && fileName.toLowerCase().endsWith(".pdf")) {
            return readPdfText(file);
        }
        // 文档解析器：支持 txt, md, markdown 格式文件
        return new String(file.getBytes(), StandardCharsets.UTF_8);
    }

    private String readPdfText(MultipartFile file) throws IOException {
        try (PDDocument document = Loader.loadPDF(file.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document);
        }
    }

    private List<String> splitText(String text) {
        List<String> chunks = new ArrayList<>();
        int start = 0;
        int textLength = text.length();
        while (start < textLength) {
            int end = Math.min(start + CHUNK_SIZE, textLength);
            String chunk = text.substring(start, end).trim();

            // trim 后为空的片段不入库，避免产生无意义 chunk。
            if (!chunk.isBlank()) {
                chunks.add(chunk);
            }
            if (end >= textLength) {
                break;
            }
            // overlap 的作用：
            // 下一个 chunk 往回重叠 150 个字符，避免一句话刚好被切断后丢失上下文。

            start = end - CHUNK_OVERLAP;
        }
        if (chunks.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Document content is blank");
        }
        return chunks;
    }

}
