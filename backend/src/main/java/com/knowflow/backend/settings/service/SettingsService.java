package com.knowflow.backend.settings.service;


import com.knowflow.backend.config.AiProperties;
import com.knowflow.backend.settings.dto.request.FetchModelListRequest;
import com.knowflow.backend.settings.dto.request.TestModelConnectionRequest;
import com.knowflow.backend.settings.dto.request.UpdateModelSettingsRequest;
import com.knowflow.backend.settings.dto.request.UpdateRagSettingsRequest;
import com.knowflow.backend.settings.dto.request.UpdateUserPreferenceRequest;
import com.knowflow.backend.settings.dto.response.ModelConnectionTestResponse;
import com.knowflow.backend.settings.dto.response.ModelListResponse;
import com.knowflow.backend.settings.dto.response.ModelSettingsResponse;
import com.knowflow.backend.settings.dto.response.RagSettingsResponse;
import com.knowflow.backend.settings.dto.response.UserPreferenceResponse;
import com.knowflow.backend.settings.entity.UserModelSettings;
import com.knowflow.backend.settings.entity.UserPreference;
import com.knowflow.backend.settings.entity.UserRagSettings;
import com.knowflow.backend.settings.repository.UserModelSettingsRepository;
import com.knowflow.backend.settings.repository.UserPreferenceRepository;
import com.knowflow.backend.settings.repository.UserRagSettingsRepository;
import com.knowflow.backend.settings.security.ModelApiKeyCryptoService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.URISyntaxException;
import java.time.ZoneId;
import java.util.List;

import static com.knowflow.backend.common.model.ModelProviderErrors.MODEL_CALL_FAILED_MESSAGE;
import static com.knowflow.backend.common.model.ModelProviderErrors.messageForStatus;

@Service
@AllArgsConstructor
public class SettingsService {
    private static final String MODEL_CONNECTION_TEST_SUCCESS_MESSAGE = "模型连接测试成功";

    //默认值
    private static final String DEFAULT_LANGUAGE = "zh-CN";
    private static final String DEFAULT_TIMEZONE = "Asia/Shanghai";
    private static final int DEFAULT_TOP_K = 5;
    private static final int DEFAULT_MAX_CONTEXT_CHUNKS = 5;
    private static final double DEFAULT_TEMPERATURE = 0.2;
    private static final int MIN_CHUNKS = 1;
    private static final int MAX_CHUNKS = 20;
    private static final double MIN_TEMPERATURE = 0.0;
    private static final double MAX_TEMPERATURE = 2.0;
    private static final int MIN_TIMEOUT_SECONDS = 1;
    private static final int MAX_TIMEOUT_SECONDS = 300;

    //依赖注入
    private final AiProperties aiProperties;
    private final UserRagSettingsRepository userRagSettingsRepository;
    private final UserModelSettingsRepository userModelSettingsRepository;
    private final UserPreferenceRepository userPreferenceRepository;
    private final ModelApiKeyCryptoService cryptoService;


    /**
     * @param userId 当前 JWT 用户 ID
     * @return 当前用户模型配置的脱敏状态
     * @Desc 只返回当前用户的模型配置状态和可回显 Base URL；API Key 明文、密文和 Authorization 信息都不会返回。
     */
    public ModelSettingsResponse getModelSettings(Long userId) {
        return userModelSettingsRepository.findByUserId(userId)
                .map(this::toModelSettingsResponse)
                .orElseGet(() -> new ModelSettingsResponse(false, null, null, false, false, aiProperties.getTimeoutSeconds(), null));
    }

    /**
     * @param userId  当前 JWT 用户 ID
     * @param request 前端提交的模型配置
     * @return 保存后的脱敏模型配置状态
     * @Desc 保存用户自己的模型配置。与旧逻辑不同，后端不再支持单独清空密钥；
     * apiKey 有值时加密覆盖旧 Key，apiKey 为空或未传时保留旧 Key，响应体仍只返回 apiKeyConfigured。
     */
    @Transactional
    public ModelSettingsResponse updateModelSettings(Long userId, UpdateModelSettingsRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request is null");
        }

        UserModelSettings current = userModelSettingsRepository.findByUserId(userId).orElse(null);
        String baseUrl = normalizeModelBaseUrl(request.getBaseUrl());
        String model = normalizeRequiredText(request.getModel(), "model");
        Integer timeoutSeconds = normalizeTimeout(request.getTimeoutSeconds());

        String encryptedApiKey = current == null ? null : current.getEncryptedApiKey();
        if (hasText(request.getApiKey())) {
            encryptedApiKey = cryptoService.encrypt(request.getApiKey().trim());
        }

        UserModelSettings next = new UserModelSettings();
        next.setUserId(userId);
        next.setBaseUrl(baseUrl);
        next.setEncryptedApiKey(encryptedApiKey);
        next.setModel(model);
        next.setTimeoutSeconds(timeoutSeconds);

