package com.knowflow.backend.chat.model;

import com.knowflow.backend.config.AiProperties;
import com.knowflow.backend.settings.entity.UserModelSettings;
import com.knowflow.backend.settings.repository.UserModelSettingsRepository;
import com.knowflow.backend.settings.security.ModelApiKeyCryptoService;
import tools.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.function.Consumer;

import static com.knowflow.backend.common.model.ModelProviderErrors.MODEL_CALL_FAILED_MESSAGE;
import static com.knowflow.backend.common.model.ModelProviderErrors.MODEL_CONFIG_INCOMPLETE_MESSAGE;
import static com.knowflow.backend.common.model.ModelProviderErrors.messageForStatus;
import static com.knowflow.backend.common.utils.Utils.hasText;


/**
 * OpenAI 兼容的聊天模型客户端
 */
@Component
public class OpenAiCompatibleChatModelClient implements ChatModelClient {
    private static final Logger log = LoggerFactory.getLogger(OpenAiCompatibleChatModelClient.class);
    private final AiProperties properties; //AI配置
    private final UserModelSettingsRepository userModelSettingsRepository;
    private final ModelApiKeyCryptoService cryptoService;
    private final ObjectMapper objectMapper;


    public OpenAiCompatibleChatModelClient(AiProperties properties, UserModelSettingsRepository userModelSettingsRepository, ModelApiKeyCryptoService cryptoService, ObjectMapper objectMapper) {
        this.properties = properties;
        this.userModelSettingsRepository = userModelSettingsRepository;
        this.cryptoService = cryptoService;
        this.objectMapper = objectMapper;
    }

    @Override
    public String chat(Long userId, String prompt, double temperature) {
        return chat(userId, prompt, temperature, null);
    }

