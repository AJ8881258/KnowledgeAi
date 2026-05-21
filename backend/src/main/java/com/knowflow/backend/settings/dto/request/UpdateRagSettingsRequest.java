package com.knowflow.backend.settings.dto.request;

import lombok.Data;

/**
 * 更新用户RAG设置请求
 */
@Data
public class UpdateRagSettingsRequest {
    private Integer topK;
    private Integer maxContextChunks;
    private Double temperature;
}
