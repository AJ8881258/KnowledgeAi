package com.knowflow.backend;

import com.knowflow.backend.auth.avatar.AvatarStorageService;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
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
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;

@SpringBootTest(
        classes = {
                KnowflowBackendApplication.class,
                Stage21StreamingAvatarMentionTests.FakeAvatarStorageConfiguration.class
        },
        properties = {
                "knowflow.ai.base-url=http://127.0.0.1:1/v1",
                "knowflow.ai.api-key=stage21-env-key",
                "knowflow.ai.model=stage21-env-model",
                "knowflow.model.secret-key=stage21-test-secret-key-with-32-bytes"
        }
)
@AutoConfigureMockMvc
class Stage21StreamingAvatarMentionTests {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private FakeAvatarStorageService fakeAvatarStorageService;

    private final String password = "stage21-password";
    private Stage21ModelServer modelServer;

    @BeforeEach
    void cleanBefore() throws Exception {
        modelServer = new Stage21ModelServer();
        cleanStage21Data();
        fakeAvatarStorageService.reset();
    }

    @AfterEach
    void cleanAfter() {
        if (modelServer != null) {
            modelServer.close();
        }
        fakeAvatarStorageService.reset();
        cleanStage21Data();
    }

    @Test
    void streamMessageEmitsSseEventsAndPersistsDeltaContent() throws Exception {
        Long userId = createUser("stage21_stream_owner");
        String token = loginAndGetToken("stage21_stream_owner");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage21 Stream KB");
        createMembership(knowledgeBaseId, userId, "OWNER");
        Long sessionId = createSession(knowledgeBaseId, token, "Stream session");
        saveModelSettings(token, "stage21-stream-key", "stage21-stream-model");
        modelServer.returnStreamingChat("你好", "，世界");

        MvcResult asyncResult = mockMvc.perform(post("/api/chat/sessions/{sessionId}/messages/stream", sessionId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.TEXT_EVENT_STREAM)
                        .content("""
                                {
                                  "content": "你好",
                                  "limit": 3,
                                  "ragEnabled": false
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn();

        MvcResult result = mockMvc.perform(asyncDispatch(asyncResult))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, containsString(MediaType.TEXT_EVENT_STREAM_VALUE)))
                .andReturn();

        String body = result.getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(body).contains("event:user_message");
        assertThat(body).contains("event:assistant_message");
        assertThat(body).contains("event:delta");
        assertThat(body).contains("event:done");
        assertThat(readAssistantContents(sessionId)).containsExactly("你好，世界");
        assertThat(modelServer.authorizationHeaders()).contains("Bearer stage21-stream-key");
    }

    @Test
    void mentionedDocumentIdsLimitRetrievalToSelectedIndexedDocument() throws Exception {
        Long userId = createUser("stage21_mention_owner");
        String token = loginAndGetToken("stage21_mention_owner");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage21 Mention KB");
        createMembership(knowledgeBaseId, userId, "OWNER");
        Long sessionId = createSession(knowledgeBaseId, token, "Mention session");
        Long ignoredDocumentId = createDocument(userId, knowledgeBaseId, "stage21-ignored.md", "INDEXED");
        Long selectedDocumentId = createDocument(userId, knowledgeBaseId, "stage21-selected.md", "INDEXED");
        createChunk(ignoredDocumentId, knowledgeBaseId, 0, "stage21 ignored chunk should not enter prompt");
        createChunk(selectedDocumentId, knowledgeBaseId, 0, "stage21 selected chunk enters prompt");
        saveModelSettings(token, "stage21-mention-key", "stage21-mention-model");
        modelServer.returnChatCompletion("mention answer");

        mockMvc.perform(post("/api/chat/sessions/{sessionId}/messages", sessionId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "content": "讲一下这个文档",
                                  "limit": 5,
                                  "mentionedDocumentIds": [%d]
                                }
                                """.formatted(selectedDocumentId)))
                .andExpect(status().isOk());

        waitUntil(() -> readAssistantContents(sessionId).contains("mention answer"));
        assertThat(modelServer.requestBodies()).anySatisfy(body -> {
            assertThat(body).contains("stage21 selected chunk enters prompt");
            assertThat(body).doesNotContain("stage21 ignored chunk should not enter prompt");
        });
        assertThat(readSourceDocumentIds(sessionId)).containsExactly(selectedDocumentId);
    }

