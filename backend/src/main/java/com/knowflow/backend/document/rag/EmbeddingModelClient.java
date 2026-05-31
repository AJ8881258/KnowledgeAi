package com.knowflow.backend.document.rag;

import java.util.List;

/**
 * Generates vector embeddings for document chunks and search queries.
 *
 * <p>The {@code userId} parameter identifies whose model credentials should be used.
 * Stage 18 keeps Chat model credentials user-scoped, so embedding calls must follow the
 * same isolation rule and never reuse another user's saved API Key.</p>
 */
public interface EmbeddingModelClient {
    /**
     * @param userId current JWT user ID; used to resolve saved user model credentials before environment fallback
     * @return true when enough Base URL/API Key/model configuration exists to call the embedding endpoint
     */
    boolean isConfigured(Long userId);

    /**
     * @param userId current JWT user ID; controls credential lookup and tenant isolation
     * @param input texts to embed; output order must match input order
     * @return embedding vectors in the same order as {@code input}
     */
    List<List<Double>> embed(Long userId, List<String> input);
}
