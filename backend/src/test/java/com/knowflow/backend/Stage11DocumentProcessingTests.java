package com.knowflow.backend;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "knowflow.ai.base-url=http://127.0.0.1:1/v1",
        "knowflow.ai.api-key=stage11-test-secret",
        "knowflow.ai.model=stage11-test-model"
})
@AutoConfigureMockMvc
class Stage11DocumentProcessingTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private final String password = "stage11-password";

    @BeforeEach
    void cleanBefore() {
        cleanStage11Data();
    }

    @AfterEach
    void cleanAfter() {
        cleanStage11Data();
    }

    @Test
    void txtUploadStillUsesExistingIndexingFlow() throws Exception {
        Long userId = createUser("stage11_txt_existing");
        String token = loginAndGetToken("stage11_txt_existing");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage11 TXT KB");

        MvcResult upload = mockMvc.perform(multipart("/api/knowledge-bases/{knowledgeBaseId}/documents", knowledgeBaseId)
                        .file(new MockMultipartFile("file", "note.txt", "text/plain", "Stage11 TXT marker".getBytes(StandardCharsets.UTF_8)))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("INDEXED"))
                .andExpect(jsonPath("$.chunkCount").value(1))
                .andReturn();

        Long documentId = readDocumentId(upload);

        mockMvc.perform(get("/api/documents/{documentId}/chunks", documentId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Stage11 TXT marker")));
    }

    @Test
    void markdownUploadStillUsesExistingIndexingFlow() throws Exception {
        Long userId = createUser("stage11_markdown_existing");
        String token = loginAndGetToken("stage11_markdown_existing");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage11 Markdown KB");

        MvcResult upload = mockMvc.perform(multipart("/api/knowledge-bases/{knowledgeBaseId}/documents", knowledgeBaseId)
                        .file(new MockMultipartFile("file", "note.markdown", "text/markdown", "# Stage11 Markdown marker".getBytes(StandardCharsets.UTF_8)))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("INDEXED"))
                .andExpect(jsonPath("$.chunkCount").value(1))
                .andReturn();

        Long documentId = readDocumentId(upload);

        mockMvc.perform(get("/api/documents/{documentId}/chunks", documentId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Stage11 Markdown marker")));
    }

    @Test
    void textPdfUploadStillUsesExistingIndexingFlow() throws Exception {
        Long userId = createUser("stage11_pdf_existing");
        String token = loginAndGetToken("stage11_pdf_existing");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage11 PDF KB");

        MvcResult upload = mockMvc.perform(multipart("/api/knowledge-bases/{knowledgeBaseId}/documents", knowledgeBaseId)
                        .file(new MockMultipartFile("file", "note.pdf", "application/pdf", textPdfBytes("Stage11 PDF marker")))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("INDEXED"))
                .andExpect(jsonPath("$.chunkCount").value(1))
                .andReturn();

        Long documentId = readDocumentId(upload);

        mockMvc.perform(get("/api/documents/{documentId}/chunks", documentId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Stage11 PDF marker")));
    }

    @Test
    void docxUploadIsIndexedAndCreatesChunks() throws Exception {
        Long userId = createUser("stage11_docx_indexed");
        String token = loginAndGetToken("stage11_docx_indexed");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage11 DOCX KB");

        MvcResult upload = mockMvc.perform(multipart("/api/knowledge-bases/{knowledgeBaseId}/documents", knowledgeBaseId)
                        .file(docxFile(
                                "guide.docx",
                                new String[]{"Stage11 DOCX paragraph marker"},
                                new String[]{}))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.originalFilename").value("guide.docx"))
                .andExpect(jsonPath("$.status").value("INDEXED"))
                .andExpect(jsonPath("$.errorMessage").doesNotExist())
                .andExpect(jsonPath("$.chunkCount").value(1))
                .andReturn();

        Long documentId = readDocumentId(upload);

        mockMvc.perform(get("/api/documents/{documentId}/chunks", documentId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Stage11 DOCX paragraph marker")));
    }

    @Test
    void docxTableTextIsExtractedIntoChunks() throws Exception {
        Long userId = createUser("stage11_docx_table");
        String token = loginAndGetToken("stage11_docx_table");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage11 DOCX Table KB");

        MvcResult upload = mockMvc.perform(multipart("/api/knowledge-bases/{knowledgeBaseId}/documents", knowledgeBaseId)
                        .file(docxFile(
                                "table.docx",
                                new String[]{"Stage11 table intro"},
                                new String[]{"Stage11 table cell marker", "Stage11 table value marker"}))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("INDEXED"))
                .andReturn();

        Long documentId = readDocumentId(upload);

        mockMvc.perform(get("/api/documents/{documentId}/chunks", documentId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Stage11 table cell marker")))
                .andExpect(content().string(containsString("Stage11 table value marker")));
    }

    @Test
    void htmlUploadExtractsVisibleTextAndFiltersScriptStyleNoscript() throws Exception {
        Long userId = createUser("stage11_html_visible");
        String token = loginAndGetToken("stage11_html_visible");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage11 HTML KB");

        String html = """
                <!doctype html>
                <html>
                  <head>
                    <style>.x { color: red; } stage11-style-marker</style>
                    <script>const secret = 'stage11-script-marker';</script>
                  </head>
                  <body>
                    <main>
                      <h1>Stage11 visible heading marker</h1>
                      <p>Stage11 visible paragraph marker</p>
                    </main>
                    <noscript>stage11-noscript-marker</noscript>
                  </body>
                </html>
                """;

        MvcResult upload = mockMvc.perform(multipart("/api/knowledge-bases/{knowledgeBaseId}/documents", knowledgeBaseId)
                        .file(new MockMultipartFile("file", "page.html", "text/html", html.getBytes(StandardCharsets.UTF_8)))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("INDEXED"))
                .andReturn();

        Long documentId = readDocumentId(upload);

        mockMvc.perform(get("/api/documents/{documentId}/chunks", documentId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Stage11 visible heading marker")))
                .andExpect(content().string(containsString("Stage11 visible paragraph marker")))
                .andExpect(content().string(not(containsString("stage11-script-marker"))))
                .andExpect(content().string(not(containsString("stage11-style-marker"))))
                .andExpect(content().string(not(containsString("stage11-noscript-marker"))));
    }

    @Test
    void htmSuffixIsHandled() throws Exception {
        Long userId = createUser("stage11_htm_suffix");
        String token = loginAndGetToken("stage11_htm_suffix");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage11 HTM KB");

        String html = "<html><body><article>Stage11 HTM suffix visible marker</article></body></html>";

        MvcResult upload = mockMvc.perform(multipart("/api/knowledge-bases/{knowledgeBaseId}/documents", knowledgeBaseId)
                        .file(new MockMultipartFile("file", "page.htm", "text/html", html.getBytes(StandardCharsets.UTF_8)))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("INDEXED"))
                .andExpect(jsonPath("$.chunkCount").value(1))
                .andReturn();

        Long documentId = readDocumentId(upload);

        mockMvc.perform(get("/api/documents/{documentId}/chunks", documentId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Stage11 HTM suffix visible marker")));
    }

    @Test
    void legacyDocReturns400() throws Exception {
        Long userId = createUser("stage11_legacy_doc");
        String token = loginAndGetToken("stage11_legacy_doc");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage11 Legacy DOC KB");

        mockMvc.perform(multipart("/api/knowledge-bases/{knowledgeBaseId}/documents", knowledgeBaseId)
                        .file(new MockMultipartFile("file", "legacy.doc", "application/msword", "legacy".getBytes(StandardCharsets.UTF_8)))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Unsupported file type: .doc"));

        assertFailedDocument(userId, "legacy.doc", "Unsupported file type: .doc");
    }

    @Test
    void pptxReturns400() throws Exception {
        Long userId = createUser("stage11_pptx");
        String token = loginAndGetToken("stage11_pptx");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage11 PPTX KB");

        mockMvc.perform(multipart("/api/knowledge-bases/{knowledgeBaseId}/documents", knowledgeBaseId)
                        .file(new MockMultipartFile("file", "slides.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "pptx".getBytes(StandardCharsets.UTF_8)))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Unsupported file type: .pptx"));

        assertFailedDocument(userId, "slides.pptx", "Unsupported file type: .pptx");
    }

    @Test
    void xlsxReturns400() throws Exception {
        Long userId = createUser("stage11_xlsx");
        String token = loginAndGetToken("stage11_xlsx");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage11 XLSX KB");

        mockMvc.perform(multipart("/api/knowledge-bases/{knowledgeBaseId}/documents", knowledgeBaseId)
                        .file(new MockMultipartFile("file", "sheet.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx".getBytes(StandardCharsets.UTF_8)))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Unsupported file type: .xlsx"));

        assertFailedDocument(userId, "sheet.xlsx", "Unsupported file type: .xlsx");
    }

    @Test
    void emptyDocxReturns400AndMarksDocumentFailed() throws Exception {
        Long userId = createUser("stage11_empty_docx");
        String token = loginAndGetToken("stage11_empty_docx");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage11 Empty DOCX KB");

        mockMvc.perform(multipart("/api/knowledge-bases/{knowledgeBaseId}/documents", knowledgeBaseId)
                        .file(docxFile("empty.docx", new String[]{}, new String[]{}))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Document content is blank"));

        assertFailedDocument(userId, "empty.docx", "Document content is blank");
    }

    @Test
    void emptyHtmlReturns400AndMarksDocumentFailed() throws Exception {
        Long userId = createUser("stage11_empty_html");
        String token = loginAndGetToken("stage11_empty_html");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage11 Empty HTML KB");

        String html = """
                <html>
                  <head><style>stage11-style-only</style></head>
                  <body><script>stage11-script-only</script><noscript>stage11-noscript-only</noscript></body>
                </html>
                """;

        mockMvc.perform(multipart("/api/knowledge-bases/{knowledgeBaseId}/documents", knowledgeBaseId)
                        .file(new MockMultipartFile("file", "empty.html", "text/html", html.getBytes(StandardCharsets.UTF_8)))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Document content is blank"));

        assertFailedDocument(userId, "empty.html", "Document content is blank");
    }

    private String loginAndGetToken(String username) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "username", username,
                                "password", password))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andReturn();

        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
        return root.get("accessToken").asText();
    }

    private Long readDocumentId(MvcResult result) throws Exception {
        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
        return root.get("id").asLong();
    }

    private Long createUser(String username) {
        return jdbcTemplate.queryForObject("""
                        insert into users (username, password_hash, role)
                        values (?, ?, 'USER')
                        on conflict (username)
                        do update set password_hash = excluded.password_hash,
                                      role = excluded.role,
                                      updated_at = now()
                        returning id
                        """,
                Long.class,
                username,
                passwordEncoder.encode(password));
    }

    private Long createKnowledgeBase(Long userId, String name) {
        return jdbcTemplate.queryForObject("""
                        insert into knowledge_bases (name, description, status, featured, theme_id, created_by)
                        values (?, 'stage11 test', 'ACTIVE', false, 'blue', ?)
                        returning id
                        """,
                Long.class,
                name,
                userId);
    }

    private void assertFailedDocument(Long userId, String filename, String expectedErrorMessage) {
        Map<String, Object> row = jdbcTemplate.queryForMap("""
                        select status, error_message
                        from documents
                        where created_by = ? and original_filename = ?
                        order by id desc
                        limit 1
                        """,
                userId,
                filename);

        assertThat(row.get("status")).isEqualTo("FAILED");
        assertThat(row.get("error_message")).isEqualTo(expectedErrorMessage);

        Integer chunkCount = jdbcTemplate.queryForObject("""
                        select count(*)
                        from document_chunks c
                        join documents d on d.id = c.document_id
                        where d.created_by = ? and d.original_filename = ?
                        """,
                Integer.class,
                userId,
                filename);
        assertThat(chunkCount).isZero();
    }

    private MockMultipartFile docxFile(String filename, String[] paragraphs, String[] tableCells) throws Exception {
        return new MockMultipartFile(
                "file",
                filename,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                docxBytes(paragraphs, tableCells));
    }

    private byte[] docxBytes(String[] paragraphs, String[] tableCells) throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(output, StandardCharsets.UTF_8)) {
            putZipEntry(zip, "[Content_Types].xml", """
                    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
                      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
                      <Default Extension="xml" ContentType="application/xml"/>
                      <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
                    </Types>
                    """);
            putZipEntry(zip, "_rels/.rels", """
                    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
                    </Relationships>
                    """);
            putZipEntry(zip, "word/document.xml", documentXml(paragraphs, tableCells));
        }
        return output.toByteArray();
    }

    private byte[] textPdfBytes(String text) throws Exception {
        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            document.addPage(page);
            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                content.beginText();
                content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                content.newLineAtOffset(72, 720);
                content.showText(text);
                content.endText();
            }
            document.save(output);
            return output.toByteArray();
        }
    }

    private String documentXml(String[] paragraphs, String[] tableCells) {
        StringBuilder body = new StringBuilder();
        for (String paragraph : paragraphs) {
            body.append("<w:p><w:r><w:t>")
                    .append(xmlEscape(paragraph))
                    .append("</w:t></w:r></w:p>");
        }
        if (tableCells.length > 0) {
            body.append("<w:tbl><w:tr>");
            for (String cell : tableCells) {
                body.append("<w:tc><w:p><w:r><w:t>")
                        .append(xmlEscape(cell))
                        .append("</w:t></w:r></w:p></w:tc>");
            }
            body.append("</w:tr></w:tbl>");
        }
        return """
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                  <w:body>
                    %s
                  </w:body>
                </w:document>
                """.formatted(body);
    }

    private void putZipEntry(ZipOutputStream zip, String name, String content) throws Exception {
        zip.putNextEntry(new ZipEntry(name));
        zip.write(content.getBytes(StandardCharsets.UTF_8));
        zip.closeEntry();
    }

    private String xmlEscape(String value) {
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&apos;");
    }

    private void cleanStage11Data() {
        jdbcTemplate.update("""
                delete from chat_message_sources
                where message_id in (
                    select m.id
                    from chat_messages m
                    join chat_sessions s on s.id = m.session_id
                    join users u on u.id = s.user_id
                    where u.username like 'stage11_%'
                )
                """);

        jdbcTemplate.update("""
                delete from chat_messages
                where session_id in (
                    select s.id
                    from chat_sessions s
                    join users u on u.id = s.user_id
                    where u.username like 'stage11_%'
                )
                """);

        jdbcTemplate.update("""
                delete from chat_sessions
                where user_id in (
                    select id from users where username like 'stage11_%'
                )
                """);

        jdbcTemplate.update("""
                delete from document_chunks
                where document_id in (
                    select d.id
                    from documents d
                    join users u on u.id = d.created_by
                    where u.username like 'stage11_%'
                )
                """);

        jdbcTemplate.update("""
                delete from documents
                where created_by in (
                    select id from users where username like 'stage11_%'
                )
                """);

        jdbcTemplate.update("""
                delete from knowledge_bases
                where created_by in (
                    select id from users where username like 'stage11_%'
                )
                """);

        jdbcTemplate.update("""
                delete from user_rag_settings
                where user_id in (
                    select id from users where username like 'stage11_%'
                )
                """);

        jdbcTemplate.update("delete from users where username like 'stage11_%'");
    }
}