    /**
     * @param userId        当前 JWT 用户 ID
     * @param prompt        已构造好的 RAG prompt
     * @param temperature   当前用户 RAG Settings 中的温度
     * @param modelOverride 本次请求选择的模型；有值时仅覆盖 model 字段，Base URL/API Key 仍来自当前用户配置
     * @return 模型生成的助手回答
     * @Desc 支持 Chat 页面临时选择模型，同时保持用户配置隔离，避免用请求字段绕过当前用户保存的鉴权信息。
     */
    @Override
    public String chat(Long userId, String prompt, double temperature, String modelOverride) {
        EffectiveModelConfig config = resolveConfig(userId, modelOverride);
        try {
            // 根据当前用户的模型配置创建客户端，避免多个用户之间串用 Base URL 或 API Key。
            RestClient restClient = RestClient.builder()
                    .baseUrl(config.baseUrl())
                    .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + config.apiKey())
                    .build();

            byte[] responseBody = restClient.post()
                    .uri("/chat/completions")
                    .body(new ChatCompletionRequest(config.model(), List.of(new ChatCompletionMessage("user", prompt)), temperature))
                    .retrieve()
                    .body(byte[].class);
            // 部分 OpenAI-compatible 网关会返回 JSON 但 Content-Type 不是 application/json。
            // 这里按原始字节交给 Jackson 解析，避免 RestClient 按错误字符集把 UTF-8 中文读成乱码。
            ChatCompletionResponse response = objectMapper.readValue(responseBody, ChatCompletionResponse.class);
            if (response == null || response.choices() == null || response.choices().isEmpty()) {
                throw new IllegalStateException("AI Model response is empty");
            }
            return response.choices().getFirst().message().content();
        } catch (RestClientResponseException exception) {
            log.warn(
                    "AI model call failed: status={}, endpointShape={}",
                    exception.getStatusCode().value(),
                    describeEndpointShape(config.baseUrl())
            );
            // 只按 HTTP 状态码生成后端白名单文案；供应商原始 body 可能包含密钥、完整地址或模型名，不能落库或返回。
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, messageForStatus(exception.getStatusCode().value()));
        } catch (RuntimeException exception) {
            log.warn(
                    "AI model call failed before response: endpointShape={}, errorType={}",
                    describeEndpointShape(config.baseUrl()),
                    exception.getClass().getSimpleName()
            );
            // 模型供应商错误统一脱敏，不把 API Key、Authorization、完整 Base URL 或模型名返回给前端。
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, MODEL_CALL_FAILED_MESSAGE);
        }
    }

    /**
     * @param userId        当前 JWT 用户 ID
     * @param prompt        已构造好的 RAG prompt
     * @param temperature   当前用户 RAG Settings 中的温度
     * @param modelOverride 本次请求选择的模型；有值时仅覆盖 model 字段
     * @param deltaConsumer 模型每返回一段 delta 时调用，由上层负责落库和 SSE 推送
     * @Desc OpenAI-compatible 流式响应是服务端事件流，形如 data: {...} 和 data: [DONE]。
     * 这里只解析 choices[0].delta.content，不记录供应商原始 body，避免泄露敏感错误或模型细节。
     */
    @Override
    public void stream(Long userId, String prompt, double temperature, String modelOverride, Consumer<String> deltaConsumer) {
        EffectiveModelConfig config = resolveConfig(userId, modelOverride);
        try {
            RestClient restClient = RestClient.builder()
                    .baseUrl(config.baseUrl())
                    .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + config.apiKey())
                    .build();

            restClient.post()
                    .uri("/chat/completions")
                    .body(new ChatCompletionRequest(config.model(), List.of(new ChatCompletionMessage("user", prompt)), temperature, true))
                    .exchange((request, response) -> {
                        if (!response.getStatusCode().is2xxSuccessful()) {
                            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, messageForStatus(response.getStatusCode().value()));
                        }
                        try (BufferedReader reader = new BufferedReader(new InputStreamReader(response.getBody(), StandardCharsets.UTF_8))) {
                            String line;
                            while ((line = reader.readLine()) != null) {
                                String delta = parseStreamDelta(line);
                                if (delta != null && !delta.isEmpty()) {
                                    deltaConsumer.accept(delta);
                                }
                            }
                        }
                        return null;
                    });
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            log.warn(
                    "AI streaming model call failed: endpointShape={}, errorType={}",
                    describeEndpointShape(config.baseUrl()),
                    exception.getClass().getSimpleName()
            );
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, MODEL_CALL_FAILED_MESSAGE);
        }
    }

    /**
     * @param userId 当前 JWT 用户 ID
     * @return 当前用户可用的模型配置
     * @Desc 优先读取用户自己保存的模型配置；没有保存时才回退环境变量，方便本地开发兜底。
     */
    private EffectiveModelConfig resolveConfig(Long userId, String modelOverride) {
        return userModelSettingsRepository.findByUserId(userId)
                .filter(settings -> hasText(settings.getBaseUrl())
                        && hasText(settings.getEncryptedApiKey())
                        && hasText(settings.getModel()))
                .flatMap(settings -> fromUserSettings(settings, modelOverride))
                .orElseGet(() -> fromEnvironment(modelOverride));
    }

    /**
     * @param settings 当前用户保存的模型配置
     * @return Chat 调用使用的 Base URL、API Key 和模型 ID
     * @Desc API Key 在这里解密后只进入后端模型请求，不写入日志，也不返回给前端。
     */
    private java.util.Optional<EffectiveModelConfig> fromUserSettings(UserModelSettings settings, String modelOverride) {
        try {
            return java.util.Optional.of(new EffectiveModelConfig(
                    normalizeChatBaseUrl(settings.getBaseUrl()),
                    cryptoService.decrypt(settings.getEncryptedApiKey()),
                    resolveModel(settings.getModel(), modelOverride)
            ));
        } catch (ResponseStatusException exception) {
            // 已保存的密文可能来自旧的 KNOWFLOW_MODEL_SECRET_KEY。解密失败时把该用户配置视为不可用，
            // 允许本地 .env/环境变量兜底继续支撑 Chat 调试；Settings 页面仍会提示用户重新填写 Key 覆盖旧密文。
            log.warn(
                    "Saved user model settings are unusable, falling back to environment config: userId={}, errorType={}",
                    settings.getUserId(),
                    exception.getClass().getSimpleName()
            );
            return java.util.Optional.empty();
        }
    }

    /**
     * @return 环境变量提供的本地开发兜底模型配置
     * @Desc 只有当前用户没有保存完整模型配置时才回退环境变量，避免串用其他用户的模型 Key。
     * modelOverride 是 Chat 本次请求选择的模型；当 .env 只配置 Base URL/API Key 时，
     * 允许用本次请求模型补齐兜底配置，避免前端已经选定模型但后端仍因 KNOWFLOW_AI_MODEL 为空而拒绝生成。
     */
    private EffectiveModelConfig fromEnvironment(String modelOverride) {
        if (!hasText(properties.getBaseUrl())
                || !hasText(properties.getApiKey())
                || (!hasText(properties.getModel()) && !hasText(modelOverride))) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, MODEL_CONFIG_INCOMPLETE_MESSAGE);
        }
        return new EffectiveModelConfig(
                normalizeChatBaseUrl(properties.getBaseUrl()),
                properties.getApiKey().trim(),
                resolveModel(properties.getModel(), modelOverride)
        );
    }

    /**
     * @param configuredModel 用户或环境中已配置的模型 ID
     * @param modelOverride  本次 Chat 请求携带的模型 ID
     * @return 本次实际传给供应商的模型 ID
     * @Desc Chat 请求的 model 只影响本次生成的模型选择，不参与 Base URL/API Key 解析，避免跨用户串用敏感配置。
     */
    private String resolveModel(String configuredModel, String modelOverride) {
        if (hasText(modelOverride)) {
            return modelOverride.trim();
        }
        if (hasText(configuredModel)) {
            return configuredModel.trim();
        }
        throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, MODEL_CONFIG_INCOMPLETE_MESSAGE);
    }

    /**
     * @param value 用户保存或环境变量提供的模型服务地址
     * @return OpenAI-compatible 根地址，调用方会继续追加 /chat/completions
     * @Desc 这里是 Chat 调用前的防御性规范化。Settings 保存时已处理新数据，但旧数据或环境变量可能仍是完整接口地址；
     * 规范化可以避免把 /chat/completions 再拼一次导致“发送后没有回答”。
     */
    private String normalizeChatBaseUrl(String value) {
        if (!hasText(value)) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, MODEL_CONFIG_INCOMPLETE_MESSAGE);
        }
        try {
            URI uri = new URI(value.trim());
            if (!hasText(uri.getScheme()) || !hasText(uri.getHost()) || hasText(uri.getUserInfo())) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, MODEL_CONFIG_INCOMPLETE_MESSAGE);
            }
            String path = trimTrailingSlash(uri.getPath());
            if (path.endsWith("/chat/completions")) {
                path = path.substring(0, path.length() - "/chat/completions".length());
            }
            path = trimTrailingSlash(path);
            if (!path.endsWith("/v1")) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, MODEL_CONFIG_INCOMPLETE_MESSAGE);
            }
            return new URI(
                    uri.getScheme() == null ? null : uri.getScheme().toLowerCase(),
                    uri.getUserInfo(),
                    uri.getHost(),
                    uri.getPort(),
                    path,
                    null,
                    null
            ).toString();
        } catch (URISyntaxException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, MODEL_CONFIG_INCOMPLETE_MESSAGE);
        }
    }

    private String trimTrailingSlash(String value) {
        String result = value == null ? "" : value.trim();
        while (result.length() > 1 && result.endsWith("/")) {
            result = result.substring(0, result.length() - 1);
        }
        return result;
    }

    private String describeEndpointShape(String baseUrl) {
        try {
            URI uri = new URI(baseUrl);
            String hostState = hasText(uri.getHost()) ? "host-present" : "host-missing";
            String path = trimTrailingSlash(uri.getPath());
            String pathState = path.endsWith("/v1") ? "path-v1-root" : "path-not-v1-root";
            return hostState + "," + pathState;
        } catch (URISyntaxException exception) {
            return "invalid-uri";
        }
    }

    private record EffectiveModelConfig(String baseUrl, String apiKey, String model) {
    }

    private String parseStreamDelta(String line) {
        String trimmed = line == null ? "" : line.trim();
        if (!trimmed.startsWith("data:")) {
            return null;
        }
        String payload = trimmed.substring("data:".length()).trim();
        if (payload.isEmpty() || "[DONE]".equals(payload)) {
            return null;
        }
        try {
            ChatStreamChunk chunk = objectMapper.readValue(payload.getBytes(StandardCharsets.UTF_8), ChatStreamChunk.class);
            if (chunk == null || chunk.choices() == null || chunk.choices().isEmpty()) {
                return null;
            }
            ChatStreamDelta delta = chunk.choices().getFirst().delta();
            return delta == null ? null : delta.content();
        } catch (RuntimeException exception) {
            log.warn("Skipping malformed AI stream chunk: errorType={}", exception.getClass().getSimpleName());
            return null;
        }
    }

    private record ChatCompletionRequest(String model, List<ChatCompletionMessage> messages, double temperature, Boolean stream) {
        ChatCompletionRequest(String model, List<ChatCompletionMessage> messages, double temperature) {
            this(model, messages, temperature, null);
        }

        ChatCompletionRequest(String model, List<ChatCompletionMessage> messages, double temperature, boolean stream) {
            this(model, messages, temperature, Boolean.valueOf(stream));
        }
    }

    private record ChatCompletionMessage(String role, String content) {
    }

    private record ChatCompletionResponse(List<ChatCompletionChoice> choices) {
    }

    private record ChatCompletionChoice(ChatCompletionMessage message) {
    }

    private record ChatStreamChunk(List<ChatStreamChoice> choices) {
    }

    private record ChatStreamChoice(ChatStreamDelta delta) {
    }

    private record ChatStreamDelta(String content) {
    }
}