        userModelSettingsRepository.upsert(next);
        return getModelSettings(userId);
    }

    /**
     * @param userId  当前 JWT 用户 ID，用于在请求体缺少 baseUrl/apiKey 时复用已保存配置
     * @param request baseUrl 是 OpenAI-compatible 服务地址，apiKey 是本次拉取模型列表使用的密钥；两者都可为空
     * @return 模型 ID 列表
     * @Desc 模型列表仍从供应商动态读取，不在后端写死枚举；与旧逻辑不同，本方法允许复用当前用户已保存的 Base URL/API Key，
     * 这样前端刷新 Settings 后可以直接点击“获取模型列表”，不需要重新输入敏感 Key。
     */
    public ModelListResponse fetchModels(Long userId, FetchModelListRequest request) {
        UserModelSettings savedSettings = userModelSettingsRepository.findByUserId(userId).orElse(null);
        String baseUrl = normalizeModelBaseUrl(resolveModelListBaseUrl(request, savedSettings));
        String apiKey = resolveModelListApiKey(request, savedSettings);

        try {
            RestClient restClient = RestClient.builder()
                    .baseUrl(baseUrl)
                    .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .build();
            OpenAiModelsResponse response = restClient.get()
                    .uri("/models")
                    .retrieve()
                    .body(OpenAiModelsResponse.class);

            List<ModelListResponse.ModelItem> models = response == null || response.data() == null
                    ? List.of()
                    : response.data().stream()
                    .filter(modelItem -> hasText(modelItem.id()))
                    .map(modelItem -> new ModelListResponse.ModelItem(modelItem.id(), modelItem.id()))
                    .toList();
            return new ModelListResponse(models);
        } catch (RuntimeException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Fetch model list failed");
        }
    }

    /**
     * @param userId  当前 JWT 用户 ID，用于复用该用户已保存并解密后的 Base URL/API Key/Model
     * @param request 可选的临时测试参数；传入字段优先级高于已保存配置，但不会被本接口保存
     * @return 连接测试结果；成功只表示 chat completions 可调用，不代表会修改用户配置
     * @Desc 与“保存配置”不同，本方法会真实调用供应商 /chat/completions。它用于 Settings 保存后验证 Key、Base URL
     * 和 Model 是否能生成回答；失败时只返回后端脱敏后的可读文案，不返回供应商原始错误。
     */
    public ModelConnectionTestResponse testModelConnection(Long userId, TestModelConnectionRequest request) {
        UserModelSettings savedSettings = userModelSettingsRepository.findByUserId(userId).orElse(null);
        String baseUrl = normalizeModelBaseUrl(resolveModelTestBaseUrl(request, savedSettings));
        String apiKey = resolveModelTestApiKey(request, savedSettings);
        String model = normalizeRequiredText(resolveModelTestModel(request, savedSettings), "model");

        try {
            RestClient restClient = RestClient.builder()
                    .baseUrl(baseUrl)
                    .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .build();
            OpenAiChatCompletionResponse response = restClient.post()
                    .uri("/chat/completions")
                    .body(new OpenAiChatCompletionRequest(
                            model,
                            List.of(new OpenAiChatMessage("user", "请用中文回复：连接测试")),
                            0.0
                    ))
                    .retrieve()
                    .body(OpenAiChatCompletionResponse.class);

            if (response == null
                    || response.choices() == null
                    || response.choices().isEmpty()
                    || response.choices().getFirst().message() == null
                    || !hasText(response.choices().getFirst().message().content())) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, MODEL_CALL_FAILED_MESSAGE);
            }
            return new ModelConnectionTestResponse(true, MODEL_CONNECTION_TEST_SUCCESS_MESSAGE);
        } catch (RestClientResponseException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, messageForStatus(exception.getStatusCode().value()));
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, MODEL_CALL_FAILED_MESSAGE);
        }
    }

    /**
     * @param userId 当前 JWT 用户 ID
     * @return 当前用户偏好；没有保存过时返回默认偏好
     * @Desc language 只保存偏好，timezone 给今日交谈次数和前端时间展示使用。
     */
    public UserPreferenceResponse getPreferences(Long userId) {
        return userPreferenceRepository.findByUserId(userId)
                .map(preference -> new UserPreferenceResponse(preference.getLanguage(), preference.getTimezone()))
                .orElseGet(() -> new UserPreferenceResponse(DEFAULT_LANGUAGE, DEFAULT_TIMEZONE));
    }

    @Transactional
    public UserPreferenceResponse updatePreferences(Long userId, UpdateUserPreferenceRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request is null");
        }
        String language = normalizeLanguage(request.getLanguage());
        String timezone = normalizeTimezone(request.getTimezone());

        UserPreference preference = new UserPreference();
        preference.setUserId(userId);
        preference.setLanguage(language);
        preference.setTimezone(timezone);
        userPreferenceRepository.upsert(preference);
        return new UserPreferenceResponse(language, timezone);
    }

    /**
     * @param userId
     * @return
     * @Desc 获取用户RAG设置
     */
    public RagSettingsResponse getRagSettings(Long userId) {
        UserRagSettings settings = getEffectiveRagSettings(userId);
        return toResponse(settings);
    }

    /**
     * @param userId
     * @return
     * @Desc 给 ChatService 使用的有效 RAG 参数
     * @Fun Chat/RAG 服务会通过这个方法读取当前用户保存后的参数
     */
    public UserRagSettings getEffectiveRagSettings(Long userId) {
        return userRagSettingsRepository.findByUserId(userId)
                .orElseGet(() -> defaultSettings(userId));
    }


    /**
     * @param userId
     * @param request
     * @return
     * @Desc 保存当前用户 RAG 参数。
     */
    @Transactional
    public RagSettingsResponse updateRagSettings(
            Long userId,
            UpdateRagSettingsRequest request
    ) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request is null");
        }
        if (request.getTopK() == null && request.getMaxContextChunks() == null && request.getTemperature() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request is empty");
        }
        UserRagSettings current = getEffectiveRagSettings(userId);

        Integer topK = request.getTopK() == null ? current.getTopK() : normalizedChunkValue(request.getTopK(), "topK");
        Integer maxContextChunks = request.getMaxContextChunks() == null ? current.getMaxContextChunks() : normalizedChunkValue(request.getMaxContextChunks(), "maxContextChunks");
        Double temperature = request.getTemperature() == null ? current.getTemperature() : normalizedTemperature(request.getTemperature());

        UserRagSettings next = new UserRagSettings();
        next.setUserId(userId);
        next.setTopK(topK);
        next.setMaxContextChunks(maxContextChunks);
        next.setTemperature(temperature);

        userRagSettingsRepository.upsert(next);
        return getRagSettings(userId);

    }

    /**
     * 设置默认RAG设置
     *
     * @param userId
     * @return
     */
    private UserRagSettings defaultSettings(Long userId) {
        UserRagSettings settings = new UserRagSettings();
        settings.setUserId(userId);
        settings.setTopK(DEFAULT_TOP_K);
        settings.setMaxContextChunks(DEFAULT_MAX_CONTEXT_CHUNKS);
        settings.setTemperature(DEFAULT_TEMPERATURE);
        return settings;
    }


    /**
     * 将用户RAG设置转换为响应对象
     *
     * @param userRagSettings
     * @return
     */
    private RagSettingsResponse toResponse(UserRagSettings userRagSettings) {
        return new RagSettingsResponse(
                userRagSettings.getTopK(),
                userRagSettings.getMaxContextChunks(),
                userRagSettings.getTemperature()
        );
    }


    /**
     * 归一化分块值
     *
     * @param value
     * @param fieldName
     * @return
     */
    private Integer normalizedChunkValue(Integer value, String fieldName) {
        if (value == null || value < MIN_CHUNKS || value > MAX_CHUNKS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " must be between " + MIN_CHUNKS + " and " + MAX_CHUNKS);
        }
        return value;
    }

    /**
     * 归一化温度值
     *
     * @param value
     * @return
     */
    private Double normalizedTemperature(Double value) {
        if (value == null || value.isNaN() || value.isInfinite() || value < MIN_TEMPERATURE || value > MAX_TEMPERATURE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "temperature must be between 0 and 2");
        }
        return value;
    }

    /**
     * 检查字符串是否包含有效文本
     *
     * @param value
     * @return
     */
    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private ModelSettingsResponse toModelSettingsResponse(UserModelSettings settings) {
        boolean baseUrlConfigured = hasText(settings.getBaseUrl());
        boolean apiKeyConfigured = hasText(settings.getEncryptedApiKey());
        boolean modelConfigured = hasText(settings.getModel());
        return new ModelSettingsResponse(
                baseUrlConfigured && apiKeyConfigured && modelConfigured,
                modelConfigured ? settings.getModel() : null,
                baseUrlConfigured ? settings.getBaseUrl() : null,
                baseUrlConfigured,
                apiKeyConfigured,
                settings.getTimeoutSeconds(),
                settings.getUpdatedAt()
        );
    }

    private String normalizeRequiredText(String value, String fieldName) {
        if (!hasText(value)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " is empty");
        }
        return value.trim();
    }

    /**
     * @param value 用户在 Settings 中填写的模型服务地址
     * @return OpenAI-compatible 根地址，固定为 scheme://host[:port]/v1 这类格式
     * @Desc Chat 客户端会在根地址后追加 /chat/completions。与旧逻辑直接保存原字符串不同，
     * 这里会把误填的完整 /chat/completions 地址规范化回 /v1，并拒绝缺少 /v1 的地址，避免静默拼成错误 URL。
     */
    private String normalizeModelBaseUrl(String value) {
        String rawBaseUrl = normalizeRequiredText(value, "baseUrl");
        URI uri;
        try {
            uri = new URI(rawBaseUrl);
        } catch (URISyntaxException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "baseUrl is invalid");
        }
        if (!hasText(uri.getScheme()) || !hasText(uri.getHost()) || hasText(uri.getUserInfo())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "baseUrl is invalid");
        }

        String normalizedPath = trimTrailingSlash(uri.getPath());
        if (normalizedPath.endsWith("/chat/completions")) {
            normalizedPath = normalizedPath.substring(0, normalizedPath.length() - "/chat/completions".length());
        }
        normalizedPath = trimTrailingSlash(normalizedPath);
        if (!normalizedPath.endsWith("/v1")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "baseUrl must be an OpenAI-compatible root ending with /v1");
        }

        try {
            return new URI(
                    uri.getScheme().toLowerCase(),
                    uri.getUserInfo(),
                    uri.getHost(),
                    uri.getPort(),
                    normalizedPath,
                    null,
                    null
            ).toString();
        } catch (URISyntaxException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "baseUrl is invalid");
        }
    }

    private String trimTrailingSlash(String value) {
        String result = value == null ? "" : value.trim();
        while (result.length() > 1 && result.endsWith("/")) {
            result = result.substring(0, result.length() - 1);
        }
        return result;
    }

    private String resolveModelListBaseUrl(FetchModelListRequest request, UserModelSettings savedSettings) {
        if (request != null && hasText(request.getBaseUrl())) {
            return request.getBaseUrl().trim();
        }
        if (savedSettings != null && hasText(savedSettings.getBaseUrl())) {
            return savedSettings.getBaseUrl().trim();
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "baseUrl is empty");
    }

    private String resolveModelListApiKey(FetchModelListRequest request, UserModelSettings savedSettings) {
        if (request != null && hasText(request.getApiKey())) {
            return request.getApiKey().trim();
        }
        if (savedSettings != null && hasText(savedSettings.getEncryptedApiKey())) {
            // 已保存的 Key 只在后端解密使用，不会进入响应体，也不会暴露给前端表单。
            return cryptoService.decrypt(savedSettings.getEncryptedApiKey());
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "apiKey is empty");
    }

    private String resolveModelTestBaseUrl(TestModelConnectionRequest request, UserModelSettings savedSettings) {
        if (request != null && hasText(request.getBaseUrl())) {
            return request.getBaseUrl().trim();
        }
        if (savedSettings != null && hasText(savedSettings.getBaseUrl())) {
            return savedSettings.getBaseUrl().trim();
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "baseUrl is empty");
    }

    private String resolveModelTestApiKey(TestModelConnectionRequest request, UserModelSettings savedSettings) {
        if (request != null && hasText(request.getApiKey())) {
            return request.getApiKey().trim();
        }
        if (savedSettings != null && hasText(savedSettings.getEncryptedApiKey())) {
            // 连接测试必须验证真实 chat 鉴权，因此会解密当前用户自己的 Key 并仅用于本次后端请求。
            return cryptoService.decrypt(savedSettings.getEncryptedApiKey());
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "apiKey is empty");
    }

    private String resolveModelTestModel(TestModelConnectionRequest request, UserModelSettings savedSettings) {
        if (request != null && hasText(request.getModel())) {
            return request.getModel().trim();
        }
        if (savedSettings != null && hasText(savedSettings.getModel())) {
            return savedSettings.getModel().trim();
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "model is empty");
    }

    private Integer normalizeTimeout(Integer value) {
        if (value == null || value < MIN_TIMEOUT_SECONDS || value > MAX_TIMEOUT_SECONDS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "timeoutSeconds must be between 1 and 300");
        }
        return value;
    }

    private String normalizeLanguage(String value) {
        String language = normalizeRequiredText(value, "language");
        if (language.length() > 32) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "language is too long");
        }
        return language;
    }

    private String normalizeTimezone(String value) {
        String timezone = normalizeRequiredText(value, "timezone");
        try {
            ZoneId.of(timezone);
            return timezone;
        } catch (RuntimeException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "timezone is invalid");
        }
    }

    private record OpenAiModelsResponse(List<OpenAiModelItem> data) {
    }

    private record OpenAiModelItem(String id) {
    }

    private record OpenAiChatCompletionRequest(String model, List<OpenAiChatMessage> messages, double temperature) {
    }

    private record OpenAiChatMessage(String role, String content) {
    }

    private record OpenAiChatCompletionResponse(List<OpenAiChatCompletionChoice> choices) {
    }

    private record OpenAiChatCompletionChoice(OpenAiChatMessage message) {
    }
}
