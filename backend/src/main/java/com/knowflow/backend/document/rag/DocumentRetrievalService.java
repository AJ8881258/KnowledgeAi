package com.knowflow.backend.document.rag;

import com.knowflow.backend.document.dto.response.SearchResultResponse;
import com.knowflow.backend.document.repository.DocumentChunkRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;

/**
 * Shared retrieval entry point for search APIs and Chat RAG.
 *
 * <p>Older code called PostgreSQL full-text search directly from multiple places. Stage 18
 * centralizes that path so semantic retrieval, score breakdowns, and fallback behavior are
 * identical for `/search` results, Chat prompt context, and saved Chat sources.</p>
 */
@Service
public class DocumentRetrievalService {
    private static final Logger log = LoggerFactory.getLogger(DocumentRetrievalService.class);

    private final DocumentChunkRepository documentChunkRepository;
    private final EmbeddingModelClient embeddingModelClient;

    public DocumentRetrievalService(
            DocumentChunkRepository documentChunkRepository,
            EmbeddingModelClient embeddingModelClient) {
        this.documentChunkRepository = documentChunkRepository;
        this.embeddingModelClient = embeddingModelClient;
    }

    /**
     * @param knowledgeBaseId knowledge base whose chunks may be searched
     * @param userId current JWT user; repository still checks membership to avoid cross-user leakage
     * @param query user search question
     * @param limit maximum rows returned to caller
     * @return ranked chunks with compatible `score` plus Stage 18 score breakdown fields
     */
    public List<SearchResultResponse> search(Long knowledgeBaseId, Long userId, String query, Integer limit) {
        if (!embeddingModelClient.isConfigured(userId)) {
            return documentChunkRepository.searchIndexedChunks(knowledgeBaseId, userId, query, limit);
        }
        try {
            List<List<Double>> embeddings = embeddingModelClient.embed(userId, List.of(query));
            if (embeddings.isEmpty()) {
                return documentChunkRepository.searchIndexedChunks(knowledgeBaseId, userId, query, limit);
            }
            List<SearchResultResponse> hybridResults = documentChunkRepository.searchHybridIndexedChunks(
                    knowledgeBaseId,
                    userId,
                    query,
                    toVectorLiteral(embeddings.getFirst()),
                    limit
            );
            if (hasSemanticSignal(hybridResults)) {
                return hybridResults;
            }
            // If every candidate has semanticScore 0, the indexed chunks do not have usable
            // vectors for this query. Falling back keeps failed/skipped embedding documents
            // visibly full-text searchable instead of labeling a keyword-only result as HYBRID.
            return documentChunkRepository.searchIndexedChunks(knowledgeBaseId, userId, query, limit);
        } catch (RuntimeException exception) {
            log.warn("Semantic retrieval failed; falling back to full-text search: userId={}, errorType={}",
                    userId,
                    exception.getClass().getSimpleName());
            return documentChunkRepository.searchIndexedChunks(knowledgeBaseId, userId, query, limit);
        }
    }

    private boolean hasSemanticSignal(List<SearchResultResponse> results) {
        return results.stream()
                .anyMatch(result -> result.getSemanticScore() != null && result.getSemanticScore() > 0.0);
    }

    /**
     * @param vector embedding returned by the provider
     * @return pgvector literal such as [0.1,0.2]. Values are formatted with Locale.ROOT
     * to avoid comma decimal separators on non-English systems.
     */
    public static String toVectorLiteral(List<Double> vector) {
        if (vector == null || vector.isEmpty()) {
            throw new IllegalArgumentException("embedding vector is empty");
        }
        String joined = vector.stream()
                .map(value -> String.format(Locale.ROOT, "%.10f", value))
                .toList()
                .stream()
                .reduce((left, right) -> left + "," + right)
                .orElse("");
        return "[" + joined + "]";
    }
}
