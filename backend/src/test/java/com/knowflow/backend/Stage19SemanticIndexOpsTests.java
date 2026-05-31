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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(
        classes = {KnowflowBackendApplication.class, Stage19SemanticIndexOpsTests.Stage19ModelTestConfig.class},
        properties = {
                "knowflow.ai.base-url=http://127.0.0.1:1/v1",
                "knowflow.ai.api-key=stage19-test-secret",
                "knowflow.ai.model=stage19-chat-model",
                "knowflow.ai.embedding-model=stage19-embedding-model",
                "knowflow.documents.processing.async-enabled=false"
        }
)
@AutoConfigureMockMvc
class Stage19SemanticIndexOpsTests {

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

    private final String password = "stage19-password";

    @BeforeEach
    void cleanBefore() {
        embeddingClient.reset();
        cleanStage19Data();
    }

    @AfterEach
    void cleanAfter() {
        embeddingClient.reset();
        cleanStage19Data();
    }

    @Test
    void ragSettingsExposeRetrievalStrategyAndWeights() throws Exception {
        createUser("stage19_rag_settings");
        String token = loginAndGetToken("stage19_rag_settings");

        mockMvc.perform(get("/api/settings/rag")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.retrievalMode").value("HYBRID"))
                .andExpect(jsonPath("$.semanticWeight").value(0.7))
                .andExpect(jsonPath("$.fulltextWeight").value(0.3));

        mockMvc.perform(patch("/api/settings/rag")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "retrievalMode": "FULLTEXT",
                                  "semanticWeight": 0.2,
                                  "fulltextWeight": 0.8
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.retrievalMode").value("FULLTEXT"))
                .andExpect(jsonPath("$.semanticWeight").value(0.2))
                .andExpect(jsonPath("$.fulltextWeight").value(0.8));
    }

    @Test
    void hybridRetrievalUsesSavedWeightsForSearchOrdering() throws Exception {
        Long userId = createUser("stage19_weight_owner");
        String token = loginAndGetToken("stage19_weight_owner");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage19 Weight KB");
        createMembership(knowledgeBaseId, userId, "OWNER");
        Long documentId = createDocument(userId, knowledgeBaseId, "weights.md", "INDEXED", "INDEXED");
        Long keywordChunkId = createChunk(documentId, knowledgeBaseId, 0,
                "JWT access token bearer header login flow", "[1,0,0]");
        Long semanticChunkId = createChunk(documentId, knowledgeBaseId, 1,
                "OAuth delegated authorization grant consent screen", "[0,1,0]");

        embeddingClient.forceNextVector(List.of(0.0, 1.0, 0.0));
        mockMvc.perform(post("/api/knowledge-bases/{knowledgeBaseId}/search", knowledgeBaseId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "query": "token login",
                                  "limit": 5
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[0].chunkId").value(semanticChunkId));

        mockMvc.perform(patch("/api/settings/rag")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "retrievalMode": "HYBRID",
                                  "semanticWeight": 0.1,
                                  "fulltextWeight": 0.9
                                }
                                """))
                .andExpect(status().isOk());

        embeddingClient.forceNextVector(List.of(0.0, 1.0, 0.0));
        mockMvc.perform(post("/api/knowledge-bases/{knowledgeBaseId}/search", knowledgeBaseId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "query": "token login",
                                  "limit": 5
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[0].chunkId").value(keywordChunkId));
    }

    @Test
    void rebuildDocumentSemanticIndexDoesNotRewriteChunksOrDocumentStatus() throws Exception {
        Long userId = createUser("stage19_rebuild_owner");
        String token = loginAndGetToken("stage19_rebuild_owner");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage19 Rebuild KB");
        createMembership(knowledgeBaseId, userId, "OWNER");
        Long documentId = createDocument(userId, knowledgeBaseId, "semantic-rebuild.md", "INDEXED", "FAILED");
        Long chunkId = createChunk(documentId, knowledgeBaseId, 0,
                "stage19 semantic rebuild should preserve chunk identity", null);

        mockMvc.perform(post("/api/documents/{documentId}/semantic-index/rebuild", documentId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobType").value("REBUILD_SEMANTIC_INDEX"))
                .andExpect(jsonPath("$.status").value("SUCCEEDED"));

        assertThat(readDocumentStatus(documentId)).isEqualTo("INDEXED");
        assertThat(readDocumentEmbeddingStatus(documentId)).isEqualTo("INDEXED");
        assertThat(readChunkId(documentId, 0)).isEqualTo(chunkId);
        assertThat(readChunkEmbeddingStatus(chunkId)).isEqualTo("INDEXED");
        assertThat(readChunkEmbeddingLiteral(chunkId)).isNotBlank();
    }

    @Test
    void viewerCannotTriggerSemanticIndexRebuild() throws Exception {
        Long ownerId = createUser("stage19_rebuild_owner_acl");
        Long viewerId = createUser("stage19_rebuild_viewer_acl");
        String viewerToken = loginAndGetToken("stage19_rebuild_viewer_acl");
        Long knowledgeBaseId = createKnowledgeBase(ownerId, "Stage19 ACL KB");
        createMembership(knowledgeBaseId, ownerId, "OWNER");
        createMembership(knowledgeBaseId, viewerId, "VIEWER");
        Long documentId = createDocument(ownerId, knowledgeBaseId, "semantic-acl.md", "INDEXED", "FAILED");
        createChunk(documentId, knowledgeBaseId, 0, "stage19 acl chunk", null);

        mockMvc.perform(post("/api/documents/{documentId}/semantic-index/rebuild", documentId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + viewerToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/knowledge-bases/{knowledgeBaseId}/semantic-index/rebuild", knowledgeBaseId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + viewerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void knowledgeBaseSemanticRebuildCreatesJobsForIndexedDocumentsOnly() throws Exception {
        Long userId = createUser("stage19_rebuild_kb");
        String token = loginAndGetToken("stage19_rebuild_kb");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage19 Batch KB");
        createMembership(knowledgeBaseId, userId, "OWNER");
        Long indexedDocumentId = createDocument(userId, knowledgeBaseId, "indexed.md", "INDEXED", "FAILED");
        createChunk(indexedDocumentId, knowledgeBaseId, 0, "stage19 indexed chunk", null);
        Long failedDocumentId = createDocument(userId, knowledgeBaseId, "failed.md", "FAILED", "FAILED");
        createChunk(failedDocumentId, knowledgeBaseId, 0, "stage19 failed chunk", null);

        mockMvc.perform(post("/api/knowledge-bases/{knowledgeBaseId}/semantic-index/rebuild", knowledgeBaseId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].documentId").value(indexedDocumentId))
                .andExpect(jsonPath("$[0].jobType").value("REBUILD_SEMANTIC_INDEX"))
                .andExpect(jsonPath("$[0].status").value("SUCCEEDED"))
                .andExpect(jsonPath("$[1]").doesNotExist());

        assertThat(countRebuildJobs(failedDocumentId)).isZero();
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
                        values (?, 'stage19 test', 'ACTIVE', false, 'blue', ?)
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
        if (embeddingLiteral == null) {
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
                            values (?, ?, ?, ?, ?, 'FAILED', null)
                            returning id
                            """,
                    Long.class,
                    documentId,
                    knowledgeBaseId,
                    chunkIndex,
                    content,
                    content.length());
        }
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

    private String readDocumentStatus(Long documentId) {
        return jdbcTemplate.queryForObject("select status from documents where id = ?", String.class, documentId);
    }

    private String readDocumentEmbeddingStatus(Long documentId) {
        return jdbcTemplate.queryForObject("select embedding_status from documents where id = ?", String.class, documentId);
    }

    private Long readChunkId(Long documentId, int chunkIndex) {
        return jdbcTemplate.queryForObject(
                "select id from document_chunks where document_id = ? and chunk_index = ?",
                Long.class,
                documentId,
                chunkIndex);
    }

    private String readChunkEmbeddingStatus(Long chunkId) {
        return jdbcTemplate.queryForObject("select embedding_status from document_chunks where id = ?", String.class, chunkId);
    }

    private String readChunkEmbeddingLiteral(Long chunkId) {
        return jdbcTemplate.queryForObject("select embedding::text from document_chunks where id = ?", String.class, chunkId);
    }

    private Integer countRebuildJobs(Long documentId) {
        return jdbcTemplate.queryForObject(
                "select count(*) from document_processing_jobs where document_id = ? and job_type = 'REBUILD_SEMANTIC_INDEX'",
                Integer.class,
                documentId);
    }

    private void cleanStage19Data() {
        jdbcTemplate.update("""
                delete from document_processing_jobs
                where requested_by in (select id from users where username like 'stage19_%')
                   or document_id in (
                       select d.id
                       from documents d
                       join users u on u.id = d.created_by
                       where u.username like 'stage19_%'
                   )
                """);
        jdbcTemplate.update("""
                delete from document_chunks
                where document_id in (
                    select d.id
                    from documents d
                    join users u on u.id = d.created_by
                    where u.username like 'stage19_%'
                )
                """);
        jdbcTemplate.update("""
                delete from documents
                where created_by in (select id from users where username like 'stage19_%')
                """);
        jdbcTemplate.update("""
                delete from knowledge_base_members
                where user_id in (select id from users where username like 'stage19_%')
                   or knowledge_base_id in (
                       select kb.id
                       from knowledge_bases kb
                       join users u on u.id = kb.created_by
                       where u.username like 'stage19_%'
                   )
                """);
        jdbcTemplate.update("""
                delete from knowledge_bases
                where created_by in (select id from users where username like 'stage19_%')
                """);
        jdbcTemplate.update("""
                delete from user_rag_settings
                where user_id in (select id from users where username like 'stage19_%')
                """);
        jdbcTemplate.update("delete from users where username like 'stage19_%'");
    }

    @TestConfiguration
    static class Stage19ModelTestConfig {
        @Bean
        @Primary
        RecordingEmbeddingModelClient embeddingModelClient() {
            return new RecordingEmbeddingModelClient();
        }

        @Bean
        @Primary
        ChatModelClient chatModelClient() {
            return (userId, prompt, temperature) -> prompt;
        }
    }

    static class RecordingEmbeddingModelClient implements EmbeddingModelClient {
        private final List<String> inputs = new ArrayList<>();
        private List<Double> forcedNextVector;

        @Override
        public boolean isConfigured(Long userId) {
            return true;
        }

        @Override
        public List<List<Double>> embed(Long userId, List<String> input) {
            inputs.addAll(input);
            if (forcedNextVector != null) {
                List<Double> vector = forcedNextVector;
                forcedNextVector = null;
                return input.stream().map(ignored -> vector).toList();
            }
            return input.stream()
                    .map(RecordingEmbeddingModelClient::vectorFor)
                    .toList();
        }

        void forceNextVector(List<Double> vector) {
            this.forcedNextVector = vector;
        }

        void reset() {
            inputs.clear();
            forcedNextVector = null;
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
}