    @Test
    void titleAwareRetrievalMatchesNoisyUploadedFilename() throws Exception {
        Long userId = createUser("stage21_title_owner");
        String token = loginAndGetToken("stage21_title_owner");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage21 Title KB");
        createMembership(knowledgeBaseId, userId, "OWNER");
        Long sessionId = createSession(knowledgeBaseId, token, "Title session");
        Long documentId = createDocument(userId, knowledgeBaseId, "202502150239_邓林峰_《微服务核心组件实验》实验报告 (2).docx", "INDEXED");
        createChunk(documentId, knowledgeBaseId, 0, "service registry config center gateway load balancing");
        saveModelSettings(token, "stage21-title-key", "stage21-title-model");
        modelServer.returnChatCompletion("title answer");

        mockMvc.perform(post("/api/chat/sessions/{sessionId}/messages", sessionId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "content": "跟我讲解一下《微服务核心组件实验》实验报告这个里面的内容精炼",
                                  "limit": 5
                                }
                                """))
                .andExpect(status().isOk());

        waitUntil(() -> readAssistantContents(sessionId).contains("title answer"));
        assertThat(modelServer.requestBodies()).anySatisfy(body ->
                assertThat(body).contains("service registry config center gateway load balancing"));
        assertThat(readSourceDocumentIds(sessionId)).containsExactly(documentId);
    }

    @Test
    void crossKnowledgeBaseMentionIsHiddenAsNotFound() throws Exception {
        Long ownerId = createUser("stage21_cross_owner");
        Long otherId = createUser("stage21_cross_other");
        String ownerToken = loginAndGetToken("stage21_cross_owner");
        Long ownerKnowledgeBaseId = createKnowledgeBase(ownerId, "Stage21 Owner KB");
        Long otherKnowledgeBaseId = createKnowledgeBase(otherId, "Stage21 Other KB");
        createMembership(ownerKnowledgeBaseId, ownerId, "OWNER");
        createMembership(otherKnowledgeBaseId, otherId, "OWNER");
        Long sessionId = createSession(ownerKnowledgeBaseId, ownerToken, "Cross mention session");
        Long otherDocumentId = createDocument(otherId, otherKnowledgeBaseId, "stage21-other.md", "INDEXED");
        createChunk(otherDocumentId, otherKnowledgeBaseId, 0, "other chunk");
        saveModelSettings(ownerToken, "stage21-cross-key", "stage21-cross-model");

        mockMvc.perform(post("/api/chat/sessions/{sessionId}/messages", sessionId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "content": "讲一下 @other",
                                  "mentionedDocumentIds": [%d]
                                }
                                """.formatted(otherDocumentId)))
                .andExpect(status().isOk());

