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

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.assertj.core.api.AssertionsForClassTypes.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "knowflow.ai.base-url=http://127.0.0.1:1",
        "knowflow.ai.api-key=stage7-test-secret",
        "knowflow.ai.model=stage7-test-model"
})
@AutoConfigureMockMvc
class Stage7ApiStabilityTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private final String password = "stage7-password";

    @BeforeEach
    void cleanBefore() {
        cleanStage7Data();
    }

    @AfterEach
    void cleanAfter() {
        cleanStage7Data();
    }

    @Test
    void protectedApiReturns401WhenMissingToken() throws Exception {
        mockMvc.perform(get("/api/knowledge-bases"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    @Test
    void healthIsPublic() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void authMeReturnsCurrentTokenUser() throws Exception {
        String username = "stage7_me";
        createUser(username);

        String token = loginAndGetToken(username);

        mockMvc.perform(get("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(username))
                .andExpect(jsonPath("$.role").value("USER"));
    }

    @Test
    void emptyKnowledgeBaseNameReturns400() throws Exception {
        String token = loginAndGetToken("stage7_empty_kb");

        mockMvc.perform(post("/api/knowledge-bases")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "   ",
                                  "description": "bad",
                                  "featured": false,
                                  "themeId": "blue"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Knowledge base name is required"));
    }

    @Test
    void otherUsersKnowledgeBaseReturns404() throws Exception {
        Long ownerId = createUser("stage7_owner");
        String visitorToken = loginAndGetToken("stage7_visitor");
        Long knowledgeBaseId = createKnowledgeBase(ownerId, "Owner KB");

        mockMvc.perform(get("/api/knowledge-bases/{id}", knowledgeBaseId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + visitorToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Knowledge base not found"));
    }

    @Test
    void searchRejectsEmptyQueryBeforeDatabaseSearch() throws Exception {
        Long userId = createUser("stage7_search_empty");
        String token = loginAndGetToken("stage7_search_empty");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Search KB");

        mockMvc.perform(post("/api/knowledge-bases/{knowledgeBaseId}/search", knowledgeBaseId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "query": "   ",
                                  "limit": 5
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("query is empty"));
    }

    @Test
    void missingUploadFileReturns400() throws Exception {
        Long userId = createUser("stage7_missing_file");
        String token = loginAndGetToken("stage7_missing_file");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Upload KB");

        mockMvc.perform(multipart("/api/knowledge-bases/{knowledgeBaseId}/documents", knowledgeBaseId)
                        .file(new MockMultipartFile("wrongField", "note.txt", "text/plain", "hello".getBytes(StandardCharsets.UTF_8)))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Bad request"));
    }

    @Test
    void deleteDocumentCascadesChunks() throws Exception {
        Long userId = createUser("stage7_delete_document");
        String token = loginAndGetToken("stage7_delete_document");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Document Cascade KB");
        Long documentId = createDocument(userId, knowledgeBaseId, "cascade.md", "INDEXED");
        Long chunkId = createChunk(documentId, knowledgeBaseId, 0, "cascade content");

        mockMvc.perform(delete("/api/documents/{documentId}", documentId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNoContent());

        Integer documentCount = jdbcTemplate.queryForObject(
                "select count(*) from documents where id = ?",
                Integer.class,
                documentId);

        Integer chunkCount = jdbcTemplate.queryForObject(
                "select count(*) from document_chunks where id = ?",
                Integer.class,
                chunkId);

        assertThat(documentCount).isZero();
        assertThat(chunkCount).isZero();
    }

    @Test
    void deleteChatSessionCascadesMessagesAndSources() throws Exception {
        Long userId = createUser("stage7_delete_session");
        String token = loginAndGetToken("stage7_delete_session");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Chat Cascade KB");
        Long documentId = createDocument(userId, knowledgeBaseId, "source.md", "INDEXED");
        Long chunkId = createChunk(documentId, knowledgeBaseId, 0, "source content");
        Long sessionId = createChatSession(userId, knowledgeBaseId, "Cascade Session");
        Long messageId = createChatMessage(sessionId, "ASSISTANT", "answer");
        Long sourceId = createChatSource(messageId, documentId, chunkId);

        mockMvc.perform(delete("/api/chat/sessions/{sessionId}", sessionId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNoContent());

        Integer sessionCount = jdbcTemplate.queryForObject(
                "select count(*) from chat_sessions where id = ?",
                Integer.class,
                sessionId);

        Integer messageCount = jdbcTemplate.queryForObject(
                "select count(*) from chat_messages where id = ?",
                Integer.class,
                messageId);

        Integer sourceCount = jdbcTemplate.queryForObject(
                "select count(*) from chat_message_sources where id = ?",
                Integer.class,
                sourceId);

        assertThat(sessionCount).isZero();
        assertThat(messageCount).isZero();
        assertThat(sourceCount).isZero();
    }

    @Test
    void modelFailureReturnsSanitized500() throws Exception {
        Long userId = createUser("stage7_model_failure");
        String token = loginAndGetToken("stage7_model_failure");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Model Failure KB");
        Long documentId = createDocument(userId, knowledgeBaseId, "model.md", "INDEXED");
        createChunk(documentId, knowledgeBaseId, 0, "模型失败测试内容");
        Long sessionId = createChatSession(userId, knowledgeBaseId, "Model Failure Session");

        mockMvc.perform(post("/api/chat/sessions/{sessionId}/messages", sessionId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "content": "模型失败",
                                  "limit": 5
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.session.status").value("GENERATING"))
                .andExpect(content().string(not(containsString("stage7-test-secret"))))
                .andExpect(content().string(not(containsString("127.0.0.1"))))
                .andExpect(content().string(not(containsString("stage7-test-model"))));

        waitUntil(() -> {
            String status = jdbcTemplate.queryForObject(
                    "select status from chat_sessions where id = ? and user_id = ?",
                    String.class,
                    sessionId,
                    userId);
            return "FAILED".equals(status);
        });
    }

    private String loginAndGetToken(String username) throws Exception {
        createUser(username);

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
                        values (?, 'stage7 test', 'ACTIVE', false, 'blue', ?)
                        returning id
                        """,
                Long.class,
                name,
                userId);
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

    private Long createChatSession(Long userId, Long knowledgeBaseId, String title) {
        return jdbcTemplate.queryForObject("""
                        insert into chat_sessions (title, knowledge_base_id, user_id)
                        values (?, ?, ?)
                        returning id
                        """,
                Long.class,
                title,
                knowledgeBaseId,
                userId);
    }

    private Long createChatMessage(Long sessionId, String role, String content) {
        return jdbcTemplate.queryForObject("""
                        insert into chat_messages (session_id, role, content)
                        values (?, ?, ?)
                        returning id
                        """,
                Long.class,
                sessionId,
                role,
                content);
    }

    private Long createChatSource(Long messageId, Long documentId, Long chunkId) {
        return jdbcTemplate.queryForObject("""
                        insert into chat_message_sources (
                            message_id,
                            document_id,
                            document_name,
                            chunk_id,
                            chunk_index,
                            content,
                            score
                        )
                        values (?, ?, 'source.md', ?, 0, 'source content', 1.0)
                        returning id
                        """,
                Long.class,
                messageId,
                documentId,
                chunkId);
    }

    private void cleanStage7Data() {
        jdbcTemplate.update("""
                delete from chat_message_sources
                where message_id in (
                    select m.id
                    from chat_messages m
                    join chat_sessions s on s.id = m.session_id
                    join users u on u.id = s.user_id
                    where u.username like 'stage7_%'
                )
                """);

        jdbcTemplate.update("""
                delete from chat_messages
                where session_id in (
                    select s.id
                    from chat_sessions s
                    join users u on u.id = s.user_id
                    where u.username like 'stage7_%'
                )
                """);

        jdbcTemplate.update("""
                delete from chat_sessions
                where user_id in (
                    select id from users where username like 'stage7_%'
                )
                """);

        jdbcTemplate.update("""
                delete from document_chunks
                where document_id in (
                    select d.id
                    from documents d
                    join users u on u.id = d.created_by
                    where u.username like 'stage7_%'
                )
                """);

        jdbcTemplate.update("""
                delete from documents
                where created_by in (
                    select id from users where username like 'stage7_%'
                )
                """);

        jdbcTemplate.update("""
                delete from knowledge_bases
                where created_by in (
                    select id from users where username like 'stage7_%'
                )
                """);

        jdbcTemplate.update("delete from users where username like 'stage7_%'");
    }

    private void waitUntil(CheckedBooleanSupplier condition) throws Exception {
        long deadline = System.nanoTime() + 5_000_000_000L;
        while (System.nanoTime() < deadline) {
            if (condition.getAsBoolean()) {
                return;
            }
            Thread.sleep(100);
        }
        throw new AssertionError("Condition was not met before timeout");
    }

    @FunctionalInterface
    private interface CheckedBooleanSupplier {
        boolean getAsBoolean() throws Exception;
    }
}
