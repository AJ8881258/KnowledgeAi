package com.knowflow.backend.settings.service;


import com.knowflow.backend.config.AiProperties;
import com.knowflow.backend.settings.dto.request.UpdateRagSettingsRequest;
import com.knowflow.backend.settings.dto.response.ModelSettingsResponse;
import com.knowflow.backend.settings.dto.response.RagSettingsResponse;
import com.knowflow.backend.settings.entity.UserRagSettings;
import com.knowflow.backend.settings.repository.UserRagSettingsRepository;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@AllArgsConstructor
public class SettingsService {

    //默认值
    private static final int DEFAULT_TOP_K = 5;
    private static final int DEFAULT_MAX_CONTEXT_CHUNKS = 5;
    private static final double DEFAULT_TEMPERATURE = 0.2;
    private static final int MIN_CHUNKS = 1;
    private static final int MAX_CHUNKS = 20;
    private static final double MIN_TEMPERATURE = 0.0;
    private static final double MAX_TEMPERATURE = 2.0;

    //依赖注入
    private final AiProperties aiProperties;
    private final UserRagSettingsRepository userRagSettingsRepository;


    /**
     * 模型配置状态展示
     *
     * @return
     */
    public ModelSettingsResponse getModelSettings() {
        boolean baseUrlConfigured = hasText(aiProperties.getBaseUrl());
        boolean apiKeyConfigured = hasText(aiProperties.getApiKey());
        boolean modelConfigured = hasText(aiProperties.getModel());

        /**
         * @Desc 不能返回 API key 明文，也不返回 base URL 明文
         */
        return new ModelSettingsResponse(
                baseUrlConfigured && apiKeyConfigured && modelConfigured, "ENVIRONMENT",
                modelConfigured ? aiProperties.getModel().trim() : null,
                baseUrlConfigured, apiKeyConfigured, aiProperties.getTimeoutSeconds(), false
        );
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
}
