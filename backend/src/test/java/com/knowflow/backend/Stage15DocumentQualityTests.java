package com.knowflow.backend;

import com.knowflow.backend.chat.model.ChatModelClient;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(
        classes = {KnowflowBackendApplication.class, Stage15DocumentQualityTests.Stage15ModelTestConfig.class},
        properties = {
                "knowflow.ai.base-url=http://127.0.0.1:1/v1",
                "knowflow.ai.api-key=stage15-test-secret",
                "knowflow.ai.model=stage15-test-model"
        }
)
@AutoConfigureMockMvc
class Stage15DocumentQualityTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private RecordingChatModelClient modelClient;

    private final String password = "stage15-password";

    @BeforeEach
    void cleanBefore() {
        modelClient.reset();
        cleanStage15Data();
    }

    @AfterEach
    void cleanAfter() {
        modelClient.reset();
        cleanStage15Data();
    }

    @Test
    void qualityEndpointReturnsChunkMetricsAndWarningsForMembersOnly() throws Exception {
        Long ownerId = createUser("stage15_quality_owner");
        Long viewerId = createUser("stage15_quality_viewer");
        createUser("stage15_quality_nonmember");
        String ownerToken = loginAndGetToken("stage15_quality_owner");
        String viewerToken = loginAndGetToken("stage15_quality_viewer");
        String nonMemberToken = loginAndGetToken("stage15_quality_nonmember");
        Long knowledgeBaseId = createKnowledgeBase(ownerId, "Stage15 Quality KB");
        createMembership(knowledgeBaseId, ownerId, "OWNER");
        createMembership(knowledgeBaseId, viewerId, "VIEWER");
        Long documentId = createDocument(ownerId, knowledgeBaseId, "quality.md", "INDEXED");
        createChunk(documentId, knowledgeBaseId, 0, "tiny");
        createChunk(documentId, knowledgeBaseId, 1, "stage15 quality searchable marker with enough text");

        mockMvc.perform(get("/api/documents/{documentId}/quality", documentId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.documentId").value(documentId))
                .andExpect(jsonPath("$.status").value("INDEXED"))
                .andExpect(jsonPath("$.chunkCount").value(2))
                .andExpect(jsonPath("$.charCount").value(54))
                .andExpect(jsonPath("$.minChunkLength").value(4))
                .andExpect(jsonPath("$.maxChunkLength").value(50))
                .andExpect(jsonPath("$.averageChunkLength").value(27.0))
                .andExpect(jsonPath("$.qualityWarnings[0]").value("DOCUMENT_TOO_SHORT"))
                .andExpect(jsonPath("$.qualityWarnings[1]").value("CHUNK_TOO_SHORT"))
                .andExpect(jsonPath("$.updatedAt").isNotEmpty());

        mockMvc.perform(get("/api/documents/{documentId}", documentId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + viewerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.chunkCount").value(2))
                .andExpect(jsonPath("$.charCount").value(54))
                .andExpect(jsonPath("$.qualityWarnings[0]").value("DOCUMENT_TOO_SHORT"))
                .andExpect(jsonPath("$.qualityWarnings[1]").value("CHUNK_TOO_SHORT"));

        mockMvc.perform(get("/api/documents/{documentId}/quality", documentId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + nonMemberToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void ownerAndEditorCanReprocessDocumentAndSearchUsesNewChunks() throws Exception {
        Long ownerId = createUser("stage15_reprocess_owner");
        Long editorId = createUser("stage15_reprocess_editor");
        Long viewerId = createUser("stage15_reprocess_viewer");
        createUser("stage15_reprocess_nonmember");
        String ownerToken = loginAndGetToken("stage15_reprocess_owner");
        String editorToken = loginAndGetToken("stage15_reprocess_editor");
        String viewerToken = loginAndGetToken("stage15_reprocess_viewer");
        String nonMemberToken = loginAndGetToken("stage15_reprocess_nonmember");
        Long knowledgeBaseId = createKnowledgeBase(ownerId, "Stage15 Reprocess KB");
        createMembership(knowledgeBaseId, ownerId, "OWNER");
        createMembership(knowledgeBaseId, editorId, "EDITOR");
        createMembership(knowledgeBaseId, viewerId, "VIEWER");
        Long documentId = createDocument(ownerId, knowledgeBaseId, "reprocess.md", "INDEXED");
        Long oldChunkId = createChunk(documentId, knowledgeBaseId, 0, "stage15 old marker");
        createChunk(documentId, knowledgeBaseId, 1, "stage15 new marker after reprocess");

        mockMvc.perform(post("/api/documents/{documentId}/reprocess", documentId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + editorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("INDEXED"))
                .andExpect(jsonPath("$.chunkCount").value(1))
                .andExpect(jsonPath("$.errorMessage").doesNotExist());

        assertThat(jdbcTemplate.queryForObject("select count(*) from document_chunks where id = ?", Integer.class, oldChunkId)).isZero();

        mockMvc.perform(post("/api/knowledge-bases/{knowledgeBaseId}/search", knowledgeBaseId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "query": "stage15 new marker",
                                  "limit": 5
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results.length()").value(1))
                .andExpect(content().string(containsString("stage15 new marker after reprocess")));

        mockMvc.perform(post("/api/documents/{documentId}/reprocess", documentId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + viewerToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/documents/{documentId}/reprocess", documentId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + nonMemberToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void reprocessWithoutRebuildableChunksMarksDocumentFailedWithSafeMessage() throws Exception {
        Long ownerId = createUser("stage15_reprocess_failed_owner");
        String ownerToken = loginAndGetToken("stage15_reprocess_failed_owner");
        Long knowledgeBaseId = createKnowledgeBase(ownerId, "Stage15 Reprocess Failed KB");
        createMembership(knowledgeBaseId, ownerId, "OWNER");
        Long documentId = createDocument(ownerId, knowledgeBaseId, "failed.md", "FAILED");

        mockMvc.perform(post("/api/documents/{documentId}/reprocess", documentId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + ownerToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Document cannot be reprocessed because no indexed text is available"))
                .andExpect(content().string(not(containsString("D:\\"))))
                .andExpect(content().string(not(containsString("stage15-test-secret"))));

        Map<String, Object> row = jdbcTemplate.queryForMap("select status, error_message from documents where id = ?", documentId);
        assertThat(row.get("status")).isEqualTo("FAILED");
        assertThat(row.get("error_message")).isEqualTo("Document cannot be reprocessed because no indexed text is available");
    }

    @Test
    void summaryUsesCurrentUserModelAndIsStoredWithoutCreatingChatSources() throws Exception {
        Long ownerId = createUser("stage15_summary_owner");
        String ownerToken = loginAndGetToken("stage15_summary_owner");
        Long knowledgeBaseId = createKnowledgeBase(ownerId, "Stage15 Summary KB");
        createMembership(knowledgeBaseId, ownerId, "OWNER");
        Long documentId = createDocument(ownerId, knowledgeBaseId, "summary.md", "INDEXED");
        createChunk(documentId, knowledgeBaseId, 0, "stage15 summary source text");
        modelClient.answer = "stage15 generated summary";

        mockMvc.perform(post("/api/documents/{documentId}/summary", documentId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.documentId").value(documentId))
                .andExpect(jsonPath("$.summary").value("stage15 generated summary"))
                .andExpect(jsonPath("$.updatedAt").isNotEmpty());

        assertThat(modelClient.lastUserId).isEqualTo(ownerId);
        assertThat(modelClient.lastPrompt).contains("stage15 summary source text");
        assertThat(jdbcTemplate.queryForObject("select summary from documents where id = ?", String.class, documentId))
                .isEqualTo("stage15 generated summary");
        assertThat(jdbcTemplate.queryForObject("select count(*) from chat_message_sources", Integer.class)).isZero();
    }

    @Test
    void summaryHonorsRequestedMaxLength() throws Exception {
        Long ownerId = createUser("stage15_summary_length_owner");
        String ownerToken = loginAndGetToken("stage15_summary_length_owner");
        Long knowledgeBaseId = createKnowledgeBase(ownerId, "Stage15 Summary Length KB");
        createMembership(knowledgeBaseId, ownerId, "OWNER");
        Long documentId = createDocument(ownerId, knowledgeBaseId, "summary-length.md", "INDEXED");
        createChunk(documentId, knowledgeBaseId, 0, "stage15 summary length source");
        modelClient.answer = "这是一段会被后端按照长度参数截断的摘要内容，用于证明前端传入的长度不是假参数。";

        mockMvc.perform(post("/api/documents/{documentId}/summary", documentId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "maxLength": 12
                                }
                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary").value("这是一段会被后端按照长度"));
    }

    @Test
    void summaryFailureReturnsSanitizedError() throws Exception {
        Long ownerId = createUser("stage15_summary_failure_owner");
        String ownerToken = loginAndGetToken("stage15_summary_failure_owner");
        Long knowledgeBaseId = createKnowledgeBase(ownerId, "Stage15 Summary Failure KB");
        createMembership(knowledgeBaseId, ownerId, "OWNER");
        Long documentId = createDocument(ownerId, knowledgeBaseId, "summary-failure.md", "INDEXED");
        createChunk(documentId, knowledgeBaseId, 0, "stage15 summary failure source");
        modelClient.failure = new RuntimeException("provider leaked Authorization Bearer stage15-test-secret");

        mockMvc.perform(post("/api/documents/{documentId}/summary", documentId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + ownerToken))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value("AI model call failed"))
                .andExpect(content().string(not(containsString("stage15-test-secret"))))
                .andExpect(content().string(not(containsString("Authorization"))));
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

        return objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .get("accessToken")
                .asText();
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
                        values (?, 'stage15 test', 'ACTIVE', false, 'blue', ?)
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

    private Long createChunk(Long documentId, Long knowledgeBaseId, int chunkIndex, String content) {
        return jdbcTemplate.queryForObject("""
                        insert into document_chunks (
                            document_id,
                            knowledge_base_id,
                            chunk_index,
                            content,
                            char_count
                        )
                        values (?, ?, ?, ?, ?)
                        returning id
                        """,
                Long.class,
                documentId,
                knowledgeBaseId,
                chunkIndex,
                content,
                content.length());
    }

    private void cleanStage15Data() {
        jdbcTemplate.update("""
                delete from chat_message_sources
                where message_id in (
                    select m.id
                    from chat_messages m
                    join chat_sessions s on s.id = m.session_id
                    join users u on u.id = s.user_id
                    where u.username like 'stage15_%'
                )
                """);
        jdbcTemplate.update("""
                delete from chat_messages
                where session_id in (
                    select s.id
                    from chat_sessions s
                    join users u on u.id = s.user_id
                    where u.username like 'stage15_%'
                )
                """);
        jdbcTemplate.update("""
                delete from chat_sessions
                where user_id in (select id from users where username like 'stage15_%')
                """);
        jdbcTemplate.update("""
                delete from document_chunks
                where document_id in (
                    select d.id
                    from documents d
                    join users u on u.id = d.created_by
                    where u.username like 'stage15_%'
                )
                """);
        jdbcTemplate.update("""
                delete from documents
                where created_by in (select id from users where username like 'stage15_%')
                """);
        jdbcTemplate.update("""
                delete from knowledge_base_members
                where user_id in (select id from users where username like 'stage15_%')
                   or knowledge_base_id in (
                       select kb.id
                       from knowledge_bases kb
                       join users u on u.id = kb.created_by
                       where u.username like 'stage15_%'
                   )
                """);
        jdbcTemplate.update("""
                delete from knowledge_bases
                where created_by in (select id from users where username like 'stage15_%')
                """);
        jdbcTemplate.update("""
                delete from user_rag_settings
                where user_id in (select id from users where username like 'stage15_%')
                """);
        jdbcTemplate.update("delete from users where username like 'stage15_%'");
    }

    @TestConfiguration
    static class Stage15ModelTestConfig {
        @Bean
        @Primary
        RecordingChatModelClient chatModelClient() {
            return new RecordingChatModelClient();
        }
    }

    static class RecordingChatModelClient implements ChatModelClient {
        private Long lastUserId;
        private String lastPrompt;
        private String answer = "stage15 default summary";
        private RuntimeException failure;

        @Override
        public synchronized String chat(Long userId, String prompt, double temperature) {
            this.lastUserId = userId;
            this.lastPrompt = prompt;
            if (failure != null) {
                throw failure;
            }
            return answer;
        }

        synchronized void reset() {
            lastUserId = null;
            lastPrompt = null;
            answer = "stage15 default summary";
            failure = null;
        }
    }
}
