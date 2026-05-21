package com.knowflow.backend.settings.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * @Desc RAG 设置响应 DTO
 */

@Data
@AllArgsConstructor
public class RagSettingsResponse {
    private Integer topK;
    private Integer maxContextChunks;
    private Double temperature;
}
