package com.knowflow.backend.settings.dto.response;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ModelSettingsResponse {
    /** 当前用户的模型配置是否足够用于 Chat 调用：Base URL、API Key、model 都已配置时为 true。 */
    private boolean configured;
    /** 当前用户选择的 OpenAI-compatible 模型 ID，例如 gpt-4.1-mini。 */
    private String model;
    /** 当前用户保存的模型服务地址；它不是密钥，前端需要回显它以便刷新后继续获取模型列表。 */
    private String baseUrl;
    /** 是否保存过 Base URL，供前端显示配置完整度。 */
    private boolean baseUrlConfigured;
    /** 是否保存过 API Key；只表示密钥存在，后端不会返回明文或密文 Key。 */
    private boolean apiKeyConfigured;
    /** 当前用户模型调用超时时间，单位秒。 */
    private Integer timeoutSeconds;
    /** 模型配置最后更新时间，用于前端显示保存状态。 */
    private OffsetDateTime updatedAt;
}
