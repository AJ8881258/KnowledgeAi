package com.knowflow.backend;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(
        classes = KnowflowBackendApplication.class,
        properties = {
                "knowflow.ai.base-url=http://127.0.0.1:1/v1",
                "knowflow.ai.api-key=stage23-chat-env-key",
                "knowflow.ai.model=stage23-chat-env-model",
                "knowflow.jwt.secret=stage23-chat-jwt-secret-with-32-bytes",
                "knowflow.model.secret-key=stage23-chat-secret-key-with-32-bytes"
        }
)
@AutoConfigureMockMvc
class Stage23ChatCancellationTests {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private final String password = "stage23-chat-password";
    private Stage23ChatModelServer modelServer;

    @BeforeEach
    void cleanBefore() throws Exception {
        modelServer = new Stage23ChatModelServer();
        cleanStage23ChatData();
    }

    @AfterEach
    void cleanAfter() {
        if (modelServer != null) {
            modelServer.close();
        }
        cleanStage23ChatData();
    }

    @Test
    void cancelStreamingPartialDeletesCurrentAssistantKeepsUserAndDropsLateDeltas() throws Exception {
        Long userId = createUser("stage23_chat_cancel_owner");
        String token = loginAndGetToken("stage23_chat_cancel_owner");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage23 Chat Cancel KB");
        createMembership(knowledgeBaseId, userId, "OWNER");
        Long sessionId = createSession(knowledgeBaseId, token, "Cancel partial session");
        saveModelSettings(token, "stage23-chat-cancel-key", "stage23-chat-cancel-model");
        CountDownLatch releaseLateDeltas = modelServer.returnBlockingStreamingChat("partial answer", " late answer");

        MvcResult asyncResult = startStreamingMessage(token, sessionId, "question that will be canceled");
        waitUntil(() -> readAssistantContents(sessionId).contains("partial answer"));

        mockMvc.perform(post("/api/chat/sessions/{sessionId}/cancel", sessionId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IDLE"));

        assertThat(readAssistantContents(sessionId)).isEmpty();
        assertThat(readMessages(token, sessionId))
                .extracting(message -> message.get("role").asText() + ":" + message.get("content").asText())
                .containsExactly("USER:question that will be canceled");

        releaseLateDeltas.countDown();
        assertThat(modelServer.awaitRequestFinished()).isTrue();
        mockMvc.perform(asyncDispatch(asyncResult))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, containsString(MediaType.TEXT_EVENT_STREAM_VALUE)));

        assertThat(readAssistantContents(sessionId)).isEmpty();
        assertThat(readSourceCount(sessionId)).isZero();
        assertThat(readMessages(token, sessionId))
                .extracting(message -> message.get("role").asText() + ":" + message.get("content").asText())
                .containsExactly("USER:question that will be canceled");
    }

    @Test
    void cancelSecondStreamingPartialDoesNotDeletePreviouslyCompletedAssistant() throws Exception {
        Long userId = createUser("stage23_chat_keep_owner");
        String token = loginAndGetToken("stage23_chat_keep_owner");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage23 Chat Keep KB");
        createMembership(knowledgeBaseId, userId, "OWNER");
        Long sessionId = createSession(knowledgeBaseId, token, "Keep completed session");
        saveModelSettings(token, "stage23-chat-keep-key", "stage23-chat-keep-model");

        modelServer.returnStreamingChat("completed answer");
        MvcResult completedStream = startStreamingMessage(token, sessionId, "completed question");
        mockMvc.perform(asyncDispatch(completedStream))
                .andExpect(status().isOk());
        assertThat(readAssistantContents(sessionId)).containsExactly("completed answer");

        CountDownLatch releaseLateDeltas = modelServer.returnBlockingStreamingChat("second partial", " second late");
        MvcResult canceledStream = startStreamingMessage(token, sessionId, "second question");
        waitUntil(() -> readAssistantContents(sessionId).contains("second partial"));

        mockMvc.perform(post("/api/chat/sessions/{sessionId}/cancel", sessionId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IDLE"));

        releaseLateDeltas.countDown();
        assertThat(modelServer.awaitRequestFinished()).isTrue();
        mockMvc.perform(asyncDispatch(canceledStream))
                .andExpect(status().isOk());

        assertThat(readMessages(token, sessionId))
                .extracting(message -> message.get("role").asText() + ":" + message.get("content").asText())
                .containsExactly(
                        "USER:completed question",
                        "ASSISTANT:completed answer",
                        "USER:second question"
                );
        assertThat(readAssistantContents(sessionId)).containsExactly("completed answer");
    }

    private MvcResult startStreamingMessage(String token, Long sessionId, String content) throws Exception {
        return mockMvc.perform(post("/api/chat/sessions/{sessionId}/messages/stream", sessionId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.TEXT_EVENT_STREAM)
                        .content("""
                                {
                                  "content": "%s",
                                  "limit": 3,
                                  "ragEnabled": false
                                }
                                """.formatted(content)))
                .andExpect(status().isOk())
                .andReturn();
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
                        values (?, 'stage23 chat cancellation test', 'ACTIVE', false, 'blue', ?)
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

    private List<JsonNode> readMessages(String token, Long sessionId) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/chat/sessions/{sessionId}/messages", sessionId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        List<JsonNode> messages = new ArrayList<>();
        for (JsonNode message : objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8))) {
            messages.add(message);
        }
        return messages;
    }