        waitUntil(() -> "FAILED".equals(readSessionStatus(sessionId)));
        assertThat(readLastErrorMessage(sessionId)).isEqualTo("AI model call failed");
        assertThat(readAssistantContents(sessionId)).isEmpty();
    }

    @Test
    void ragDisabledIgnoresMentionAndReturnsEmptySources() throws Exception {
        Long userId = createUser("stage21_rag_disabled_owner");
        String token = loginAndGetToken("stage21_rag_disabled_owner");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage21 RAG Disabled KB");
        createMembership(knowledgeBaseId, userId, "OWNER");
        Long sessionId = createSession(knowledgeBaseId, token, "RAG disabled session");
        Long documentId = createDocument(userId, knowledgeBaseId, "stage21-disabled.md", "INDEXED");
        createChunk(documentId, knowledgeBaseId, 0, "stage21 disabled chunk should not enter prompt");
        saveModelSettings(token, "stage21-rag-off-key", "stage21-rag-off-model");
        modelServer.returnChatCompletion("no rag answer");

        mockMvc.perform(post("/api/chat/sessions/{sessionId}/messages", sessionId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "content": "讲一下这个文档",
                                  "ragEnabled": false,
                                  "mentionedDocumentIds": [%d]
                                }
                                """.formatted(documentId)))
                .andExpect(status().isOk());

        waitUntil(() -> readAssistantContents(sessionId).contains("no rag answer"));
        assertThat(modelServer.requestBodies()).anySatisfy(body ->
                assertThat(body).doesNotContain("stage21 disabled chunk should not enter prompt"));
        assertThat(readSourceDocumentIds(sessionId)).isEmpty();
    }

    @Test
    void avatarUploadReturnsSignedUrlWithoutLeakingObjectKeyAndDeleteClearsProfile() throws Exception {
        createUser("stage21_avatar_owner");
        String token = loginAndGetToken("stage21_avatar_owner");
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "avatar.png",
                "image/png",
                new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00}
        );

        mockMvc.perform(multipart("/api/auth/me/avatar")
                        .file(file)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarConfigured").value(true))
                .andExpect(jsonPath("$.avatarSource").value("UPLOAD"))
                .andExpect(jsonPath("$.avatarPresetId").doesNotExist())
                .andExpect(jsonPath("$.avatarUrl").value(containsString("https://signed.example.test/")))
                .andExpect(content().string(not(containsString("stage21-avatar-secret"))));

        assertThat(readAvatarObjectKey("stage21_avatar_owner")).contains("object-key");

        mockMvc.perform(get("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarConfigured").value(true))
                .andExpect(jsonPath("$.avatarSource").value("UPLOAD"))
                .andExpect(jsonPath("$.avatarPresetId").doesNotExist())
                .andExpect(jsonPath("$.avatarUrl").value(containsString("https://signed.example.test/")))
                .andExpect(content().string(not(containsString("stage21-avatar-secret"))));

        mockMvc.perform(delete("/api/auth/me/avatar")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarConfigured").value(false))
                .andExpect(jsonPath("$.avatarSource").value("NONE"))
                .andExpect(jsonPath("$.avatarPresetId").doesNotExist())
                .andExpect(jsonPath("$.avatarUrl").doesNotExist());

        assertThat(readAvatarObjectKey("stage21_avatar_owner")).isNull();
        assertThat(fakeAvatarStorageService.deletedObjectKeys()).isNotEmpty();
    }

    @Test
    void avatarUploadRejectsInvalidTypeAndOversizedFile() throws Exception {
        createUser("stage21_avatar_invalid");
        String token = loginAndGetToken("stage21_avatar_invalid");

        mockMvc.perform(multipart("/api/auth/me/avatar")
                        .file(new MockMultipartFile("file", "avatar.png", "image/png", "not-a-png".getBytes(StandardCharsets.UTF_8)))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isBadRequest());

        byte[] oversized = new byte[2 * 1024 * 1024 + 1];
        oversized[0] = (byte) 0xFF;
        oversized[1] = (byte) 0xD8;
        oversized[2] = (byte) 0xFF;
        mockMvc.perform(multipart("/api/auth/me/avatar")
                        .file(new MockMultipartFile("file", "avatar.jpg", "image/jpeg", oversized))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

    private void saveModelSettings(String token, String apiKey, String model) throws Exception {
        mockMvc.perform(patch("/api/settings/model")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "baseUrl": "%s/v1",
                                  "apiKey": "%s",
                                  "model": "%s",
                                  "timeoutSeconds": 60
                                }
                                """.formatted(modelServer.baseUrl(), apiKey, model)))
                .andExpect(status().isOk());
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
                        values (?, 'stage21 test', 'ACTIVE', false, 'blue', ?)
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

    private Long createSession(Long knowledgeBaseId, String token, String title) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/knowledge-bases/{knowledgeBaseId}/chat/sessions", knowledgeBaseId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("title", title))))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
        return root.get("id").asLong();
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

    private List<String> readAssistantContents(Long sessionId) {
        return jdbcTemplate.queryForList(
                "select content from chat_messages where session_id = ? and role = 'ASSISTANT' order by id",
                String.class,
                sessionId);
    }

    private List<Long> readSourceDocumentIds(Long sessionId) {
        return jdbcTemplate.queryForList("""
                        select source.document_id
                        from chat_message_sources source
                        join chat_messages message on message.id = source.message_id
                        where message.session_id = ?
                        order by source.id
                        """,
                Long.class,
                sessionId);
    }

    private String readSessionStatus(Long sessionId) {
        return jdbcTemplate.queryForObject("select status from chat_sessions where id = ?", String.class, sessionId);
    }

    private String readLastErrorMessage(Long sessionId) {
        return jdbcTemplate.queryForObject("select last_error_message from chat_sessions where id = ?", String.class, sessionId);
    }

    private String readAvatarObjectKey(String username) {
        return jdbcTemplate.queryForObject(
                "select avatar_object_key from users where username = ?",
                String.class,
                username);
    }

    private void waitUntil(CheckedBooleanSupplier condition) throws Exception {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(8);
        AssertionError lastError = null;
        while (System.nanoTime() < deadline) {
            try {
                if (condition.getAsBoolean()) {
                    return;
                }
            } catch (AssertionError error) {
                lastError = error;
            }
            Thread.sleep(100);
        }
        if (lastError != null) {
            throw lastError;
        }
        throw new AssertionError("Condition was not satisfied before timeout");
    }

    private void cleanStage21Data() {
        jdbcTemplate.update("""
                delete from chat_message_sources
                where message_id in (
                    select m.id
                    from chat_messages m
                    join chat_sessions s on s.id = m.session_id
                    join users u on u.id = s.user_id
                    where u.username like 'stage21_%'
                )
                """);
        jdbcTemplate.update("""
                delete from chat_messages
                where session_id in (
                    select s.id
                    from chat_sessions s
                    join users u on u.id = s.user_id
                    where u.username like 'stage21_%'
                )
                """);
        jdbcTemplate.update("""
                delete from chat_sessions
                where user_id in (select id from users where username like 'stage21_%')
                """);
        jdbcTemplate.update("""
                delete from document_chunks
                where document_id in (
                    select d.id
                    from documents d
                    join users u on u.id = d.created_by
                    where u.username like 'stage21_%'
                )
                """);
        jdbcTemplate.update("""
                delete from documents
                where created_by in (select id from users where username like 'stage21_%')
                """);
        jdbcTemplate.update("""
                delete from knowledge_base_members
                where user_id in (select id from users where username like 'stage21_%')
                   or knowledge_base_id in (
                       select kb.id
                       from knowledge_bases kb
                       join users u on u.id = kb.created_by
                       where u.username like 'stage21_%'
                   )
                """);
        jdbcTemplate.update("""
                delete from knowledge_bases
                where created_by in (select id from users where username like 'stage21_%')
                """);
        jdbcTemplate.update("""
                delete from user_model_settings
                where user_id in (select id from users where username like 'stage21_%')
                """);
        jdbcTemplate.update("delete from users where username like 'stage21_%'");
    }

    @FunctionalInterface
    private interface CheckedBooleanSupplier {
        boolean getAsBoolean() throws Exception;
    }

    @TestConfiguration
    static class FakeAvatarStorageConfiguration {
        @Bean
        @Primary
        FakeAvatarStorageService fakeAvatarStorageService() {
            return new FakeAvatarStorageService();
        }
    }

    static class FakeAvatarStorageService implements AvatarStorageService {
        private final List<String> deletedObjectKeys = new CopyOnWriteArrayList<>();
        private volatile int uploadSequence = 0;

        @Override
        public String upload(Long userId, MultipartFile file) {
            validateFile(file);
            uploadSequence += 1;
            return "knowflow/avatars/%d/object-key-%d.png".formatted(userId, uploadSequence);
        }

        @Override
        public void delete(String objectKey) {
            if (objectKey != null) {
                deletedObjectKeys.add(objectKey);
            }
        }

        @Override
        public String createSignedUrl(String objectKey) {
            return objectKey == null ? null : "https://signed.example.test/" + objectKey;
        }

        @Override
        public boolean isConfigured() {
            return true;
        }

        void reset() {
            deletedObjectKeys.clear();
            uploadSequence = 0;
        }

        List<String> deletedObjectKeys() {
            return deletedObjectKeys;
        }

        private void validateFile(MultipartFile file) {
            if (file == null || file.isEmpty()) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "avatar file is required");
            }
            if (file.getSize() > 2L * 1024L * 1024L) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "avatar file is too large");
            }
            String contentType = file.getContentType();
            try {
                byte[] header = file.getInputStream().readNBytes(12);
                boolean valid = switch (contentType) {
                    case "image/jpeg" -> header.length >= 3
                            && (header[0] & 0xFF) == 0xFF
                            && (header[1] & 0xFF) == 0xD8
                            && (header[2] & 0xFF) == 0xFF;
                    case "image/png" -> header.length >= 8
                            && (header[0] & 0xFF) == 0x89
                            && header[1] == 0x50
                            && header[2] == 0x4E
                            && header[3] == 0x47
                            && header[4] == 0x0D
                            && header[5] == 0x0A
                            && header[6] == 0x1A
                            && header[7] == 0x0A;
                    case "image/webp" -> header.length >= 12
                            && header[0] == 0x52
                            && header[1] == 0x49
                            && header[2] == 0x46
                            && header[3] == 0x46
                            && header[8] == 0x57
                            && header[9] == 0x45
                            && header[10] == 0x42
                            && header[11] == 0x50;
                    default -> false;
                };
                if (!valid) {
                    throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "avatar file type is not supported");
                }
            } catch (IOException exception) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "avatar file type is not supported");
            }
        }
    }

    private static class Stage21ModelServer implements AutoCloseable {
        private final HttpServer server;
        private final List<String> authorizationHeaders = new CopyOnWriteArrayList<>();
        private final List<String> requestBodies = new CopyOnWriteArrayList<>();
        private volatile String body = "{\"choices\":[{\"message\":{\"content\":\"ok\"}}]}";
        private volatile String contentType = MediaType.APPLICATION_JSON_VALUE;

        Stage21ModelServer() throws IOException {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/v1/chat/completions", this::handle);
            server.start();
        }

        String baseUrl() {
            return "http://127.0.0.1:" + server.getAddress().getPort();
        }

        List<String> authorizationHeaders() {
            return authorizationHeaders;
        }

        List<String> requestBodies() {
            return requestBodies;
        }

        void returnChatCompletion(String answer) {
            this.contentType = MediaType.APPLICATION_JSON_VALUE;
            this.body = """
                    {
                      "choices": [
                        {
                          "message": {
                            "content": "%s"
                          }
                        }
                      ]
                    }
                    """.formatted(answer);
        }

        void returnStreamingChat(String... deltas) {
            this.contentType = MediaType.TEXT_EVENT_STREAM_VALUE;
            StringBuilder builder = new StringBuilder();
            for (String delta : deltas) {
                builder.append("data: {\"choices\":[{\"delta\":{\"content\":\"")
                        .append(delta)
                        .append("\"}}]}\n\n");
            }
            builder.append("data: [DONE]\n\n");
            this.body = builder.toString();
        }

        private void handle(HttpExchange exchange) throws IOException {
            authorizationHeaders.add(exchange.getRequestHeaders().getFirst(HttpHeaders.AUTHORIZATION));
            requestBodies.add(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] responseBody = body.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add(HttpHeaders.CONTENT_TYPE, contentType);
            exchange.sendResponseHeaders(200, responseBody.length);
            exchange.getResponseBody().write(responseBody);
            exchange.close();
        }

        @Override
        public void close() {
            server.stop(0);
        }
    }
}
