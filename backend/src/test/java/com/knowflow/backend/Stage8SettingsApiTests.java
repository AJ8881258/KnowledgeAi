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

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = {KnowflowBackendApplication.class, Stage8SettingsApiTests.Stage8ModelTestConfig.class}, properties = {"knowflow.ai.base-url=http://127.0.0.1:1/v1", "knowflow.ai.api-key=stage8-test-secret", "knowflow.ai.model=stage8-test-model"})
@AutoConfigureMockMvc
class Stage8SettingsApiTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private final String password = "stage8-password";

    @BeforeEach
    void cleanBefore() {
        cleanStage8Data();
    }

    @AfterEach
    void cleanAfter() {
        cleanStage8Data();
    }

    @Test
    void settingsApisReturn401WhenMissingToken() throws Exception {
        mockMvc.perform(get("/api/settings/model")).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("Unauthorized"));

        mockMvc.perform(get("/api/settings/rag")).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("Unauthorized"));

        mockMvc.perform(patch("/api/settings/rag").contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    @Test
    void patchAuthMeUpdatesOnlyCurrentUser() throws Exception {
        Long currentUserId = createUser("stage8_profile_current", null);
        Long otherUserId = createUser("stage8_profile_other", "other@example.com");
        String token = loginAndGetToken("stage8_profile_current");

        mockMvc.perform(patch("/api/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content("""
                {
                  "email": "Current@Example.com"
                }
                """)).andExpect(status().isOk()).andExpect(jsonPath("$.username").value("stage8_profile_current")).andExpect(jsonPath("$.email").value("current@example.com"));

        assertThat(readUserEmail(currentUserId)).isEqualTo("current@example.com");
        assertThat(readUserEmail(otherUserId)).isEqualTo("other@example.com");
    }

    @Test
    void modelSettingsDoNotLeakApiKeyOrBaseUrl() throws Exception {
        createUser("stage8_model_status", null);
        String token = loginAndGetToken("stage8_model_status");

        mockMvc.perform(get("/api/settings/model").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)).andExpect(status().isOk()).andExpect(jsonPath("$.configured").value(true)).andExpect(jsonPath("$.mode").value("ENVIRONMENT")).andExpect(jsonPath("$.model").value("stage8-test-model")).andExpect(jsonPath("$.baseUrlConfigured").value(true)).andExpect(jsonPath("$.apiKeyConfigured").value(true)).andExpect(jsonPath("$.editable").value(false)).andExpect(content().string(not(containsString("stage8-test-secret")))).andExpect(content().string(not(containsString("127.0.0.1"))));
    }

    @Test
    void ragSettingsCanBeSavedAndReadPerCurrentUser() throws Exception {
        createUser("stage8_rag_owner", null);
        createUser("stage8_rag_other", null);

        String ownerToken = loginAndGetToken("stage8_rag_owner");
        String otherToken = loginAndGetToken("stage8_rag_other");

        mockMvc.perform(get("/api/settings/rag").header(HttpHeaders.AUTHORIZATION, "Bearer " + ownerToken)).andExpect(status().isOk()).andExpect(jsonPath("$.topK").value(5)).andExpect(jsonPath("$.maxContextChunks").value(5)).andExpect(jsonPath("$.temperature").value(0.2));

        mockMvc.perform(patch("/api/settings/rag").header(HttpHeaders.AUTHORIZATION, "Bearer " + ownerToken).contentType(MediaType.APPLICATION_JSON).content("""
                {
                  "topK": 7,
                  "maxContextChunks": 3,
                  "temperature": 0.6
                }
                """)).andExpect(status().isOk()).andExpect(jsonPath("$.topK").value(7)).andExpect(jsonPath("$.maxContextChunks").value(3)).andExpect(jsonPath("$.temperature").value(0.6));

        mockMvc.perform(get("/api/settings/rag").header(HttpHeaders.AUTHORIZATION, "Bearer " + ownerToken)).andExpect(status().isOk()).andExpect(jsonPath("$.topK").value(7)).andExpect(jsonPath("$.maxContextChunks").value(3)).andExpect(jsonPath("$.temperature").value(0.6));

        mockMvc.perform(get("/api/settings/rag").header(HttpHeaders.AUTHORIZATION, "Bearer " + otherToken)).andExpect(status().isOk()).andExpect(jsonPath("$.topK").value(5)).andExpect(jsonPath("$.maxContextChunks").value(5)).andExpect(jsonPath("$.temperature").value(0.2));
    }

    @Test
    void chatUsesSavedRagSettingsForContextAndTemperature() throws Exception {
        Long userId = createUser("stage8_chat_rag", null);
        String token = loginAndGetToken("stage8_chat_rag");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage8 RAG KB");
        Long documentId = createDocument(userId, knowledgeBaseId, "rag.md", "INDEXED");

        createChunk(documentId, knowledgeBaseId, 0, "stage8-rag content 1");
        createChunk(documentId, knowledgeBaseId, 1, "stage8-rag content 2");
        createChunk(documentId, knowledgeBaseId, 2, "stage8-rag content 3");

        Long sessionId = createChatSession(userId, knowledgeBaseId, "RAG settings session");

        mockMvc.perform(patch("/api/settings/rag").header(HttpHeaders.AUTHORIZATION, "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content("""
                {
                  "topK": 3,
                  "maxContextChunks": 2,
                  "temperature": 0.7
                }
                """)).andExpect(status().isOk());

        mockMvc.perform(post("/api/chat/sessions/{sessionId}/messages", sessionId).header(HttpHeaders.AUTHORIZATION, "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content("""
                {
                  "content": "stage8-rag",
                  "limit": 20
                }
                """)).andExpect(status().isOk()).andExpect(jsonPath("$.message.sources.length()").value(2)).andExpect(jsonPath("$.message.content", containsString("temperature=0.7"))).andExpect(jsonPath("$.message.content", containsString("stage8-rag content 1"))).andExpect(jsonPath("$.message.content", containsString("stage8-rag content 2"))).andExpect(jsonPath("$.message.content", not(containsString("stage8-rag content 3"))));
    }

    @Test
    void deleteCurrentAccountDeletesOwnDataWithoutAffectingOtherUsers() throws Exception {
        Long currentUserId = createUser("stage8_delete_current", null);
        Long otherUserId = createUser("stage8_delete_other", null);
        String currentToken = loginAndGetToken("stage8_delete_current");

        OwnedData currentData = createOwnedData(currentUserId, "current");
        OwnedData otherData = createOwnedData(otherUserId, "other");

        mockMvc.perform(delete("/api/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + currentToken)).andExpect(status().isNoContent());

        assertRowCount("users", currentUserId, 0);
        assertRowCount("knowledge_bases", currentData.knowledgeBaseId(), 0);
        assertRowCount("documents", currentData.documentId(), 0);
        assertRowCount("document_chunks", currentData.chunkId(), 0);
        assertRowCount("chat_sessions", currentData.sessionId(), 0);
        assertRowCount("chat_messages", currentData.messageId(), 0);
        assertRowCount("chat_message_sources", currentData.sourceId(), 0);

        assertRowCount("users", otherUserId, 1);
        assertRowCount("knowledge_bases", otherData.knowledgeBaseId(), 1);
        assertRowCount("documents", otherData.documentId(), 1);
        assertRowCount("document_chunks", otherData.chunkId(), 1);
        assertRowCount("chat_sessions", otherData.sessionId(), 1);
        assertRowCount("chat_messages", otherData.messageId(), 1);
        assertRowCount("chat_message_sources", otherData.sourceId(), 1);
    }

    private String loginAndGetToken(String username) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(Map.of("username", username, "password", password)))).andExpect(status().isOk()).andExpect(jsonPath("$.tokenType").value("Bearer")).andExpect(jsonPath("$.accessToken").isNotEmpty()).andReturn();

        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
        return root.get("accessToken").asText();
    }

    private Long createUser(String username, String email) {
        return jdbcTemplate.queryForObject("""
                insert into users (username, password_hash, role, email)
                values (?, ?, 'USER', ?)
                on conflict (username)
                do update set password_hash = excluded.password_hash,
                              role = excluded.role,
                              email = excluded.email,
                              updated_at = now()
                returning id
                """, Long.class, username, passwordEncoder.encode(password), email);
    }

    private String readUserEmail(Long userId) {
        return jdbcTemplate.queryForObject("select email from users where id = ?", String.class, userId);
    }

    private Long createKnowledgeBase(Long userId, String name) {
        return jdbcTemplate.queryForObject("""
                insert into knowledge_bases (name, description, status, featured, theme_id, created_by)
                values (?, 'stage8 test', 'ACTIVE', false, 'blue', ?)
                returning id
                """, Long.class, name, userId);
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
                """, Long.class, knowledgeBaseId, filename, status, userId);
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
                """, Long.class, documentId, knowledgeBaseId, chunkIndex, content, content.length());
    }

    private Long createChatSession(Long userId, Long knowledgeBaseId, String title) {
        return jdbcTemplate.queryForObject("""
                insert into chat_sessions (title, knowledge_base_id, user_id)
                values (?, ?, ?)
                returning id
                """, Long.class, title, knowledgeBaseId, userId);
    }

    private Long createChatMessage(Long sessionId, String role, String content) {
        return jdbcTemplate.queryForObject("""
                insert into chat_messages (session_id, role, content)
                values (?, ?, ?)
                returning id
                """, Long.class, sessionId, role, content);
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
                """, Long.class, messageId, documentId, chunkId);
    }

    private OwnedData createOwnedData(Long userId, String label) {
        Long knowledgeBaseId = createKnowledgeBase(userId, "stage8 " + label + " kb");
        Long documentId = createDocument(userId, knowledgeBaseId, label + ".md", "INDEXED");
        Long chunkId = createChunk(documentId, knowledgeBaseId, 0, label + " content");
        Long sessionId = createChatSession(userId, knowledgeBaseId, label + " session");
        Long messageId = createChatMessage(sessionId, "ASSISTANT", label + " answer");
        Long sourceId = createChatSource(messageId, documentId, chunkId);

        return new OwnedData(knowledgeBaseId, documentId, chunkId, sessionId, messageId, sourceId);
    }

    private void assertRowCount(String tableName, Long id, int expectedCount) {
        Integer actualCount = jdbcTemplate.queryForObject("select count(*) from " + tableName + " where id = ?", Integer.class, id);

        assertThat(actualCount).isEqualTo(expectedCount);
    }

    private void cleanStage8Data() {
        jdbcTemplate.update("""
                delete from chat_message_sources
                where message_id in (
                    select m.id
                    from chat_messages m
                    join chat_sessions s on s.id = m.session_id
                    join users u on u.id = s.user_id
                    where u.username like 'stage8_%'
                )
                """);

        jdbcTemplate.update("""
                delete from chat_messages
                where session_id in (
                    select s.id
                    from chat_sessions s
                    join users u on u.id = s.user_id
                    where u.username like 'stage8_%'
                )
                """);

        jdbcTemplate.update("""
                delete from chat_sessions
                where user_id in (
                    select id from users where username like 'stage8_%'
                )
                """);

        jdbcTemplate.update("""
                delete from document_chunks
                where document_id in (
                    select d.id
                    from documents d
                    join users u on u.id = d.created_by
                    where u.username like 'stage8_%'
                )
                """);

        jdbcTemplate.update("""
                delete from documents
                where created_by in (
                    select id from users where username like 'stage8_%'
                )
                """);

        jdbcTemplate.update("""
                delete from knowledge_bases
                where created_by in (
                    select id from users where username like 'stage8_%'
                )
                """);

        jdbcTemplate.update("""
                delete from user_rag_settings
                where user_id in (
                    select id from users where username like 'stage8_%'
                )
                """);

        jdbcTemplate.update("delete from users where username like 'stage8_%'");
    }

    private record OwnedData(Long knowledgeBaseId, Long documentId, Long chunkId, Long sessionId, Long messageId,
                             Long sourceId) {
    }

    @TestConfiguration
    static class Stage8ModelTestConfig {

        @Bean
        @Primary
        ChatModelClient chatModelClient() {
            return (prompt, temperature) -> "temperature=" + temperature + "\n" + prompt;
        }
    }
}
