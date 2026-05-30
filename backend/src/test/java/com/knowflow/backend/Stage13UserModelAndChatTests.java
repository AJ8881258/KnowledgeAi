package com.knowflow.backend;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import com.knowflow.backend.settings.dto.request.UpdateModelSettingsRequest;
import com.knowflow.backend.config.AiProperties;
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
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.function.Predicate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(
        classes = KnowflowBackendApplication.class,
        properties = {
                "knowflow.ai.base-url=http://127.0.0.1:1/v1",
                "knowflow.ai.api-key=stage13-env-key",
                "knowflow.ai.model=stage13-env-model",
                "knowflow.model.secret-key=stage13-test-secret-key-with-32-bytes"
        }
)
@AutoConfigureMockMvc
class Stage13UserModelAndChatTests {
    private static final String MODEL_AUTH_FAILED_MESSAGE = "模型供应商鉴权失败，请检查 API Key 是否有效";
    private static final String MODEL_NOT_AVAILABLE_MESSAGE = "模型不存在或当前 API Key 无权访问该模型";
    private static final String MODEL_CALL_FAILED_MESSAGE = "AI model call failed";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AiProperties aiProperties;

    private Stage13ModelServer modelServer;
    private final String password = "stage13-password";
    private String originalAiBaseUrl;
    private String originalAiApiKey;
    private String originalAiModel;

    @BeforeEach
    void cleanBefore() throws Exception {
        originalAiBaseUrl = aiProperties.getBaseUrl();
        originalAiApiKey = aiProperties.getApiKey();
        originalAiModel = aiProperties.getModel();
        modelServer = new Stage13ModelServer();
        cleanStage13Data();
    }

    @AfterEach
    void cleanAfter() {
        aiProperties.setBaseUrl(originalAiBaseUrl);
        aiProperties.setApiKey(originalAiApiKey);
        aiProperties.setModel(originalAiModel);
        if (modelServer != null) {
            modelServer.close();
        }
        cleanStage13Data();
    }

