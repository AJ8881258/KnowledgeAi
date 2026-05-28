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
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(
        classes = {KnowflowBackendApplication.class, Stage10RagExperienceTests.Stage10ModelTestConfig.class},
        properties = {
                "knowflow.ai.base-url=http://127.0.0.1:9999/v1",
                "knowflow.ai.api-key=stage10-test-secret",
                "knowflow.ai.model=stage10-test-model"
        }
)
@AutoConfigureMockMvc
class Stage10RagExperienceTests {

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

    private final String password = "stage10-password";

    @BeforeEach
    void cleanBefore() {
        modelClient.reset();
        cleanStage10Data();
    }

    @AfterEach
    void cleanAfter() {
        modelClient.reset();
        cleanStage10Data();
    }

    @Test
    void chatPromptUsesOnlyCurrentSessionRecentSixMessagesInChronologicalOrder() throws Exception {
        Long userId = createUser("stage10_history_owner");
        String token = loginAndGetToken("stage10_history_owner");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage10 History KB");
        Long documentId = createDocument(userId, knowledgeBaseId, "history.md", "INDEXED");
        createChunk(documentId, knowledgeBaseId, 0, "stage10 history retrieval source");
        Long sessionId = createChatSession(userId, knowledgeBaseId, "Stage10 History Session");

        for (int i = 1; i <= 8; i++) {
            createChatMessage(sessionId, i % 2 == 0 ? "ASSISTANT" : "USER", "stage10-current-history-0" + i);
        }

        mockMvc.perform(post("/api/chat/sessions/{sessionId}/messages", sessionId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "content": "stage10 history retrieval",
                                  "limit": 5
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.session.status").value("GENERATING"));

        String prompt = waitForAssistantContent(token, sessionId);

        assertThat(prompt)
                .contains("stage10-current-history-03")
                .contains("stage10-current-history-04")
                .contains("stage10-current-history-05")
                .contains("stage10-current-history-06")
                .contains("stage10-current-history-07")
                .contains("stage10-current-history-08")
                .doesNotContain("stage10-current-history-01", "stage10-current-history-02");

        assertThat(prompt.indexOf("stage10-current-history-03"))
                .isLessThan(prompt.indexOf("stage10-current-history-04"));
        assertThat(prompt.indexOf("stage10-current-history-04"))
                .isLessThan(prompt.indexOf("stage10-current-history-05"));
        assertThat(prompt.indexOf("stage10-current-history-05"))
                .isLessThan(prompt.indexOf("stage10-current-history-06"));
        assertThat(prompt.indexOf("stage10-current-history-06"))
                .isLessThan(prompt.indexOf("stage10-current-history-07"));
        assertThat(prompt.indexOf("stage10-current-history-07"))
                .isLessThan(prompt.indexOf("stage10-current-history-08"));
    }

    @Test
    void chatPromptDoesNotReadOtherUsersOtherSessionsOrOtherKnowledgeBasesHistory() throws Exception {
        Long userId = createUser("stage10_isolation_owner");
        Long otherUserId = createUser("stage10_isolation_other");
        String token = loginAndGetToken("stage10_isolation_owner");

        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage10 Isolation KB");
        Long documentId = createDocument(userId, knowledgeBaseId, "isolation.md", "INDEXED");
        createChunk(documentId, knowledgeBaseId, 0, "stage10 isolation retrieval source");
        Long sessionId = createChatSession(userId, knowledgeBaseId, "Current Session");
        Long sameUserOtherSessionId = createChatSession(userId, knowledgeBaseId, "Same User Other Session");

        Long otherKnowledgeBaseId = createKnowledgeBase(userId, "Stage10 Other KB");
        Long sameUserOtherKbSessionId = createChatSession(userId, otherKnowledgeBaseId, "Same User Other KB Session");

        Long otherUserKnowledgeBaseId = createKnowledgeBase(otherUserId, "Other User KB");
        Long otherUserSessionId = createChatSession(otherUserId, otherUserKnowledgeBaseId, "Other User Session");

        createChatMessage(sessionId, "USER", "stage10-safe-current-session-history");
        createChatMessage(sameUserOtherSessionId, "USER", "stage10-leak-same-user-other-session");
        createChatMessage(sameUserOtherKbSessionId, "USER", "stage10-leak-same-user-other-kb");
        createChatMessage(otherUserSessionId, "USER", "stage10-leak-other-user-session");

        mockMvc.perform(post("/api/chat/sessions/{sessionId}/messages", sessionId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "content": "stage10 isolation retrieval",
                                  "limit": 5
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.session.status").value("GENERATING"));

        String prompt = waitForAssistantContent(token, sessionId);

        assertThat(prompt)
                .contains("stage10-safe-current-session-history")
                .doesNotContain(
                        "stage10-leak-same-user-other-session",
                        "stage10-leak-same-user-other-kb",
                        "stage10-leak-other-user-session"
                );
    }

    @Test
    void emptyRetrievalCallsModelAndSavesAssistantMessageWithNoSources() throws Exception {
        Long userId = createUser("stage10_empty_retrieval");
        String token = loginAndGetToken("stage10_empty_retrieval");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage10 Empty KB");
        Long sessionId = createChatSession(userId, knowledgeBaseId, "Empty Retrieval Session");

        mockMvc.perform(post("/api/chat/sessions/{sessionId}/messages", sessionId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "content": "stage10 no matching chunks",
                                  "limit": 5
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.session.status").value("GENERATING"));

        JsonNode message = waitForAssistantMessage(token, sessionId);

        assertThat(message.get("content").asText())
                .contains("当前没有可引用的知识库片段")
                .contains("stage10 no matching chunks");
        assertThat(modelClient.callCount()).isEqualTo(1);
        assertThat(countMessages(sessionId)).isEqualTo(2);
        assertThat(countAssistantSources(sessionId)).isZero();
    }

    @Test
    void sourcesMatchChunksActuallyIncludedInPromptAfterContextLimit() throws Exception {
        Long userId = createUser("stage10_source_consistency");
        String token = loginAndGetToken("stage10_source_consistency");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage10 Source KB");
        Long documentId = createDocument(userId, knowledgeBaseId, "sources.md", "INDEXED");

        Long firstChunkId = createChunk(documentId, knowledgeBaseId, 0, "stage10-source alpha alpha alpha first-included-marker");
        Long secondChunkId = createChunk(documentId, knowledgeBaseId, 1, "stage10-source alpha alpha second-included-marker");
        createChunk(documentId, knowledgeBaseId, 2, "stage10-source alpha third-excluded-marker");
        Long sessionId = createChatSession(userId, knowledgeBaseId, "Source Consistency Session");

        mockMvc.perform(patch("/api/settings/rag")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "topK": 3,
                                  "maxContextChunks": 2,
                                  "temperature": 0.4
                                }
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/chat/sessions/{sessionId}/messages", sessionId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "content": "stage10-source alpha",
                                  "limit": 20
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.session.status").value("GENERATING"));

        JsonNode message = waitForAssistantMessage(token, sessionId);
        assertThat(message.get("sources").size()).isEqualTo(2);
        assertThat(message.get("sources").get(0).get("chunkId").asLong()).isEqualTo(firstChunkId);
        assertThat(message.get("sources").get(1).get("chunkId").asLong()).isEqualTo(secondChunkId);
        String prompt = message.get("content").asText();

        assertThat(prompt)
                .contains("first-included-marker")
                .contains("second-included-marker")
                .doesNotContain("third-excluded-marker");
    }

    @Test
    void modelFailureReturnsSanitizedErrorAndDoesNotPersistPartialTurn() throws Exception {
        Long userId = createUser("stage10_model_failure");
        String token = loginAndGetToken("stage10_model_failure");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage10 Model Failure KB");
        Long documentId = createDocument(userId, knowledgeBaseId, "failure.md", "INDEXED");
        createChunk(documentId, knowledgeBaseId, 0, "stage10 model failure retrieval source");
        Long sessionId = createChatSession(userId, knowledgeBaseId, "Model Failure Session");

        modelClient.fail();

        mockMvc.perform(post("/api/chat/sessions/{sessionId}/messages", sessionId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "content": "stage10 model failure retrieval",
                                  "limit": 5
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.session.status").value("GENERATING"))
                .andExpect(content().string(not(containsString("stage10-test-secret"))))
                .andExpect(content().string(not(containsString("127.0.0.1"))))
                .andExpect(content().string(not(containsString("stage10-test-model"))));

        waitForSessionStatus(token, userId, knowledgeBaseId, sessionId, "FAILED");
        assertThat(modelClient.callCount()).isEqualTo(1);
        assertThat(countMessages(sessionId)).isEqualTo(1);
        assertThat(countAssistantSources(sessionId)).isZero();
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
                        values (?, 'stage10 test', 'ACTIVE', false, 'blue', ?)
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

    private String waitForAssistantContent(String token, Long sessionId) throws Exception {
        return waitForAssistantMessage(token, sessionId).get("content").asText();
    }

    private JsonNode waitForAssistantMessage(String token, Long sessionId) throws Exception {
        final JsonNode[] found = new JsonNode[1];
        waitUntil(() -> {
            List<JsonNode> messages = readMessages(token, sessionId);
            for (int index = messages.size() - 1; index >= 0; index--) {
                JsonNode message = messages.get(index);
                if ("ASSISTANT".equals(message.get("role").asText())) {
                    found[0] = message;
                    return true;
                }
            }
            return false;
        });
        return found[0];
    }

    private void waitForSessionStatus(String token, Long userId, Long knowledgeBaseId, Long sessionId, String status) throws Exception {
        waitUntil(() -> {
            MvcResult result = mockMvc.perform(post("/api/knowledge-bases/{knowledgeBaseId}/search", knowledgeBaseId)
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "query": "status probe",
                                      "limit": 1
                                    }
                                    """))
                    .andExpect(status().isOk())
                    .andReturn();
            String currentStatus = jdbcTemplate.queryForObject(
                    "select status from chat_sessions where id = ? and user_id = ?",
                    String.class,
                    sessionId,
                    userId);
            return status.equals(currentStatus);
        });
    }

    private List<JsonNode> readMessages(String token, Long sessionId) throws Exception {
        MvcResult result = mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/chat/sessions/{sessionId}/messages", sessionId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        List<JsonNode> messages = new ArrayList<>();
        for (JsonNode message : objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8))) {
            messages.add(message);
        }
        return messages;
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

    private int countMessages(Long sessionId) {
        Integer count = jdbcTemplate.queryForObject(
                "select count(*) from chat_messages where session_id = ?",
                Integer.class,
                sessionId);
        return count == null ? 0 : count;
    }

    private int countAssistantSources(Long sessionId) {
        Integer count = jdbcTemplate.queryForObject("""
                        select count(*)
                        from chat_message_sources src
                        join chat_messages m on m.id = src.message_id
                        where m.session_id = ?
                        """,
                Integer.class,
                sessionId);
        return count == null ? 0 : count;
    }

    private void cleanStage10Data() {
        jdbcTemplate.update("""
                delete from chat_message_sources
                where message_id in (
                    select m.id
                    from chat_messages m
                    join chat_sessions s on s.id = m.session_id
                    join users u on u.id = s.user_id
                    where u.username like 'stage10_%'
                )
                """);

        jdbcTemplate.update("""
                delete from chat_messages
                where session_id in (
                    select s.id
                    from chat_sessions s
                    join users u on u.id = s.user_id
                    where u.username like 'stage10_%'
                )
                """);

        jdbcTemplate.update("""
                delete from chat_sessions
                where user_id in (
                    select id from users where username like 'stage10_%'
                )
                """);

        jdbcTemplate.update("""
                delete from document_chunks
                where document_id in (
                    select d.id
                    from documents d
                    join users u on u.id = d.created_by
                    where u.username like 'stage10_%'
                )
                """);

        jdbcTemplate.update("""
                delete from documents
                where created_by in (
                    select id from users where username like 'stage10_%'
                )
                """);

        jdbcTemplate.update("""
                delete from knowledge_bases
                where created_by in (
                    select id from users where username like 'stage10_%'
                )
                """);

        jdbcTemplate.update("""
                delete from user_rag_settings
                where user_id in (
                    select id from users where username like 'stage10_%'
                )
                """);

        jdbcTemplate.update("delete from users where username like 'stage10_%'");
    }

    @TestConfiguration
    static class Stage10ModelTestConfig {

        @Bean
        @Primary
        RecordingChatModelClient chatModelClient() {
            return new RecordingChatModelClient();
        }
    }

    static class RecordingChatModelClient implements ChatModelClient {
        private int callCount;
        private boolean fail;

        @Override
        public synchronized String chat(Long userId, String prompt, double temperature) {
            callCount++;
            if (fail) {
                throw new IllegalStateException("provider leaked apiKey=stage10-test-secret baseUrl=http://127.0.0.1:9999/v1 model=stage10-test-model");
            }
            return "temperature=" + temperature + "\n" + prompt;
        }

        synchronized void fail() {
            fail = true;
        }

        synchronized int callCount() {
            return callCount;
        }

        synchronized void reset() {
            callCount = 0;
            fail = false;
        }
    }
}
