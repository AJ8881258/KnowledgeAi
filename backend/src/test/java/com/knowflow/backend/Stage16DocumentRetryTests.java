package com.knowflow.backend;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
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

import java.nio.charset.StandardCharsets;
import java.util.Map;

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
        "knowflow.ai.api-key=stage16-test-secret",
        "knowflow.ai.model=stage16-test-model"
})
@AutoConfigureMockMvc
class Stage16DocumentRetryTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private final String password = "stage16-password";

    @BeforeEach
    void cleanBefore() {
        cleanStage16Data();
    }

    @AfterEach
    void cleanAfter() {
        cleanStage16Data();
    }

    @Test
    void failedBlankUploadStoresSourceBytesButDoesNotExposeSourceInResponses() throws Exception {
        Long userId = createUser("stage16_blank_source");
        String token = loginAndGetToken("stage16_blank_source");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage16 Blank Source KB");
        createMembership(knowledgeBaseId, userId, "OWNER");

        mockMvc.perform(multipart("/api/knowledge-bases/{knowledgeBaseId}/documents", knowledgeBaseId)
                        .file(new MockMultipartFile(
                                "file",
                                "blank.txt",
                                "text/plain",
                                "   \n\n  ".getBytes(StandardCharsets.UTF_8)))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Document content is blank"));

        Map<String, Object> row = jdbcTemplate.queryForMap("""
                        select id, status, error_message, source_bytes, source_text
                        from documents
                        where created_by = ? and original_filename = 'blank.txt'
                        """,
                userId);
        assertThat(row.get("status")).isEqualTo("FAILED");
        assertThat(row.get("error_message")).isEqualTo("Document content is blank");
        assertThat((byte[]) row.get("source_bytes")).containsExactly("   \n\n  ".getBytes(StandardCharsets.UTF_8));
        assertThat(row.get("source_text")).isNull();

        Long documentId = ((Number) row.get("id")).longValue();
        mockMvc.perform(get("/api/documents/{documentId}", documentId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sourceStored").value(true))
                .andExpect(jsonPath("$.reprocessAvailable").value(true))
                .andExpect(jsonPath("$.sourceBytes").doesNotExist())
                .andExpect(jsonPath("$.sourceText").doesNotExist())
                .andExpect(content().string(not(containsString("source_bytes"))));
    }

    @Test
    void failedDocumentCanReprocessFromStoredSourceWhenNoChunksExist() throws Exception {
        Long userId = createUser("stage16_retry_source");
        String token = loginAndGetToken("stage16_retry_source");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage16 Retry Source KB");
        createMembership(knowledgeBaseId, userId, "OWNER");

        mockMvc.perform(multipart("/api/knowledge-bases/{knowledgeBaseId}/documents", knowledgeBaseId)
                        .file(new MockMultipartFile(
                                "file",
                                "retry.txt",
                                "text/plain",
                                " ".getBytes(StandardCharsets.UTF_8)))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isBadRequest());

        Long documentId = jdbcTemplate.queryForObject("""
                        select id
                        from documents
                        where created_by = ? and original_filename = 'retry.txt'
                        """,
                Long.class,
                userId);
        assertThat(jdbcTemplate.queryForObject(
                "select count(*) from document_chunks where document_id = ?",
                Integer.class,
                documentId)).isZero();

        jdbcTemplate.update("""
                        update documents
                        set source_bytes = ?,
                            source_text = null,
                            source_text_updated_at = null
                        where id = ?
                        """,
                "stage16 recovered source marker for true retry".getBytes(StandardCharsets.UTF_8),
                documentId);

        mockMvc.perform(post("/api/documents/{documentId}/reprocess", documentId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("INDEXED"))
                .andExpect(jsonPath("$.errorMessage").doesNotExist())
                .andExpect(jsonPath("$.chunkCount").value(1))
                .andExpect(jsonPath("$.sourceStored").value(true))
                .andExpect(jsonPath("$.reprocessAvailable").value(true));

        Map<String, Object> row = jdbcTemplate.queryForMap("""
                        select status, error_message, source_text
                        from documents
                        where id = ?
                        """,
                documentId);
        assertThat(row.get("status")).isEqualTo("INDEXED");
        assertThat(row.get("error_message")).isNull();
        assertThat(row.get("source_text")).isEqualTo("stage16 recovered source marker for true retry");

        mockMvc.perform(get("/api/documents/{documentId}/chunks", documentId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("stage16 recovered source marker for true retry")));
    }

    @Test
    void oldDocumentWithoutSourceOrChunksStillReturnsClearReprocessError() throws Exception {
        Long userId = createUser("stage16_old_document");
        String token = loginAndGetToken("stage16_old_document");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage16 Old Document KB");
        createMembership(knowledgeBaseId, userId, "OWNER");
        Long documentId = createDocument(userId, knowledgeBaseId, "old.md", "FAILED");

        mockMvc.perform(post("/api/documents/{documentId}/reprocess", documentId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Document cannot be reprocessed because no source or indexed text is available"))
                .andExpect(content().string(not(containsString("D:\\"))))
                .andExpect(content().string(not(containsString("stage16-test-secret"))));

        Map<String, Object> row = jdbcTemplate.queryForMap("select status, error_message from documents where id = ?", documentId);
        assertThat(row.get("status")).isEqualTo("FAILED");
        assertThat(row.get("error_message")).isEqualTo("Document cannot be reprocessed because no source or indexed text is available");
    }

    @Test
    void unsupportedFileStoresSourceButRetryKeepsSanitizedUnsupportedError() throws Exception {
        Long userId = createUser("stage16_unsupported_source");
        String token = loginAndGetToken("stage16_unsupported_source");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage16 Unsupported KB");
        createMembership(knowledgeBaseId, userId, "OWNER");

        mockMvc.perform(multipart("/api/knowledge-bases/{knowledgeBaseId}/documents", knowledgeBaseId)
                        .file(new MockMultipartFile(
                                "file",
                                "legacy.doc",
                                "application/msword",
                                "stage16 legacy binary marker".getBytes(StandardCharsets.UTF_8)))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Unsupported file type: .doc"));

        Long documentId = jdbcTemplate.queryForObject("""
                        select id
                        from documents
                        where created_by = ? and original_filename = 'legacy.doc'
                        """,
                Long.class,
                userId);
        assertThat(jdbcTemplate.queryForObject("select source_bytes is not null from documents where id = ?", Boolean.class, documentId))
                .isTrue();

        mockMvc.perform(post("/api/documents/{documentId}/reprocess", documentId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Unsupported file type: .doc"))
                .andExpect(content().string(not(containsString("D:\\"))))
                .andExpect(content().string(not(containsString("stage16-test-secret"))));
    }

    private String loginAndGetToken(String username) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "username", username,
                                "password", password))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andReturn();

        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
        return root.get("accessToken").asText();
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
                        values (?, 'stage16 test', 'ACTIVE', false, 'blue', ?)
                        returning id
                        """,
                Long.class,
                name,
                userId);
    }

    private Long createMembership(Long knowledgeBaseId, Long userId, String role) {
        return jdbcTemplate.queryForObject("""
                        insert into knowledge_base_members (knowledge_base_id, user_id, role)
                        values (?, ?, ?)
                        returning id
                        """,
                Long.class,
                knowledgeBaseId,
                userId,
                role);
    }

    private Long createDocument(Long userId, Long knowledgeBaseId, String filename, String status) {
        return jdbcTemplate.queryForObject("""
                        insert into documents (
                            knowledge_base_id,
                            original_filename,
                            content_type,
                            size_bytes,
                            status,
                            error_message,
                            created_by
                        )
                        values (?, ?, 'text/markdown', 100, ?, null, ?)
                        returning id
                        """,
                Long.class,
                knowledgeBaseId,
                filename,
                status,
                userId);
    }

    private void cleanStage16Data() {
        jdbcTemplate.update("""
                delete from document_chunks
                where document_id in (
                    select d.id
                    from documents d
                    join users u on u.id = d.created_by
                    where u.username like 'stage16_%'
                )
                """);
        jdbcTemplate.update("""
                delete from documents
                where created_by in (select id from users where username like 'stage16_%')
                """);
        jdbcTemplate.update("""
                delete from knowledge_base_members
                where user_id in (select id from users where username like 'stage16_%')
                   or knowledge_base_id in (
                       select kb.id
                       from knowledge_bases kb
                       join users u on u.id = kb.created_by
                       where u.username like 'stage16_%'
                   )
                """);
        jdbcTemplate.update("""
                delete from knowledge_bases
                where created_by in (select id from users where username like 'stage16_%')
                """);
        jdbcTemplate.update("delete from users where username like 'stage16_%'");
    }
}
