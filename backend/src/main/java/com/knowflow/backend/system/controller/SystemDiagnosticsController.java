package com.knowflow.backend.system.controller;

import com.knowflow.backend.config.AiProperties;
import com.knowflow.backend.document.service.DocumentProcessingJobService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;

import static com.knowflow.backend.common.utils.AuthUtils.getCurrentUserId;

@RestController
@RequestMapping("/api/system")
public class SystemDiagnosticsController {

    private final JdbcTemplate jdbcTemplate;
    private final AiProperties aiProperties;
    private final DocumentProcessingJobService jobService;

    public SystemDiagnosticsController(
            JdbcTemplate jdbcTemplate,
            AiProperties aiProperties,
            DocumentProcessingJobService jobService) {
        this.jdbcTemplate = jdbcTemplate;
        this.aiProperties = aiProperties;
        this.jobService = jobService;
    }

    /**
     * Returns a safe system snapshot for the task center.
     *
     * @param jwt current user token; job counts are scoped to this user's accessible knowledge bases
     * @return diagnostics with booleans and counts only. It intentionally does not return Base URL,
     * API Key, model ID, Authorization headers, database URLs, or exception details.
     */
    @GetMapping("/diagnostics")
    public SystemDiagnosticsResponse diagnostics(@AuthenticationPrincipal Jwt jwt) {
        Long userId = getCurrentUserId(jwt);
        boolean databaseReachable = isDatabaseReachable();

        return new SystemDiagnosticsResponse(
                databaseReachable ? "OK" : "DEGRADED",
                new DatabaseDiagnostics(databaseReachable),
                new JobDiagnostics(
                        jobService.countAccessibleActiveJobs(userId),
                        jobService.countAccessibleFailedJobs(userId)),
                new ModelDiagnostics(
                        hasText(aiProperties.getBaseUrl())
                                && hasText(aiProperties.getApiKey())
                                && hasText(aiProperties.getModel()),
                        hasText(aiProperties.getBaseUrl())
                                && hasText(aiProperties.getApiKey())
                                && hasText(aiProperties.getEmbeddingModel())),
                OffsetDateTime.now());
    }

    /**
     * Checks connectivity with a constant query. Failures are reduced to false so diagnostics stay
     * safe and never expose JDBC URLs, usernames, or driver exception text.
     */
    private boolean isDatabaseReachable() {
        try {
            Integer value = jdbcTemplate.queryForObject("select 1", Integer.class);
            return Integer.valueOf(1).equals(value);
        } catch (RuntimeException exception) {
            return false;
        }
    }

    private boolean hasText(String value) {
        return StringUtils.hasText(value);
    }

    /**
     * Public diagnostics response. Each nested object contains only operational state, not secrets
     * or provider identifiers.
     */
    public record SystemDiagnosticsResponse(
            String status,
            DatabaseDiagnostics database,
            JobDiagnostics jobs,
            ModelDiagnostics model,
            OffsetDateTime generatedAt) {
    }

    public record DatabaseDiagnostics(boolean reachable) {
    }

    public record JobDiagnostics(long activeCount, long failedCount) {
    }

    public record ModelDiagnostics(boolean chatFallbackConfigured, boolean embeddingFallbackConfigured) {
    }
}