    @Test
    void modelSettingsSaveReadPreserveAndReplaceApiKeyWithoutLeakingPlaintext() throws Exception {
        assertThat(Arrays.stream(UpdateModelSettingsRequest.class.getDeclaredFields()).map(field -> field.getName()))
                .doesNotContain("clearApiKey");

        createUser("stage13_model_owner");
        String token = loginAndGetToken("stage13_model_owner");

        mockMvc.perform(patch("/api/settings/model")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "baseUrl": "%s/v1",
                                  "apiKey": "stage13-user-secret-key",
                                  "model": "stage13-model-a",
                                  "timeoutSeconds": 42
                                }
                                """.formatted(modelServer.baseUrl())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.configured").value(true))
                .andExpect(jsonPath("$.model").value("stage13-model-a"))
                .andExpect(jsonPath("$.baseUrl").value(modelServer.baseUrl() + "/v1"))
                .andExpect(jsonPath("$.baseUrlConfigured").value(true))
                .andExpect(jsonPath("$.apiKeyConfigured").value(true))
                .andExpect(jsonPath("$.timeoutSeconds").value(42))
                .andExpect(jsonPath("$.mode").doesNotExist())
                .andExpect(jsonPath("$.editable").doesNotExist())
                .andExpect(jsonPath("$.apiKey").doesNotExist())
                .andExpect(jsonPath("$.encryptedApiKey").doesNotExist())
                .andExpect(content().string(not(containsString("stage13-user-secret-key"))));

        String encryptedApiKey = readEncryptedApiKey("stage13_model_owner");
        assertThat(encryptedApiKey).isNotBlank();
        assertThat(encryptedApiKey).doesNotContain("stage13-user-secret-key");

        mockMvc.perform(patch("/api/settings/model")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "baseUrl": "%s/v1",
                                  "model": "stage13-model-b",
                                  "timeoutSeconds": 50
                                }
                                """.formatted(modelServer.baseUrl())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.configured").value(true))
                .andExpect(jsonPath("$.model").value("stage13-model-b"))
                .andExpect(jsonPath("$.baseUrl").value(modelServer.baseUrl() + "/v1"))
                .andExpect(jsonPath("$.apiKeyConfigured").value(true));

        assertThat(readEncryptedApiKey("stage13_model_owner")).isEqualTo(encryptedApiKey);

        modelServer.returnModels("stage13-model-b");
        mockMvc.perform(post("/api/settings/model/models")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.models[0].id").value("stage13-model-b"));
        assertThat(modelServer.authorizationHeaders()).contains("Bearer stage13-user-secret-key");

        mockMvc.perform(patch("/api/settings/model")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "baseUrl": "%s/v1",
                                  "apiKey": "stage13-user-replacement-key",
                                  "model": "stage13-model-c",
                                  "timeoutSeconds": 55
                                }
                                """.formatted(modelServer.baseUrl())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.configured").value(true))
                .andExpect(jsonPath("$.model").value("stage13-model-c"))
                .andExpect(jsonPath("$.apiKeyConfigured").value(true))
                .andExpect(content().string(not(containsString("stage13-user-replacement-key"))));

        String replacedEncryptedApiKey = readEncryptedApiKey("stage13_model_owner");
        assertThat(replacedEncryptedApiKey).isNotBlank();
        assertThat(replacedEncryptedApiKey).isNotEqualTo(encryptedApiKey);
        assertThat(replacedEncryptedApiKey).doesNotContain("stage13-user-replacement-key");

        modelServer.returnModels("stage13-model-c");
        mockMvc.perform(post("/api/settings/model/models")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.models[0].id").value("stage13-model-c"))
                .andExpect(content().string(not(containsString("stage13-user-replacement-key"))));
        assertThat(modelServer.authorizationHeaders()).contains("Bearer stage13-user-replacement-key");
    }

    @Test
    void fetchModelsUsesSubmittedCredentialsAndSanitizesProviderFailures() throws Exception {
        createUser("stage13_model_fetch");
        String token = loginAndGetToken("stage13_model_fetch");
        modelServer.returnModels("stage13-dynamic-model");

        mockMvc.perform(post("/api/settings/model/models")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "baseUrl": "%s/v1",
                                  "apiKey": "stage13-list-key"
                                }
                                """.formatted(modelServer.baseUrl())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.models[0].id").value("stage13-dynamic-model"))
                .andExpect(jsonPath("$.models[0].name").value("stage13-dynamic-model"))
                .andExpect(content().string(not(containsString("stage13-list-key"))));

        assertThat(modelServer.authorizationHeaders()).contains("Bearer stage13-list-key");

        modelServer.returnSensitiveFailure("provider failed with stage13-list-key and Authorization header");

        mockMvc.perform(post("/api/settings/model/models")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "baseUrl": "%s/v1",
                                  "apiKey": "stage13-list-key"
                                }
                                """.formatted(modelServer.baseUrl())))
                .andExpect(status().isInternalServerError())
                .andExpect(content().string(not(containsString("stage13-list-key"))))
                .andExpect(content().string(not(containsString("Authorization"))))
                .andExpect(content().string(not(containsString(modelServer.baseUrl()))));
    }

    @Test
    void fetchModelsCanReuseSavedBaseUrlAndApiKeyWithoutReturningKeyToFrontend() throws Exception {
        createUser("stage13_model_reuse");
        String token = loginAndGetToken("stage13_model_reuse");
        saveModelSettings(token, "stage13-reused-key", "stage13-reused-model");
        modelServer.returnModels("stage13-reused-model");

        mockMvc.perform(get("/api/settings/model")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.baseUrl").value(modelServer.baseUrl() + "/v1"))
                .andExpect(jsonPath("$.apiKeyConfigured").value(true))
                .andExpect(jsonPath("$.apiKey").doesNotExist())
                .andExpect(jsonPath("$.encryptedApiKey").doesNotExist())
                .andExpect(content().string(not(containsString("stage13-reused-key"))));

        mockMvc.perform(post("/api/settings/model/models")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.models[0].id").value("stage13-reused-model"))
                .andExpect(content().string(not(containsString("stage13-reused-key"))));

        assertThat(modelServer.authorizationHeaders()).contains("Bearer stage13-reused-key");
    }

    @Test
    void savedApiKeyDecryptFailureReturnsActionableSanitizedMessage() throws Exception {
        createUser("stage13_model_stale_key");
        String token = loginAndGetToken("stage13_model_stale_key");
        saveModelSettings(token, "stage13-stale-key", "stage13-stale-model");
        corruptSavedApiKey("stage13_model_stale_key");

        mockMvc.perform(post("/api/settings/model/models")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(containsString("已保存的 API Key 无法解密，请重新填写 API Key 后保存覆盖")))
                .andExpect(content().string(not(containsString("stage13-stale-key"))))
                .andExpect(content().string(not(containsString("encrypted"))))
                .andExpect(content().string(not(containsString("Authorization"))));
    }

    @Test
    void fetchModelsCanUseSubmittedBaseUrlWithSavedApiKeyAndRejectMissingCredentials() throws Exception {
        createUser("stage13_model_reuse_partial");
        String token = loginAndGetToken("stage13_model_reuse_partial");
        saveModelSettings(token, "stage13-partial-key", "stage13-partial-model");
        modelServer.returnModels("stage13-partial-model");

        mockMvc.perform(post("/api/settings/model/models")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "baseUrl": "%s/v1"
                                }
                                """.formatted(modelServer.baseUrl())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.models[0].id").value("stage13-partial-model"))
                .andExpect(content().string(not(containsString("stage13-partial-key"))));

        assertThat(modelServer.authorizationHeaders()).contains("Bearer stage13-partial-key");

        createUser("stage13_model_reuse_missing");
        String missingToken = loginAndGetToken("stage13_model_reuse_missing");
        mockMvc.perform(post("/api/settings/model/models")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + missingToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(not(containsString("Authorization"))))
                .andExpect(content().string(not(containsString("stage13-partial-key"))));
    }

    @Test
    void modelConnectionTestUsesSavedChatCredentialsWithoutLeakingSecrets() throws Exception {
        modelServer.returnChatCompletion("stage13 connection ok");
        createUser("stage13_model_test_owner");
        String token = loginAndGetToken("stage13_model_test_owner");
        saveModelSettings(token, "stage13-connection-key", "stage13-connection-model");

        mockMvc.perform(post("/api/settings/model/test")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("模型连接测试成功"))
                .andExpect(content().string(not(containsString("stage13-connection-key"))))
                .andExpect(content().string(not(containsString("stage13-connection-model"))))
                .andExpect(content().string(not(containsString("Authorization"))));

        assertThat(modelServer.authorizationHeaders()).contains("Bearer stage13-connection-key");
    }

    @Test
    void modelConnectionTestReturnsReadableSanitizedProviderFailures() throws Exception {
        createUser("stage13_model_test_failure");
        String token = loginAndGetToken("stage13_model_test_failure");
        saveModelSettings(token, "stage13-test-failure-key", "stage13-test-failure-model");

        modelServer.returnSensitiveFailure(
                401,
                "provider leaked stage13-test-failure-key Authorization http://provider.example/v1 stage13-test-failure-model");

        mockMvc.perform(post("/api/settings/model/test")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value(MODEL_AUTH_FAILED_MESSAGE))
                .andExpect(content().string(not(containsString("stage13-test-failure-key"))))
                .andExpect(content().string(not(containsString("Authorization"))))
                .andExpect(content().string(not(containsString("provider.example"))))
                .andExpect(content().string(not(containsString("stage13-test-failure-model"))));

        assertThat(modelServer.authorizationHeaders()).contains("Bearer stage13-test-failure-key");
    }

    @Test
    void preferencesCanBeSavedAndReadPerCurrentUser() throws Exception {
        createUser("stage13_pref_owner");
        createUser("stage13_pref_other");
        String ownerToken = loginAndGetToken("stage13_pref_owner");
        String otherToken = loginAndGetToken("stage13_pref_other");

        mockMvc.perform(get("/api/settings/preferences")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.language").value("zh-CN"))
                .andExpect(jsonPath("$.timezone").isNotEmpty());

        mockMvc.perform(patch("/api/settings/preferences")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "language": "en-US",
                                  "timezone": "America/New_York"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.language").value("en-US"))
                .andExpect(jsonPath("$.timezone").value("America/New_York"));

        mockMvc.perform(get("/api/settings/preferences")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.language").value("en-US"))
                .andExpect(jsonPath("$.timezone").value("America/New_York"));

        mockMvc.perform(get("/api/settings/preferences")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + otherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.language").value("zh-CN"))
                .andExpect(jsonPath("$.timezone").isNotEmpty());
    }

    @Test
    void chatUsesCurrentUsersSavedModelSettingsWithoutCrossUserApiKeyReuse() throws Exception {
        modelServer.returnChatCompletion("stage13 model answer");
        Long userAId = createUser("stage13_model_user_a");
        Long userBId = createUser("stage13_model_user_b");
        String userAToken = loginAndGetToken("stage13_model_user_a");
        String userBToken = loginAndGetToken("stage13_model_user_b");

        saveModelSettings(userAToken, "stage13-user-a-key", "stage13-user-a-model");
        saveModelSettings(userBToken, "stage13-user-b-key", "stage13-user-b-model");

        Long knowledgeBaseAId = createKnowledgeBase(userAId, "Stage13 Model A KB");
        Long knowledgeBaseBId = createKnowledgeBase(userBId, "Stage13 Model B KB");
        createMembership(knowledgeBaseAId, userAId, "OWNER");
        createMembership(knowledgeBaseBId, userBId, "OWNER");
        createIndexedChunk(userAId, knowledgeBaseAId, "stage13 model a retrieval marker");
        createIndexedChunk(userBId, knowledgeBaseBId, "stage13 model b retrieval marker");
        Long sessionAId = createSession(knowledgeBaseAId, userAToken, "Model A session");
        Long sessionBId = createSession(knowledgeBaseBId, userBToken, "Model B session");

        sendAsyncMessage(userAToken, sessionAId, "stage13 model a retrieval");
        sendAsyncMessage(userBToken, sessionBId, "stage13 model b retrieval");

        waitUntil(() -> modelServer.authorizationHeaders().contains("Bearer stage13-user-a-key")
                && modelServer.authorizationHeaders().contains("Bearer stage13-user-b-key"));

        waitForAssistantMessage(userAToken, sessionAId);
        waitForAssistantMessage(userBToken, sessionBId);
    }

    @Test
    void chatRequestModelOverridesThisGenerationAndSyncsCurrentUserSettingsOnly() throws Exception {
        modelServer.returnChatCompletion("stage13 requested model answer");
        Long userAId = createUser("stage13_request_model_a");
        Long userBId = createUser("stage13_request_model_b");
        String userAToken = loginAndGetToken("stage13_request_model_a");
        String userBToken = loginAndGetToken("stage13_request_model_b");

        saveModelSettings(userAToken, "stage13-request-model-a-key", "stage13-original-model-a");
        saveModelSettings(userBToken, "stage13-request-model-b-key", "stage13-original-model-b");

        Long knowledgeBaseId = createKnowledgeBase(userAId, "Stage13 Request Model KB");
        createMembership(knowledgeBaseId, userAId, "OWNER");
        Long sessionId = createSession(knowledgeBaseId, userAToken, "Request model session");

        mockMvc.perform(post("/api/chat/sessions/{sessionId}/messages", sessionId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "content": "使用这次选择的模型",
                                  "limit": 5,
                                  "model": "stage13-requested-model-a"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.session.status").value("GENERATING"));

        waitForSessionStatus(userAToken, knowledgeBaseId, sessionId, "IDLE");
        waitForAssistantMessage(userAToken, sessionId);

        assertThat(modelServer.requestBodies()).anySatisfy(body ->
                assertThat(body).contains("\"model\":\"stage13-requested-model-a\""));
        assertThat(readSavedModel("stage13_request_model_a")).isEqualTo("stage13-requested-model-a");
        assertThat(readSavedModel("stage13_request_model_b")).isEqualTo("stage13-original-model-b");
        assertThat(modelServer.authorizationHeaders()).contains("Bearer stage13-request-model-a-key");
        assertThat(modelServer.authorizationHeaders()).doesNotContain("Bearer stage13-request-model-b-key");
    }

    @Test
    void chatCanUseEnvironmentFallbackWhenUserHasNoModelSettings() throws Exception {
        modelServer.returnChatCompletion("stage14 environment fallback answer");
        aiProperties.setBaseUrl(modelServer.baseUrl() + "/v1");
        aiProperties.setApiKey("stage14-env-chat-key");
        aiProperties.setModel("stage14-env-chat-model");

        Long userId = createUser("stage13_env_fallback_owner");
        String token = loginAndGetToken("stage13_env_fallback_owner");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage14 Env Fallback KB");
        createMembership(knowledgeBaseId, userId, "OWNER");
        Long sessionId = createSession(knowledgeBaseId, token, "Env fallback session");

        sendAsyncMessage(token, sessionId, "env fallback question");

        waitForSessionStatus(token, knowledgeBaseId, sessionId, "IDLE");
        JsonNode assistantMessage = waitForAssistantMessage(token, sessionId);
        assertThat(assistantMessage.get("content").asText()).isEqualTo("stage14 environment fallback answer");
        assertThat(userModelSettingsCount("stage13_env_fallback_owner")).isZero();
        assertThat(modelServer.authorizationHeaders()).contains("Bearer stage14-env-chat-key");
        assertThat(modelServer.requestBodies()).anySatisfy(body ->
                assertThat(body).contains("\"model\":\"stage14-env-chat-model\""));
    }

    @Test
    void chatRequestModelWithEnvironmentFallbackDoesNotRequireOrCreateUserSettings() throws Exception {
        modelServer.returnChatCompletion("stage14 requested environment model answer");
        aiProperties.setBaseUrl(modelServer.baseUrl() + "/v1");
        aiProperties.setApiKey("stage14-env-request-key");
        aiProperties.setModel("stage14-env-original-model");

        Long userId = createUser("stage13_env_request_model_owner");
        String token = loginAndGetToken("stage13_env_request_model_owner");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage14 Env Request Model KB");
        createMembership(knowledgeBaseId, userId, "OWNER");
        Long sessionId = createSession(knowledgeBaseId, token, "Env request model session");

        mockMvc.perform(post("/api/chat/sessions/{sessionId}/messages", sessionId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "content": "use requested model without saved settings",
                                  "limit": 5,
                                  "model": "stage14-env-requested-model"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.session.status").value("GENERATING"));

        waitForSessionStatus(token, knowledgeBaseId, sessionId, "IDLE");
        JsonNode assistantMessage = waitForAssistantMessage(token, sessionId);
        assertThat(assistantMessage.get("content").asText()).isEqualTo("stage14 requested environment model answer");
        assertThat(userModelSettingsCount("stage13_env_request_model_owner")).isZero();
        assertThat(modelServer.authorizationHeaders()).contains("Bearer stage14-env-request-key");
        assertThat(modelServer.requestBodies()).anySatisfy(body ->
                assertThat(body).contains("\"model\":\"stage14-env-requested-model\""));
    }

    @Test
    void chatRequestModelCanCompleteWhenEnvironmentFallbackModelIsBlank() throws Exception {
        modelServer.returnChatCompletion("stage14 request model fills blank env model answer");
        aiProperties.setBaseUrl(modelServer.baseUrl() + "/v1");
        aiProperties.setApiKey("stage14-env-blank-model-key");
        aiProperties.setModel("");

        Long userId = createUser("stage13_env_blank_model_owner");
        String token = loginAndGetToken("stage13_env_blank_model_owner");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage14 Env Blank Model KB");
        createMembership(knowledgeBaseId, userId, "OWNER");
        Long sessionId = createSession(knowledgeBaseId, token, "Env blank model session");

        mockMvc.perform(post("/api/chat/sessions/{sessionId}/messages", sessionId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "content": "use request model with blank env model",
                                  "limit": 5,
                                  "model": "stage14-request-model-from-chat"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.session.status").value("GENERATING"));

        waitForSessionStatus(token, knowledgeBaseId, sessionId, "IDLE");
        JsonNode assistantMessage = waitForAssistantMessage(token, sessionId);
        assertThat(assistantMessage.get("content").asText()).isEqualTo("stage14 request model fills blank env model answer");
        assertThat(userModelSettingsCount("stage13_env_blank_model_owner")).isZero();
        assertThat(modelServer.authorizationHeaders()).contains("Bearer stage14-env-blank-model-key");
        assertThat(modelServer.requestBodies()).anySatisfy(body ->
                assertThat(body).contains("\"model\":\"stage14-request-model-from-chat\""));
    }

    @Test
    void chatParsesJsonModelResponseEvenWhenContentTypeIsTextPlain() throws Exception {
        modelServer.returnChatCompletionWithContentType("stage14 text content type answer", MediaType.TEXT_PLAIN_VALUE);
        aiProperties.setBaseUrl(modelServer.baseUrl() + "/v1");
        aiProperties.setApiKey("stage14-text-content-type-key");
        aiProperties.setModel("stage14-text-content-type-model");

        Long userId = createUser("stage13_text_content_type_owner");
        String token = loginAndGetToken("stage13_text_content_type_owner");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage14 Text Content Type KB");
        createMembership(knowledgeBaseId, userId, "OWNER");
        Long sessionId = createSession(knowledgeBaseId, token, "Text content type session");

        sendAsyncMessage(token, sessionId, "text content type question");

        waitForSessionStatus(token, knowledgeBaseId, sessionId, "IDLE");
        JsonNode assistantMessage = waitForAssistantMessage(token, sessionId);
        assertThat(assistantMessage.get("content").asText()).isEqualTo("stage14 text content type answer");
        assertThat(modelServer.authorizationHeaders()).contains("Bearer stage14-text-content-type-key");
    }

    @Test
    void ragDisabledSkipsChunkContextAndSavesAssistantWithoutSources() throws Exception {
        modelServer.returnChatCompletion("stage14 no rag answer");
        Long userId = createUser("stage13_rag_disabled_owner");
        String token = loginAndGetToken("stage13_rag_disabled_owner");
        saveModelSettings(token, "stage14-rag-disabled-key", "stage14-rag-disabled-model");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage14 RAG Disabled KB");
        createMembership(knowledgeBaseId, userId, "OWNER");
        createIndexedChunk(userId, knowledgeBaseId, "stage14 disabled rag marker must not enter prompt");
        Long sessionId = createSession(knowledgeBaseId, token, "RAG disabled session");

        mockMvc.perform(post("/api/chat/sessions/{sessionId}/messages", sessionId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "content": "stage14 disabled rag marker",
                                  "limit": 5,
                                  "ragEnabled": false
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.session.status").value("GENERATING"));

        waitForSessionStatus(token, knowledgeBaseId, sessionId, "IDLE");
        JsonNode assistantMessage = waitForAssistantMessage(token, sessionId);
        assertThat(assistantMessage.get("content").asText()).isEqualTo("stage14 no rag answer");
        assertThat(assistantMessage.get("sources").size()).isZero();
        assertThat(modelServer.requestBodies()).anySatisfy(body -> {
            assertThat(body).contains("stage14 disabled rag marker");
            assertThat(body).doesNotContain("stage14 disabled rag marker must not enter prompt");
        });
    }

    @Test
    void cancelGeneratingSessionReturnsToIdleAndPreventsLateAssistantWrite() throws Exception {
        CountDownLatch releaseModelResponse = modelServer.returnDelayedChatCompletion("stage14 late answer");
        Long userId = createUser("stage13_cancel_owner");
        String token = loginAndGetToken("stage13_cancel_owner");
        saveModelSettings(token, "stage14-cancel-key", "stage14-cancel-model");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage14 Cancel KB");
        createMembership(knowledgeBaseId, userId, "OWNER");
        createIndexedChunk(userId, knowledgeBaseId, "stage14 cancel retrieval marker");
        Long sessionId = createSession(knowledgeBaseId, token, "Cancel session");

        sendAsyncMessage(token, sessionId, "stage14 cancel retrieval");
        waitUntil(() -> modelServer.authorizationHeaders().contains("Bearer stage14-cancel-key"));

        mockMvc.perform(post("/api/chat/sessions/{sessionId}/cancel", sessionId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IDLE"));

        assertThat(readSessionStatus(sessionId)).isEqualTo("IDLE");
        assertThat(readAssistantMessageCount(sessionId)).isZero();

        releaseModelResponse.countDown();
        Thread.sleep(500);

        assertThat(readSessionStatus(sessionId)).isEqualTo("IDLE");
        assertThat(readAssistantMessageCount(sessionId)).isZero();
        assertThat(readSourceCount(sessionId)).isZero();
        assertThat(readMessages(token, sessionId))
                .filteredOn(message -> "USER".equals(message.get("role").asText()))
                .hasSize(1);
    }

    @Test
    void sessionUnreadStatusAndAsyncEmptyRetrievalFlowWorkTogether() throws Exception {
        modelServer.returnChatCompletion("stage13 empty retrieval model answer");
        Long userId = createUser("stage13_async_owner");
        String token = loginAndGetToken("stage13_async_owner");
        saveModelSettings(token, "stage13-empty-key", "stage13-empty-model");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage13 Async KB");
        createMembership(knowledgeBaseId, userId, "OWNER");
        Long sessionId = createSession(knowledgeBaseId, token, "Async session");

        mockMvc.perform(patch("/api/chat/sessions/{sessionId}", sessionId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "unread": true
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unread").value(true));

        mockMvc.perform(get("/api/chat/sessions/{sessionId}/messages", sessionId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/knowledge-bases/{knowledgeBaseId}/chat/sessions", knowledgeBaseId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].unread").value(false));

        mockMvc.perform(post("/api/chat/sessions/{sessionId}/messages", sessionId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "content": "你好",
                                  "limit": 5
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userMessage.role").value("USER"))
                .andExpect(jsonPath("$.session.status").value("GENERATING"))
                .andExpect(jsonPath("$.message").doesNotExist());

        waitForSessionStatus(token, knowledgeBaseId, sessionId, "IDLE");
        JsonNode assistantMessage = waitForAssistantMessage(token, sessionId);
        assertThat(assistantMessage.get("content").asText()).isEqualTo("stage13 empty retrieval model answer");
        assertThat(assistantMessage.get("sources").size()).isZero();
        assertThat(modelServer.requestBodies()).anySatisfy(body ->
                assertThat(body).contains("当前没有可引用的知识库片段"));
        assertThat(modelServer.authorizationHeaders()).contains("Bearer stage13-empty-key");
    }

    @Test
    void generationFailureMarksSessionUnreadIndependentlyFromFailedStatus() throws Exception {
        modelServer.returnSensitiveFailure("provider leaked stage13-unread-failure-key Authorization stage13-unread-failure-model");
        Long userId = createUser("stage13_unread_failure_owner");
        String token = loginAndGetToken("stage13_unread_failure_owner");
        saveModelSettings(token, "stage13-unread-failure-key", "stage13-unread-failure-model");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage13 Unread Failure KB");
        createMembership(knowledgeBaseId, userId, "OWNER");
        Long sessionId = createSession(knowledgeBaseId, token, "Unread failure session");

        mockMvc.perform(patch("/api/chat/sessions/{sessionId}", sessionId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "unread": false
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unread").value(false));

        sendAsyncMessage(token, sessionId, "触发失败");

        waitForSessionStatus(token, knowledgeBaseId, sessionId, "FAILED");
        JsonNode failedSession = readSessions(token, knowledgeBaseId).stream()
                .filter(session -> session.get("id").asLong() == sessionId)
                .findFirst()
                .orElseThrow();

        assertThat(failedSession.get("status").asText()).isEqualTo("FAILED");
        assertThat(failedSession.get("unread").asBoolean()).isTrue();
        assertThat(readUnread(sessionId)).isTrue();
    }

    @Test
    void fullChatCompletionsBaseUrlIsNormalizedBeforeSavingAndChatting() throws Exception {
        modelServer.returnChatCompletion("stage13 normalized base url answer");
        Long userId = createUser("stage13_full_endpoint_owner");
        String token = loginAndGetToken("stage13_full_endpoint_owner");

        mockMvc.perform(patch("/api/settings/model")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "baseUrl": "%s/v1/chat/completions",
                                  "apiKey": "stage13-full-endpoint-key",
                                  "model": "stage13-full-endpoint-model",
                                  "timeoutSeconds": 10
                                }
                                """.formatted(modelServer.baseUrl())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.baseUrl").value(modelServer.baseUrl() + "/v1"))
                .andExpect(content().string(not(containsString("stage13-full-endpoint-key"))));

        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage13 Full Endpoint KB");
        createMembership(knowledgeBaseId, userId, "OWNER");
        Long sessionId = createSession(knowledgeBaseId, token, "Full endpoint session");

        sendAsyncMessage(token, sessionId, "你好");

        waitForSessionStatus(token, knowledgeBaseId, sessionId, "IDLE");
        JsonNode assistantMessage = waitForAssistantMessage(token, sessionId);
        assertThat(assistantMessage.get("content").asText()).isEqualTo("stage13 normalized base url answer");
        assertThat(assistantMessage.get("sources").size()).isZero();
        assertThat(modelServer.authorizationHeaders()).contains("Bearer stage13-full-endpoint-key");
    }

    @Test
    void modelSettingsRejectsBaseUrlWithoutOpenAiVersionRoot() throws Exception {
        createUser("stage13_invalid_base_url_owner");
        String token = loginAndGetToken("stage13_invalid_base_url_owner");

        mockMvc.perform(patch("/api/settings/model")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "baseUrl": "%s",
                                  "apiKey": "stage13-invalid-base-key",
                                  "model": "stage13-invalid-base-model",
                                  "timeoutSeconds": 10
                                }
                                """.formatted(modelServer.baseUrl())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("baseUrl must be an OpenAI-compatible root ending with /v1"))
                .andExpect(content().string(not(containsString("stage13-invalid-base-key"))))
                .andExpect(content().string(not(containsString(modelServer.baseUrl()))))
                .andExpect(content().string(not(containsString("Authorization"))));
    }

    @Test
    void usageTodayCountsOnlyCurrentUsersUserMessagesInRequestedTimezone() throws Exception {
        Long currentUserId = createUser("stage13_usage_owner");
        Long otherUserId = createUser("stage13_usage_other");
        String token = loginAndGetToken("stage13_usage_owner");
        Long currentKnowledgeBaseId = createKnowledgeBase(currentUserId, "Stage13 Usage KB");
        Long otherKnowledgeBaseId = createKnowledgeBase(otherUserId, "Stage13 Other Usage KB");
        Long currentSessionId = createChatSession(currentUserId, currentKnowledgeBaseId, "Usage session");
        Long otherSessionId = createChatSession(otherUserId, otherKnowledgeBaseId, "Other usage session");
        ZoneId zone = ZoneId.of("Asia/Shanghai");
        OffsetDateTime todayStart = LocalDate.now(zone).atStartOfDay(zone).toOffsetDateTime();

        createChatMessage(currentSessionId, "USER", "counted one", todayStart.plusHours(1));
        createChatMessage(currentSessionId, "USER", "counted two", todayStart.plusHours(2));
        createChatMessage(currentSessionId, "ASSISTANT", "not counted assistant", todayStart.plusHours(3));
        createChatMessage(currentSessionId, "USER", "outside day", todayStart.minusMinutes(1));
        createChatMessage(otherSessionId, "USER", "other user not counted", todayStart.plusHours(4));

        mockMvc.perform(get("/api/chat/usage/today")
                        .queryParam("timezone", "Asia/Shanghai")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.timezone").value("Asia/Shanghai"))
                .andExpect(jsonPath("$.date").value(LocalDate.now(zone).toString()))
                .andExpect(jsonPath("$.messageCount").value(2));
    }

    @Test
    void modelFailureMarksSessionFailedAndStoresOnlySanitizedError() throws Exception {
        modelServer.returnSensitiveFailure("provider leaked stage13-failure-key Authorization http://leaky.example/v1 stage13-failure-model");
        Long userId = createUser("stage13_failure_owner");
        String token = loginAndGetToken("stage13_failure_owner");
        saveModelSettings(token, "stage13-failure-key", "stage13-failure-model");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage13 Failure KB");
        createMembership(knowledgeBaseId, userId, "OWNER");
        createIndexedChunk(userId, knowledgeBaseId, "stage13 failure retrieval marker");
        Long sessionId = createSession(knowledgeBaseId, token, "Failure session");

        sendAsyncMessage(token, sessionId, "stage13 failure retrieval");

        waitForSessionStatus(token, knowledgeBaseId, sessionId, "FAILED");
        JsonNode failedSession = readSessions(token, knowledgeBaseId).stream()
                .filter(session -> session.get("id").asLong() == sessionId)
                .findFirst()
                .orElseThrow();

        assertThat(failedSession.get("status").asText()).isEqualTo("FAILED");
        assertThat(failedSession.get("lastErrorMessage").asText()).isEqualTo(MODEL_CALL_FAILED_MESSAGE);
        assertThat(failedSession.toString())
                .doesNotContain("stage13-failure-key", "Authorization", "leaky.example", "stage13-failure-model");
        assertThat(readLastErrorMessage(sessionId)).isEqualTo(MODEL_CALL_FAILED_MESSAGE);
        assertThat(readLastErrorMessage(sessionId))
                .doesNotContain("stage13-failure-key", "Authorization", "leaky.example", "stage13-failure-model");
        assertThat(readMessages(token, sessionId))
                .filteredOn(message -> "ASSISTANT".equals(message.get("role").asText()))
                .isEmpty();
    }

    @Test
    void providerHttpFailuresAreVisibleOnSessionWithSanitizedError() throws Exception {
        int[] providerStatuses = {401, 404, 500};

        for (int providerStatus : providerStatuses) {
            Long userId = createUser("stage13_provider_failure_" + providerStatus);
            String token = loginAndGetToken("stage13_provider_failure_" + providerStatus);
            saveModelSettings(token, "stage13-provider-key-" + providerStatus, "stage13-provider-model-" + providerStatus);
            Long knowledgeBaseId = createKnowledgeBase(userId, "Stage13 Provider Failure KB " + providerStatus);
            createMembership(knowledgeBaseId, userId, "OWNER");
            Long sessionId = createSession(knowledgeBaseId, token, "Provider failure session " + providerStatus);

            modelServer.returnSensitiveFailure(
                    providerStatus,
                    "provider leaked stage13-provider-key-" + providerStatus
                            + " Authorization http://provider.example/v1 stage13-provider-model-" + providerStatus);

            sendAsyncMessage(token, sessionId, "你好");

            waitForSessionStatus(token, knowledgeBaseId, sessionId, "FAILED");
            JsonNode failedSession = readSessions(token, knowledgeBaseId).stream()
                    .filter(session -> session.get("id").asLong() == sessionId)
                    .findFirst()
                    .orElseThrow();

            assertThat(failedSession.get("status").asText()).isEqualTo("FAILED");
            assertThat(failedSession.get("lastErrorMessage").asText()).isEqualTo(expectedProviderMessage(providerStatus));
            assertThat(failedSession.toString())
                    .doesNotContain("stage13-provider-key-" + providerStatus)
                    .doesNotContain("Authorization")
                    .doesNotContain("provider.example")
                    .doesNotContain("stage13-provider-model-" + providerStatus);
            assertThat(readLastErrorMessage(sessionId)).isEqualTo(expectedProviderMessage(providerStatus));
            assertThat(modelServer.authorizationHeaders()).contains("Bearer stage13-provider-key-" + providerStatus);
            assertThat(readMessages(token, sessionId))
                    .filteredOn(message -> "ASSISTANT".equals(message.get("role").asText()))
                    .isEmpty();
        }
    }

    private String expectedProviderMessage(int providerStatus) {
        return switch (providerStatus) {
            case 401, 403 -> MODEL_AUTH_FAILED_MESSAGE;
            case 404 -> MODEL_NOT_AVAILABLE_MESSAGE;
            default -> MODEL_CALL_FAILED_MESSAGE;
        };
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
                                  "timeoutSeconds": 10
                                }
                                """.formatted(modelServer.baseUrl(), apiKey, model)))
                .andExpect(status().isOk());
    }

    private void sendAsyncMessage(String token, Long sessionId, String content) throws Exception {
        mockMvc.perform(post("/api/chat/sessions/{sessionId}/messages", sessionId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "content": "%s",
                                  "limit": 5
                                }
                                """.formatted(content)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.session.status").value("GENERATING"));
    }

    private void waitForSessionStatus(String token, Long knowledgeBaseId, Long sessionId, String status) throws Exception {
        waitUntil(() -> readSessions(token, knowledgeBaseId)
                .stream()
                .anyMatch(session -> session.get("id").asLong() == sessionId
                        && status.equals(session.get("status").asText())));
    }

    private JsonNode waitForAssistantMessage(String token, Long sessionId) throws Exception {
        final JsonNode[] found = new JsonNode[1];
        waitUntil(() -> readMessages(token, sessionId)
                .stream()
                .filter(message -> "ASSISTANT".equals(message.get("role").asText()))
                .findFirst()
                .map(message -> {
                    found[0] = message;
                    return true;
                })
                .orElse(false));
        return found[0];
    }

    private List<JsonNode> readSessions(String token, Long knowledgeBaseId) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/knowledge-bases/{knowledgeBaseId}/chat/sessions", knowledgeBaseId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        List<JsonNode> sessions = new ArrayList<>();
        for (JsonNode session : objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8))) {
            sessions.add(session);
        }
        return sessions;
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

    private String readLastErrorMessage(Long sessionId) {
        return jdbcTemplate.queryForObject(
                "select last_error_message from chat_sessions where id = ?",
                String.class,
                sessionId);
    }

    private void waitUntil(CheckedBooleanSupplier condition) throws Exception {
        long deadline = System.nanoTime() + 5_000_000_000L;
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
        throw new AssertionError("Condition was not met before timeout");
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
                        values (?, 'stage13 test', 'ACTIVE', false, 'blue', ?)
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

    private void createIndexedChunk(Long userId, Long knowledgeBaseId, String content) {
        Long documentId = jdbcTemplate.queryForObject("""
                        insert into documents (
                            knowledge_base_id,
                            original_filename,
                            content_type,
                            size_bytes,
                            status,
                            error_message,
                            created_by
                        )
                        values (?, 'stage13.md', 'text/markdown', 100, 'INDEXED', null, ?)
                        returning id
                        """,
                Long.class,
                knowledgeBaseId,
                userId);

        jdbcTemplate.update("""
                        insert into document_chunks (
                            document_id,
                            knowledge_base_id,
                            chunk_index,
                            content,
                            char_count
                        )
                        values (?, ?, 0, ?, ?)
                        """,
                documentId,
                knowledgeBaseId,
                content,
                content.length());
    }

    private Long createChatMessage(Long sessionId, String role, String content, OffsetDateTime createdAt) {
        return jdbcTemplate.queryForObject("""
                        insert into chat_messages (session_id, role, content, created_at)
                        values (?, ?, ?, ?)
                        returning id
                        """,
                Long.class,
                sessionId,
                role,
                content,
                createdAt);
    }

    private String readEncryptedApiKey(String username) {
        if (!tableExists("user_model_settings")) {
            return null;
        }
        Long userId = jdbcTemplate.queryForObject("select id from users where username = ?", Long.class, username);
        return jdbcTemplate.queryForObject("""
                        select encrypted_api_key
                        from user_model_settings
                        where user_id = ?
                        """,
                String.class,
                userId);
    }

    private void corruptSavedApiKey(String username) {
        Long userId = jdbcTemplate.queryForObject("select id from users where username = ?", Long.class, username);
        jdbcTemplate.update("""
                        update user_model_settings
                        set encrypted_api_key = 'stale.iv-and-ciphertext'
                        where user_id = ?
                        """,
                userId);
    }

    private String readSavedModel(String username) {
        Long userId = jdbcTemplate.queryForObject("select id from users where username = ?", Long.class, username);
        return jdbcTemplate.queryForObject("""
                        select model
                        from user_model_settings
                        where user_id = ?
                        """,
                String.class,
                userId);
    }

    private Boolean readUnread(Long sessionId) {
        return jdbcTemplate.queryForObject(
                "select unread from chat_sessions where id = ?",
                Boolean.class,
                sessionId);
    }

    private String readSessionStatus(Long sessionId) {
        return jdbcTemplate.queryForObject(
                "select status from chat_sessions where id = ?",
                String.class,
                sessionId);
    }

    private Long readAssistantMessageCount(Long sessionId) {
        return jdbcTemplate.queryForObject(
                "select count(*) from chat_messages where session_id = ? and role = 'ASSISTANT'",
                Long.class,
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

    private Long userModelSettingsCount(String username) {
        Long userId = jdbcTemplate.queryForObject("select id from users where username = ?", Long.class, username);
        return jdbcTemplate.queryForObject("""
                        select count(*)
                        from user_model_settings
                        where user_id = ?
                        """,
                Long.class,
                userId);
    }

    private boolean tableExists(String tableName) {
        Boolean exists = jdbcTemplate.queryForObject("""
                        select exists (
                            select 1
                            from information_schema.tables
                            where table_schema = 'public'
                              and table_name = ?
                        )
                        """,
                Boolean.class,
                tableName);
        return Boolean.TRUE.equals(exists);
    }

    private void cleanStage13Data() {
        jdbcTemplate.update("""
                delete from chat_message_sources
                where message_id in (
                    select m.id
                    from chat_messages m
                    join chat_sessions s on s.id = m.session_id
                    join users u on u.id = s.user_id
                    where u.username like 'stage13_%'
                )
                """);

        jdbcTemplate.update("""
                delete from chat_messages
                where session_id in (
                    select s.id
                    from chat_sessions s
                    join users u on u.id = s.user_id
                    where u.username like 'stage13_%'
                )
                """);

        jdbcTemplate.update("""
                delete from chat_sessions
                where user_id in (
                    select id from users where username like 'stage13_%'
                )
                """);

        jdbcTemplate.update("""
                delete from document_chunks
                where document_id in (
                    select d.id
                    from documents d
                    join users u on u.id = d.created_by
                    where u.username like 'stage13_%'
                )
                """);

        jdbcTemplate.update("""
                delete from documents
                where created_by in (
                    select id from users where username like 'stage13_%'
                )
                """);

        if (tableExists("knowledge_base_members")) {
            jdbcTemplate.update("""
                    delete from knowledge_base_members
                    where user_id in (
                        select id from users where username like 'stage13_%'
                    )
                    """);

            jdbcTemplate.update("""
                    delete from knowledge_base_members
                    where knowledge_base_id in (
                        select kb.id
                        from knowledge_bases kb
                        join users u on u.id = kb.created_by
                        where u.username like 'stage13_%'
                    )
                    """);
        }

        jdbcTemplate.update("""
                delete from knowledge_bases
                where created_by in (
                    select id from users where username like 'stage13_%'
                )
                """);

        jdbcTemplate.update("""
                delete from user_rag_settings
                where user_id in (
                    select id from users where username like 'stage13_%'
                )
                """);

        if (tableExists("user_model_settings")) {
            jdbcTemplate.update("""
                    delete from user_model_settings
                    where user_id in (
                        select id from users where username like 'stage13_%'
                    )
                    """);
        }

        if (tableExists("user_preferences")) {
            jdbcTemplate.update("""
                    delete from user_preferences
                    where user_id in (
                        select id from users where username like 'stage13_%'
                    )
                    """);
        }

        jdbcTemplate.update("delete from users where username like 'stage13_%'");
    }

    @FunctionalInterface
    private interface CheckedBooleanSupplier {
        boolean getAsBoolean() throws Exception;
    }

    private static class Stage13ModelServer implements AutoCloseable {
        private final HttpServer server;
        private final List<String> authorizationHeaders = new CopyOnWriteArrayList<>();
        private final List<String> requestBodies = new CopyOnWriteArrayList<>();
        private volatile Predicate<String> handlerMode = path -> true;
        private volatile int status = 200;
        private volatile String body = "{\"data\":[]}";
        private volatile String contentType = MediaType.APPLICATION_JSON_VALUE;

        Stage13ModelServer() throws IOException {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/v1/models", this::handle);
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

        void returnModels(String modelId) {
            this.handlerMode = path -> path.endsWith("/models");
            this.status = 200;
            this.contentType = MediaType.APPLICATION_JSON_VALUE;
            this.body = """
                    {
                      "data": [
                        {
                          "id": "%s"
                        }
                      ]
                    }
                    """.formatted(modelId);
        }

        void returnChatCompletion(String answer) {
            returnChatCompletionWithContentType(answer, MediaType.APPLICATION_JSON_VALUE);
        }

        void returnChatCompletionWithContentType(String answer, String contentType) {
            this.handlerMode = path -> path.endsWith("/chat/completions");
            this.status = 200;
            this.contentType = contentType;
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

        CountDownLatch returnDelayedChatCompletion(String answer) {
            CountDownLatch release = new CountDownLatch(1);
            this.handlerMode = path -> {
                if (path.endsWith("/chat/completions")) {
                    try {
                        release.await(5, TimeUnit.SECONDS);
                    } catch (InterruptedException exception) {
                        Thread.currentThread().interrupt();
                    }
                    return true;
                }
                return false;
            };
            this.status = 200;
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
            return release;
        }

        void returnSensitiveFailure(String sensitiveMessage) {
            returnSensitiveFailure(500, sensitiveMessage);
        }

        void returnSensitiveFailure(int status, String sensitiveMessage) {
            this.handlerMode = path -> true;
            this.status = status;
            this.contentType = MediaType.APPLICATION_JSON_VALUE;
            this.body = "{\"error\":{\"message\":\"" + sensitiveMessage + "\"}}";
        }

        private void handle(HttpExchange exchange) throws IOException {
            authorizationHeaders.add(exchange.getRequestHeaders().getFirst(HttpHeaders.AUTHORIZATION));
            requestBodies.add(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] responseBody;
            int responseStatus;
            if (handlerMode.test(exchange.getRequestURI().getPath())) {
                responseStatus = status;
                responseBody = body.getBytes(StandardCharsets.UTF_8);
            } else {
                responseStatus = 404;
                responseBody = "{\"error\":\"not found\"}".getBytes(StandardCharsets.UTF_8);
            }
            exchange.getResponseHeaders().add(HttpHeaders.CONTENT_TYPE, contentType);
            exchange.sendResponseHeaders(responseStatus, responseBody.length);
            exchange.getResponseBody().write(responseBody);
            exchange.close();
        }

        @Override
        public void close() {
            server.stop(0);
        }
    }
}

@SpringBootTest(
        classes = KnowflowBackendApplication.class,
        properties = {
                "knowflow.ai.base-url=http://127.0.0.1:1/v1",
                "knowflow.ai.api-key=stage13-env-key",
                "knowflow.ai.model=stage13-env-model"
        }
)
@AutoConfigureMockMvc
class Stage13LocalModelSecretDefaultTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private final String password = "stage13-password";

    @BeforeEach
    void cleanBefore() {
        cleanStage13LocalSecretData();
    }

    @AfterEach
    void cleanAfter() {
        cleanStage13LocalSecretData();
    }

    @Test
    void localProfileDefaultEncryptionSecretAllowsSavingApiKeyWithoutLeakingPlaintext() throws Exception {
        createUser("stage13_local_secret_owner");
        String token = loginAndGetToken("stage13_local_secret_owner");

        mockMvc.perform(patch("/api/settings/model")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "baseUrl": "https://api.local-secret.test/v1",
                                  "apiKey": "stage13-local-default-key",
                                  "model": "stage13-local-model",
                                  "timeoutSeconds": 60
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.configured").value(true))
                .andExpect(jsonPath("$.apiKeyConfigured").value(true))
                .andExpect(jsonPath("$.baseUrl").value("https://api.local-secret.test/v1"))
                .andExpect(jsonPath("$.apiKey").doesNotExist())
                .andExpect(jsonPath("$.encryptedApiKey").doesNotExist())
                .andExpect(content().string(not(containsString("stage13-local-default-key"))))
                .andExpect(content().string(not(containsString("Authorization"))));

        String encryptedApiKey = readEncryptedApiKey("stage13_local_secret_owner");
        assertThat(encryptedApiKey).isNotBlank();
        assertThat(encryptedApiKey).doesNotContain("stage13-local-default-key");
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

    private String readEncryptedApiKey(String username) {
        Long userId = jdbcTemplate.queryForObject("select id from users where username = ?", Long.class, username);
        return jdbcTemplate.queryForObject("""
                        select encrypted_api_key
                        from user_model_settings
                        where user_id = ?
                        """,
                String.class,
                userId);
    }

    private void cleanStage13LocalSecretData() {
        jdbcTemplate.update("""
                delete from user_model_settings
                where user_id in (
                    select id from users where username like 'stage13_local_secret_%'
                )
                """);
        jdbcTemplate.update("delete from users where username like 'stage13_local_secret_%'");
    }
}

@SpringBootTest(
        classes = KnowflowBackendApplication.class,
        properties = {
                "knowflow.ai.base-url=http://127.0.0.1:1/v1",
                "knowflow.ai.api-key=stage13-env-key",
                "knowflow.ai.model=stage13-env-model",
                "knowflow.model.secret-key="
        }
)
@AutoConfigureMockMvc
class Stage13ModelSecretMissingTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private final String password = "stage13-password";

    @BeforeEach
    void cleanBefore() {
        cleanStage13SecretData();
    }

    @AfterEach
    void cleanAfter() {
        cleanStage13SecretData();
    }

    @Test
    void savingApiKeyIsRejectedWhenEncryptionSecretIsMissingAndErrorIsSanitized() throws Exception {
        createUser("stage13_secret_missing");
        String token = loginAndGetToken("stage13_secret_missing");

        mockMvc.perform(patch("/api/settings/model")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "baseUrl": "https://api.example.test/v1",
                                  "apiKey": "stage13-must-not-leak",
                                  "model": "stage13-model",
                                  "timeoutSeconds": 60
                                }
                                """))
                .andExpect(status().isInternalServerError())
                .andExpect(content().string(not(containsString("stage13-must-not-leak"))))
                .andExpect(content().string(not(containsString("Authorization"))))
                .andExpect(content().string(not(containsString("api.example.test"))));
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

    private boolean tableExists(String tableName) {
        Boolean exists = jdbcTemplate.queryForObject("""
                        select exists (
                            select 1
                            from information_schema.tables
                            where table_schema = 'public'
                              and table_name = ?
                        )
                        """,
                Boolean.class,
                tableName);
        return Boolean.TRUE.equals(exists);
    }

    private void cleanStage13SecretData() {
        if (tableExists("user_model_settings")) {
            jdbcTemplate.update("""
                    delete from user_model_settings
                    where user_id in (
                        select id from users where username like 'stage13_secret_%'
                    )
                    """);
        }
        jdbcTemplate.update("delete from users where username like 'stage13_secret_%'");
    }
}
