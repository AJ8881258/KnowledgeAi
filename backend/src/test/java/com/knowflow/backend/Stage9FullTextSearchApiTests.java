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
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(
        classes = {KnowflowBackendApplication.class, Stage9FullTextSearchApiTests.Stage9ModelTestConfig.class},
        properties = {
                "knowflow.ai.base-url=http://127.0.0.1:1/v1",
                "knowflow.ai.api-key=stage9-test-secret",
                "knowflow.ai.model=stage9-test-model"
        }
)
@AutoConfigureMockMvc
class Stage9FullTextSearchApiTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private final String password = "stage9-password";

    @BeforeEach
    void cleanBefore() {
        cleanStage9Data();
    }

    @AfterEach
    void cleanAfter() {
        cleanStage9Data();
    }

    @Test
    void searchScoresUseFullTextRankAndOrderMoreRelevantChunkFirst() throws Exception {
        Long userId = createUser("stage9_search_rank");
        String token = loginAndGetToken("stage9_search_rank");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage9 Rank KB");
        Long documentId = createDocument(userId, knowledgeBaseId, "rank.md", "INDEXED");

        String moreRelevant = "JWT login flow JWT login flow access token bearer header";
        String lessRelevant = "JWT appears in a longer explanation with alpha beta gamma delta epsilon before login and finally flow.";

        Long moreRelevantChunkId = createChunk(documentId, knowledgeBaseId, 0, moreRelevant);
        Long lessRelevantChunkId = createChunk(documentId, knowledgeBaseId, 1, lessRelevant);

        MvcResult result = mockMvc.perform(post("/api/knowledge-bases/{knowledgeBaseId}/search", knowledgeBaseId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "query": "JWT login flow",
                                  "limit": 5
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.query").value("JWT login flow"))
                .andExpect(jsonPath("$.results.length()").value(2))
                .andReturn();

        JsonNode results = objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .get("results");

        assertThat(results.get(0).get("chunkId").asLong()).isEqualTo(moreRelevantChunkId);
        assertThat(results.get(1).get("chunkId").asLong()).isEqualTo(lessRelevantChunkId);

        double firstScore = results.get(0).get("score").asDouble();
        double secondScore = results.get(1).get("score").asDouble();

        assertThat(firstScore).isGreaterThan(secondScore);
        assertThat(Math.abs(firstScore - 1.0d) > 0.000001d || Math.abs(secondScore - 1.0d) > 0.000001d)
                .as("阶段 9 的 score 应来自 ts_rank_cd，不应继续全部固定为 1.0")
                .isTrue();
    }

    @Test
    void searchReturns401WhenMissingToken() throws Exception {
        mockMvc.perform(post("/api/knowledge-bases/{knowledgeBaseId}/search", 1L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "query": "JWT login flow",
                                  "limit": 5
                                }
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    @Test
    void searchOtherUsersKnowledgeBaseReturns404() throws Exception {
        Long ownerId = createUser("stage9_owner");
        Long visitorId = createUser("stage9_visitor");
        String visitorToken = loginAndGetToken("stage9_visitor");

        Long ownerKnowledgeBaseId = createKnowledgeBase(ownerId, "Owner Stage9 KB");
        Long ownerDocumentId = createDocument(ownerId, ownerKnowledgeBaseId, "owner.md", "INDEXED");
        createChunk(ownerDocumentId, ownerKnowledgeBaseId, 0, "JWT login flow owner only");

        createKnowledgeBase(visitorId, "Visitor Stage9 KB");

        mockMvc.perform(post("/api/knowledge-bases/{knowledgeBaseId}/search", ownerKnowledgeBaseId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + visitorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "query": "JWT login flow",
                                  "limit": 5
                                }
                                """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Knowledge base not found"));
    }

    @Test
    void searchOnlyUsesIndexedDocuments() throws Exception {
        Long userId = createUser("stage9_status_filter");
        String token = loginAndGetToken("stage9_status_filter");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage9 Status KB");

        Long indexedDocumentId = createDocument(userId, knowledgeBaseId, "indexed.md", "INDEXED");
        Long failedDocumentId = createDocument(userId, knowledgeBaseId, "failed.md", "FAILED");
        Long processingDocumentId = createDocument(userId, knowledgeBaseId, "processing.md", "PROCESSING");
        Long uploadedDocumentId = createDocument(userId, knowledgeBaseId, "uploaded.md", "UPLOADED");

        Long indexedChunkId = createChunk(indexedDocumentId, knowledgeBaseId, 0, "JWT login flow indexed content");
        createChunk(failedDocumentId, knowledgeBaseId, 0, "JWT login flow failed content");
        createChunk(processingDocumentId, knowledgeBaseId, 0, "JWT login flow processing content");
        createChunk(uploadedDocumentId, knowledgeBaseId, 0, "JWT login flow uploaded content");

        MvcResult result = mockMvc.perform(post("/api/knowledge-bases/{knowledgeBaseId}/search", knowledgeBaseId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "query": "JWT login flow",
                                  "limit": 20
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results.length()").value(1))
                .andReturn();

        JsonNode onlyResult = objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .get("results")
                .get(0);

        assertThat(onlyResult.get("chunkId").asLong()).isEqualTo(indexedChunkId);
        assertThat(onlyResult.get("documentName").asText()).isEqualTo("indexed.md");
    }

    @Test
    void chatUsesFullTextSearchOrderForPromptContext() throws Exception {
        Long userId = createUser("stage9_chat_order");
        String token = loginAndGetToken("stage9_chat_order");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage9 Chat KB");
        Long documentId = createDocument(userId, knowledgeBaseId, "chat-rank.md", "INDEXED");

        String moreRelevant = "JWT login flow JWT login flow access token bearer header";
        String lessRelevant = "JWT appears in a longer explanation with alpha beta gamma delta epsilon before login and finally flow.";

        Long moreRelevantChunkId = createChunk(documentId, knowledgeBaseId, 0, moreRelevant);
        Long lessRelevantChunkId = createChunk(documentId, knowledgeBaseId, 1, lessRelevant);

        Long sessionId = createChatSession(userId, knowledgeBaseId, "Stage9 Chat Session");

        mockMvc.perform(post("/api/chat/sessions/{sessionId}/messages", sessionId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "content": "JWT login flow",
                                  "limit": 5
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.session.status").value("GENERATING"));

        JsonNode message = waitForAssistantMessage(token, sessionId);
        assertThat(message.get("sources").size()).isEqualTo(2);
        assertThat(message.get("sources").get(0).get("chunkId").asLong()).isEqualTo(moreRelevantChunkId);
        assertThat(message.get("sources").get(1).get("chunkId").asLong()).isEqualTo(lessRelevantChunkId);

        String returnedPrompt = message.get("content").asText();
        assertThat(returnedPrompt.indexOf(moreRelevant)).isLessThan(returnedPrompt.indexOf(lessRelevant));

        double firstSourceScore = message.get("sources").get(0).get("score").asDouble();
        double secondSourceScore = message.get("sources").get(1).get("score").asDouble();

        assertThat(firstSourceScore).isGreaterThan(secondSourceScore);
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
                        values (?, 'stage9 test', 'ACTIVE', false, 'blue', ?)
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

    private void cleanStage9Data() {
        jdbcTemplate.update("""
                delete from chat_message_sources
                where message_id in (
                    select m.id
                    from chat_messages m
                    join chat_sessions s on s.id = m.session_id
                    join users u on u.id = s.user_id
                    where u.username like 'stage9_%'
                )
                """);

        jdbcTemplate.update("""
                delete from chat_messages
                where session_id in (
                    select s.id
                    from chat_sessions s
                    join users u on u.id = s.user_id
                    where u.username like 'stage9_%'
                )
                """);

        jdbcTemplate.update("""
                delete from chat_sessions
                where user_id in (
                    select id from users where username like 'stage9_%'
                )
                """);

        jdbcTemplate.update("""
                delete from document_chunks
                where document_id in (
                    select d.id
                    from documents d
                    join users u on u.id = d.created_by
                    where u.username like 'stage9_%'
                )
                """);

        jdbcTemplate.update("""
                delete from documents
                where created_by in (
                    select id from users where username like 'stage9_%'
                )
                """);

        jdbcTemplate.update("""
                delete from knowledge_bases
                where created_by in (
                    select id from users where username like 'stage9_%'
                )
                """);

        jdbcTemplate.update("""
                delete from user_rag_settings
                where user_id in (
                    select id from users where username like 'stage9_%'
                )
                """);

        jdbcTemplate.update("delete from users where username like 'stage9_%'");
    }

    @TestConfiguration
    static class Stage9ModelTestConfig {

        @Bean
        @Primary
        ChatModelClient chatModelClient() {
            return (userId, prompt, temperature) -> prompt;
        }
    }

    private JsonNode waitForAssistantMessage(String token, Long sessionId) throws Exception {
        final JsonNode[] found = new JsonNode[1];
        waitUntil(() -> {
            for (JsonNode message : readMessages(token, sessionId)) {
                if ("ASSISTANT".equals(message.get("role").asText())) {
                    found[0] = message;
                    return true;
                }
            }
            return false;
        });
        return found[0];
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
}