    private List<String> readAssistantContents(Long sessionId) {
        return jdbcTemplate.queryForList(
                "select content from chat_messages where session_id = ? and role = 'ASSISTANT' order by id",
                String.class,
                sessionId);
    }

    private Long readSourceCount(Long sessionId) {
        return jdbcTemplate.queryForObject("""
                        select count(*)
                        from chat_message_sources source
                        join chat_messages message on message.id = source.message_id
                        where message.session_id = ?
                        """,
                Long.class,
                sessionId);
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

    private void cleanStage23ChatData() {
        jdbcTemplate.update("""
                delete from chat_message_sources
                where message_id in (
                    select message.id
                    from chat_messages message
                    join chat_sessions session on session.id = message.session_id
                    join users u on u.id = session.user_id
                    where u.username like 'stage23_chat_%'
                )
                """);
        jdbcTemplate.update("""
                delete from chat_messages
                where session_id in (
                    select session.id
                    from chat_sessions session
                    join users u on u.id = session.user_id
                    where u.username like 'stage23_chat_%'
                )
                """);
        jdbcTemplate.update("""
                delete from chat_sessions
                where user_id in (select id from users where username like 'stage23_chat_%')
                """);
        jdbcTemplate.update("""
                delete from knowledge_base_members
                where user_id in (select id from users where username like 'stage23_chat_%')
                   or knowledge_base_id in (
                       select kb.id
                       from knowledge_bases kb
                       join users u on u.id = kb.created_by
                       where u.username like 'stage23_chat_%'
                   )
                """);
        jdbcTemplate.update("""
                delete from knowledge_bases
                where created_by in (select id from users where username like 'stage23_chat_%')
                """);
        jdbcTemplate.update("""
                delete from user_model_settings
                where user_id in (select id from users where username like 'stage23_chat_%')
                """);
        jdbcTemplate.update("delete from users where username like 'stage23_chat_%'");
    }

    @FunctionalInterface
    private interface CheckedBooleanSupplier {
        boolean getAsBoolean() throws Exception;
    }

    private static class Stage23ChatModelServer implements AutoCloseable {
        private final HttpServer server;
        private volatile ResponsePlan responsePlan = exchange -> writeStreamingResponse(exchange, List.of("ok"));
        private volatile CountDownLatch requestFinished = new CountDownLatch(0);

        Stage23ChatModelServer() throws IOException {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/v1/chat/completions", this::handle);
            server.start();
        }

        String baseUrl() {
            return "http://127.0.0.1:" + server.getAddress().getPort();
        }

        CountDownLatch returnBlockingStreamingChat(String firstDelta, String lateDelta) {
            CountDownLatch releaseLateDeltas = new CountDownLatch(1);
            CountDownLatch finished = new CountDownLatch(1);
            requestFinished = finished;
            responsePlan = exchange -> {
                exchange.getResponseHeaders().add(HttpHeaders.CONTENT_TYPE, MediaType.TEXT_EVENT_STREAM_VALUE);
                exchange.sendResponseHeaders(200, 0);
                writeSseDelta(exchange, firstDelta);
                releaseLateDeltas.await(5, TimeUnit.SECONDS);
                writeSseDelta(exchange, lateDelta);
                writeSseDone(exchange);
                finished.countDown();
            };
            return releaseLateDeltas;
        }

        void returnStreamingChat(String... deltas) {
            CountDownLatch finished = new CountDownLatch(1);
            requestFinished = finished;
            responsePlan = exchange -> {
                writeStreamingResponse(exchange, List.of(deltas));
                finished.countDown();
            };
        }

        boolean awaitRequestFinished() throws InterruptedException {
            return requestFinished.await(8, TimeUnit.SECONDS);
        }

        private void handle(HttpExchange exchange) throws IOException {
            exchange.getRequestBody().readAllBytes();
            try {
                responsePlan.write(exchange);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                throw new IOException(exception);
            } finally {
                exchange.close();
            }
        }

        private static void writeStreamingResponse(HttpExchange exchange, List<String> deltas) throws IOException {
            exchange.getResponseHeaders().add(HttpHeaders.CONTENT_TYPE, MediaType.TEXT_EVENT_STREAM_VALUE);
            exchange.sendResponseHeaders(200, 0);
            for (String delta : deltas) {
                writeSseDelta(exchange, delta);
            }
            writeSseDone(exchange);
        }

        private static void writeSseDelta(HttpExchange exchange, String delta) throws IOException {
            exchange.getResponseBody().write("""
                    data: {"choices":[{"delta":{"content":"%s"}}]}

                    """.formatted(delta).getBytes(StandardCharsets.UTF_8));
            exchange.getResponseBody().flush();
        }

        private static void writeSseDone(HttpExchange exchange) throws IOException {
            exchange.getResponseBody().write("data: [DONE]\n\n".getBytes(StandardCharsets.UTF_8));
            exchange.getResponseBody().flush();
        }

        @Override
        public void close() {
            server.stop(0);
        }

        @FunctionalInterface
        private interface ResponsePlan {
            void write(HttpExchange exchange) throws IOException, InterruptedException;
        }
    }
}
