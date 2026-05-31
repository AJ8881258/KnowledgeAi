package com.knowflow.backend.settings.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * User-facing RAG settings response.
 *
 * <p>retrievalMode and weights are returned explicitly so the frontend can show
 * whether search/Chat is using semantic HYBRID ranking or full-text only ranking.</p>
 */
@Data
@AllArgsConstructor
public class RagSettingsResponse {
    private Integer topK;
    private Integer maxContextChunks;
    private Double temperature;
    private String retrievalMode;
    private Double semanticWeight;
    private Double fulltextWeight;
}
