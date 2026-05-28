package com.knowflow.backend.settings.dto.request;

import lombok.Data;

@Data
public class UpdateModelSettingsRequest {
    private String baseUrl;
    /**
     * 新 API Key；有值时后端会加密保存并覆盖旧 Key，空字符串或未传时保留数据库里已经保存的 Key。
     * 与旧契约不同，本请求不再提供单独清空字段，避免用户误清空 Key 后让 Chat 进入不可用状态。
     */
    private String apiKey;
    private String model;
    private Integer timeoutSeconds;
}
