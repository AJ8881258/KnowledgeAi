package com.knowflow.backend.settings.dto.request;

import lombok.Data;

/**
 * Request body for updating the current user's RAG behavior.
 *
 * <p>Stage 19 extends the original chunk/temperature settings with retrieval strategy
 * controls. All fields are optional so PATCH can update only the changed values.</p>
 */
@Data
public class UpdateRagSettingsRequest {
    /**
     * Maximum number of chunks to retrieve before context trimming.
     */
    private Integer topK;
    /**
     * Maximum number of retrieved chunks allowed into the prompt and citations.
     */
    private Integer maxContextChunks;
    /**
     * Chat generation temperature used by RAG answers.
     */
    private Double temperature;
    /**
     * Retrieval mode for search/Chat: HYBRID uses semantic + full-text, FULLTEXT skips embeddings.
     */
    private String retrievalMode;
    /**
     * Semantic score weight in HYBRID mode, range 0..1.
     */
    private Double semanticWeight;
    /**
     * PostgreSQL full-text score weight in HYBRID mode, range 0..1.
     */
    private Double fulltextWeight;
}
