package com.knowflow.backend;

import com.knowflow.backend.chat.model.ChatModelClient;
import com.knowflow.backend.document.rag.EmbeddingModelClient;
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
import org.springframework.mock.web.MockMultipartFile;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(
        classes = {KnowflowBackendApplication.class, Stage18HybridRetrievalTests.Stage18ModelTestConfig.class},
        properties = {
                "knowflow.ai.base-url=http://127.0.0.1:1/v1",
                "knowflow.ai.api-key=stage18-test-secret",
                "knowflow.ai.model=stage18-chat-model",
                "knowflow.ai.embedding-model=stage18-embedding-model",
                "knowflow.documents.processing.async-enabled=false"
        }
)
@AutoConfigureMockMvc
class Stage18HybridRetrievalTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private RecordingEmbeddingModelClient embeddingClient;

    @Autowired
    private RecordingChatModelClient chatModelClient;

    private final String password = "stage18-password";

    @BeforeEach
    void cleanBefore() {
        embeddingClient.reset();
        chatModelClient.reset();
        cleanStage18Data();
    }

    @AfterEach
    void cleanAfter() {
        embeddingClient.reset();
        chatModelClient.reset();
        cleanStage18Data();
    }

    @Test
    void uploadCreatesEmbeddingsAndExposesDocumentEmbeddingStatus() throws Exception {
        Long userId = createUser("stage18_upload_owner");
        String token = loginAndGetToken("stage18_upload_owner");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage18 Upload KB");
        createMembership(knowledgeBaseId, userId, "OWNER");

        mockMvc.perform(multipart("/api/knowledge-bases/{knowledgeBaseId}/documents", knowledgeBaseId)
                        .file(new MockMultipartFile(
                                "file",
                                "stage18-upload.txt",
                                "text/plain",
                                "stage18 semantic upload marker".getBytes(StandardCharsets.UTF_8)))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("INDEXED"))
                .andExpect(jsonPath("$.embeddingStatus").value("INDEXED"));

        assertThat(embeddingClient.inputs())
                .anyMatch(input -> input.contains("stage18 semantic upload marker"));

        mockMvc.perform(get("/api/knowledge-bases/{knowledgeBaseId}/documents", knowledgeBaseId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].embeddingStatus").value("INDEXED"));
    }

    @Test
    void searchCanReturnSemanticOnlyMatchWithHybridScoreFields() throws Exception {
        Long userId = createUser("stage18_semantic_owner");
        String token = loginAndGetToken("stage18_semantic_owner");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage18 Semantic KB");
        createMembership(knowledgeBaseId, userId, "OWNER");

        Long jwtDocumentId = createDocument(userId, knowledgeBaseId, "jwt.md", "INDEXED", "INDEXED");
        Long jwtChunkId = createChunk(jwtDocumentId, knowledgeBaseId, 0,
                "JWT access token bearer header login flow", "[1,0,0]");
        Long semanticDocumentId = createDocument(userId, knowledgeBaseId, "semantic.md", "INDEXED", "INDEXED");
        Long semanticChunkId = createChunk(semanticDocumentId, knowledgeBaseId, 0,
                "OAuth delegated authorization grant consent screen", "[0,1,0]");

        embeddingClient.forceNextVector(List.of(0.0, 1.0, 0.0));
        MvcResult result = mockMvc.perform(post("/api/knowledge-bases/{knowledgeBaseId}/search", knowledgeBaseId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "query": "token login",
                                  "limit": 5
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[0].chunkId").value(semanticChunkId))
                .andExpect(jsonPath("$.results[0].retrievalMode").value("HYBRID"))
                .andExpect(jsonPath("$.results[0].semanticScore").isNumber())
                .andExpect(jsonPath("$.results[0].fulltextScore").isNumber())
                .andExpect(jsonPath("$.results[0].hybridScore").isNumber())
                .andReturn();

        JsonNode results = objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .get("results");
        assertThat(results.get(0).get("chunkId").asLong()).isEqualTo(semanticChunkId);
        assertThat(results.get(0).get("hybridScore").asDouble())
                .isGreaterThan(results.get(1).get("hybridScore").asDouble());
        assertThat(results.get(1).get("chunkId").asLong()).isEqualTo(jwtChunkId);
    }

    @Test
    void chatUsesSameHybridRetrievalOrderForSourcesAndPrompt() throws Exception {
        Long userId = createUser("stage18_chat_owner");
        String token = loginAndGetToken("stage18_chat_owner");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage18 Chat KB");
        createMembership(knowledgeBaseId, userId, "OWNER");
        Long documentId = createDocument(userId, knowledgeBaseId, "hybrid-chat.md", "INDEXED", "INDEXED");
        Long semanticChunkId = createChunk(documentId, knowledgeBaseId, 0,
                "OAuth delegated authorization grant consent screen", "[0,1,0]");
        Long keywordChunkId = createChunk(documentId, knowledgeBaseId, 1,
                "JWT access token bearer header login flow", "[1,0,0]");
        Long sessionId = createChatSession(userId, knowledgeBaseId, "Stage18 Chat Session");

        embeddingClient.forceNextVector(List.of(0.0, 1.0, 0.0));
        mockMvc.perform(post("/api/chat/sessions/{sessionId}/messages", sessionId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "content": "token login",
                                  "limit": 5
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.session.status").value("GENERATING"));

        JsonNode message = waitForAssistantMessage(token, sessionId);
        assertThat(message.get("sources").size()).isGreaterThanOrEqualTo(2);
        assertThat(message.get("sources").get(0).get("chunkId").asLong()).isEqualTo(semanticChunkId);
        assertThat(message.get("sources").get(0).get("hybridScore").asDouble())
                .isGreaterThan(message.get("sources").get(1).get("hybridScore").asDouble());
        assertThat(message.get("content").asText().indexOf("OAuth delegated authorization"))
                .isLessThan(message.get("content").asText().indexOf("JWT access token"));
        assertThat(message.get("sources").get(1).get("chunkId").asLong()).isEqualTo(keywordChunkId);
    }

    @Test
    void embeddingFailureKeepsTextIndexSearchableWithFailedEmbeddingStatus() throws Exception {
        Long userId = createUser("stage18_failure_owner");
        String token = loginAndGetToken("stage18_failure_owner");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage18 Failure KB");
        createMembership(knowledgeBaseId, userId, "OWNER");
        embeddingClient.failNext();

        mockMvc.perform(multipart("/api/knowledge-bases/{knowledgeBaseId}/documents", knowledgeBaseId)
                        .file(new MockMultipartFile(
                                "file",
                                "stage18-failure.txt",
                                "text/plain",
                                "stage18 fallback keyword survives embedding failure".getBytes(StandardCharsets.UTF_8)))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("INDEXED"))
                .andExpect(jsonPath("$.embeddingStatus").value("FAILED"));

        mockMvc.perform(post("/api/knowledge-bases/{knowledgeBaseId}/search", knowledgeBaseId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "query": "fallback keyword",
                                  "limit": 5
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[0].documentName").value("stage18-failure.txt"))
                .andExpect(jsonPath("$.results[0].retrievalMode").value("FULLTEXT"));
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
                        values (?, 'stage18 test', 'ACTIVE', false, 'blue', ?)
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

    private Long createDocument(Long userId, Long knowledgeBaseId, String filename, String status, String embeddingStatus) {
        return jdbcTemplate.queryForObject("""
                        insert into documents (
                            knowledge_base_id,
                            original_filename,
                            content_type,
                            size_bytes,
                            status,
                            error_message,
                            embedding_status,
                            created_by
                        )
                        values (?, ?, 'text/markdown', 100, ?, null, ?, ?)
                        returning id
                        """,
                Long.class,
                knowledgeBaseId,
                filename,
                status,
                embeddingStatus,
                userId);
    }

    private Long createChunk(Long documentId, Long knowledgeBaseId, int chunkIndex, String content, String embeddingLiteral) {
        return jdbcTemplate.queryForObject("""
                        insert into document_chunks (
                            document_id,
                            knowledge_base_id,
                            chunk_index,
                            content,
                            char_count,
                            embedding_status,
                            embedding
                        )
                        values (?, ?, ?, ?, ?, 'INDEXED', ?::vector)
                        returning id
                        """,
                Long.class,
                documentId,
                knowledgeBaseId,
                chunkIndex,
                content,
                content.length(),
                embeddingLiteral);
    }

    private Long createChatSession(Long userId, Long knowledgeBaseId, String title) {
        return jdbcTemplate.queryForObject("""
                        insert into chat_sessions (knowledge_base_id, user_id, title)
                        values (?, ?, ?)
                        returning id
                        """,
                Long.class,
                knowledgeBaseId,
                userId,
                title);
    }

    private JsonNode waitForAssistantMessage(String token, Long sessionId) throws Exception {
        for (int attempt = 0; attempt < 80; attempt++) {
            MvcResult result = mockMvc.perform(get("/api/chat/sessions/{sessionId}/messages", sessionId)
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                    .andExpect(status().isOk())
                    .andReturn();
            JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
            for (JsonNode message : root) {
                if ("ASSISTANT".equals(message.get("role").asText())) {
                    return message;
                }
            }
            Thread.sleep(50);
        }
        throw new AssertionError("Assistant message was not generated");
    }

    private void cleanStage18Data() {
        jdbcTemplate.update("""
                delete from chat_message_sources
                where message_id in (
                    select cm.id
                    from chat_messages cm
                    join chat_sessions cs on cs.id = cm.session_id
                    join users u on u.id = cs.user_id
                    where u.username like 'stage18_%'
                )
                """);
        jdbcTemplate.update("""
                delete from chat_messages
                where session_id in (
                    select cs.id
                    from chat_sessions cs
                    join users u on u.id = cs.user_id
                    where u.username like 'stage18_%'
                )
                """);
        jdbcTemplate.update("""
                delete from chat_sessions
                where user_id in (select id from users where username like 'stage18_%')
                """);
        jdbcTemplate.update("""
                delete from document_processing_jobs
                where requested_by in (select id from users where username like 'stage18_%')
                   or document_id in (
                       select d.id
                       from documents d
                       join users u on u.id = d.created_by
                       where u.username like 'stage18_%'
                   )
                """);
        jdbcTemplate.update("""
                delete from document_chunks
                where document_id in (
                    select d.id
                    from documents d
                    join users u on u.id = d.created_by
                    where u.username like 'stage18_%'
                )
                """);
        jdbcTemplate.update("""
                delete from documents
                where created_by in (select id from users where username like 'stage18_%')
                """);
        jdbcTemplate.update("""
                delete from knowledge_base_members
                where user_id in (select id from users where username like 'stage18_%')
                   or knowledge_base_id in (
                       select kb.id
                       from knowledge_bases kb
                       join users u on u.id = kb.created_by
                       where u.username like 'stage18_%'
                   )
                """);
        jdbcTemplate.update("""
                delete from knowledge_bases
                where created_by in (select id from users where username like 'stage18_%')
                """);
        jdbcTemplate.update("delete from users where username like 'stage18_%'");
    }

    @TestConfiguration
    static class Stage18ModelTestConfig {
        @Bean
        @Primary
        RecordingEmbeddingModelClient embeddingModelClient() {
            return new RecordingEmbeddingModelClient();
        }

        @Bean
        @Primary
        RecordingChatModelClient chatModelClient() {
            return new RecordingChatModelClient();
        }
    }

    static class RecordingEmbeddingModelClient implements EmbeddingModelClient {
        private final List<String> inputs = new ArrayList<>();
        private List<Double> forcedNextVector;
        private boolean failNext;

        @Override
        public boolean isConfigured(Long userId) {
            return true;
        }

        @Override
        public List<List<Double>> embed(Long userId, List<String> input) {
            inputs.addAll(input);
            if (failNext) {
                failNext = false;
                throw new IllegalStateException("stage18-sensitive-key should be sanitized");
            }
            if (forcedNextVector != null) {
                List<Double> vector = forcedNextVector;
                forcedNextVector = null;
                return input.stream().map(ignored -> vector).toList();
            }
            return input.stream()
                    .map(RecordingEmbeddingModelClient::vectorFor)
                    .toList();
        }

        List<String> inputs() {
            return inputs;
        }

        void forceNextVector(List<Double> vector) {
            this.forcedNextVector = vector;
        }

        void failNext() {
            this.failNext = true;
        }

        void reset() {
            inputs.clear();
            forcedNextVector = null;
            failNext = false;
        }

        private static List<Double> vectorFor(String input) {
            String lower = input.toLowerCase();
            if (lower.contains("oauth") || lower.contains("delegated")) {
                return List.of(0.0, 1.0, 0.0);
            }
            if (lower.contains("jwt") || lower.contains("token") || lower.contains("login")) {
                return List.of(1.0, 0.0, 0.0);
            }
            return List.of(0.0, 0.0, 1.0);
        }
    }

    static class RecordingChatModelClient implements ChatModelClient {
        private final List<String> prompts = new ArrayList<>();

        @Override
        public String chat(Long userId, String prompt, double temperature) {
            return chat(userId, prompt, temperature, null);
        }

        @Override
        public String chat(Long userId, String prompt, double temperature, String modelOverride) {
            prompts.add(prompt);
            return prompt;
        }

        void reset() {
            prompts.clear();
        }
    }
}
