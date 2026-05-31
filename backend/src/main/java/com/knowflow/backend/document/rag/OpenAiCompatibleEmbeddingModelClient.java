package com.knowflow.backend.document.rag;

import com.knowflow.backend.config.AiProperties;
import com.knowflow.backend.settings.entity.UserModelSettings;
import com.knowflow.backend.settings.repository.UserModelSettingsRepository;
import com.knowflow.backend.settings.security.ModelApiKeyCryptoService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;
import java.util.Optional;

import static com.knowflow.backend.common.model.ModelProviderErrors.MODEL_CALL_FAILED_MESSAGE;
import static com.knowflow.backend.common.model.ModelProviderErrors.messageForStatus;
import static com.knowflow.backend.common.utils.Utils.hasText;

/**
 * OpenAI-compatible embedding client for Stage 18 semantic retrieval.
 *
 * <p>Embedding uses the current user's saved Base URL/API Key when available, then falls
 * back to environment variables for local development. The embedding model name is backend
 * configuration, not a persisted ChatModel enum, because changing it affects indexed vectors
 * and should be operated deliberately.</p>
 */
@Component
public class OpenAiCompatibleEmbeddingModelClient implements EmbeddingModelClient {
    private static final Logger log = LoggerFactory.getLogger(OpenAiCompatibleEmbeddingModelClient.class);

    private final AiProperties properties;
    private final UserModelSettingsRepository userModelSettingsRepository;
    private final ModelApiKeyCryptoService cryptoService;
    private final ObjectMapper objectMapper;

    public OpenAiCompatibleEmbeddingModelClient(
            AiProperties properties,
            UserModelSettingsRepository userModelSettingsRepository,
            ModelApiKeyCryptoService cryptoService,
            ObjectMapper objectMapper) {
        this.properties = properties;
        this.userModelSettingsRepository = userModelSettingsRepository;
        this.cryptoService = cryptoService;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean isConfigured(Long userId) {
        return resolveConfig(userId).isPresent();
    }

    @Override
    public List<List<Double>> embed(Long userId, List<String> input) {
        if (input == null || input.isEmpty()) {
            return List.of();
        }
        EffectiveEmbeddingConfig config = resolveConfig(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Embedding model config is incomplete"));
        try {
            RestClient restClient = RestClient.builder()
                    .baseUrl(config.baseUrl())
                    .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + config.apiKey())
                    .build();

            byte[] responseBody = restClient.post()
                    .uri("/embeddings")
                    .body(new EmbeddingRequest(config.model(), input))
                    .retrieve()
                    .body(byte[].class);
            EmbeddingResponse response = objectMapper.readValue(responseBody, EmbeddingResponse.class);
            if (response == null || response.data() == null || response.data().size() != input.size()) {
                throw new IllegalStateException("Embedding response size mismatch");
            }
            return response.data().stream()
                    .map(EmbeddingData::embedding)
                    .toList();
        } catch (RestClientResponseException exception) {
            log.warn("Embedding call failed: status={}, endpointShape={}",
                    exception.getStatusCode().value(),
                    describeEndpointShape(config.baseUrl()));
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, messageForStatus(exception.getStatusCode().value()));
        } catch (RuntimeException exception) {
            log.warn("Embedding call failed before response: endpointShape={}, errorType={}",
                    describeEndpointShape(config.baseUrl()),
                    exception.getClass().getSimpleName());
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, MODEL_CALL_FAILED_MESSAGE);
        }
    }

    private Optional<EffectiveEmbeddingConfig> resolveConfig(Long userId) {
        if (!hasText(properties.getEmbeddingModel())) {
            return Optional.empty();
        }
        Optional<EffectiveEmbeddingConfig> userConfig = userModelSettingsRepository.findByUserId(userId)
                .filter(settings -> hasText(settings.getBaseUrl()) && hasText(settings.getEncryptedApiKey()))
                .flatMap(this::fromUserSettings);
        if (userConfig.isPresent()) {
            return userConfig;
        }
        if (!hasText(properties.getBaseUrl()) || !hasText(properties.getApiKey())) {
            return Optional.empty();
        }
        return Optional.of(new EffectiveEmbeddingConfig(
                normalizeBaseUrl(properties.getBaseUrl()),
                properties.getApiKey().trim(),
                properties.getEmbeddingModel().trim()
        ));
    }

    private Optional<EffectiveEmbeddingConfig> fromUserSettings(UserModelSettings settings) {
        try {
            return Optional.of(new EffectiveEmbeddingConfig(
                    normalizeBaseUrl(settings.getBaseUrl()),
                    cryptoService.decrypt(settings.getEncryptedApiKey()),
                    properties.getEmbeddingModel().trim()
            ));
        } catch (RuntimeException exception) {
            log.warn("Saved user model settings cannot be used for embeddings: userId={}, errorType={}",
                    settings.getUserId(),
                    exception.getClass().getSimpleName());
            return Optional.empty();
        }
    }

    /**
     * @param value configured OpenAI-compatible root URL, possibly already pointing under /v1
     * @return normalized /v1 root. The client appends /embeddings after this value.
     */
    private String normalizeBaseUrl(String value) {
        if (!hasText(value)) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Embedding model config is incomplete");
        }
        try {
            URI uri = new URI(value.trim());
            if (!hasText(uri.getScheme()) || !hasText(uri.getHost()) || hasText(uri.getUserInfo())) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Embedding model config is incomplete");
            }
            String path = trimTrailingSlash(uri.getPath());
            if (path.endsWith("/embeddings")) {
                path = path.substring(0, path.length() - "/embeddings".length());
            }
            path = trimTrailingSlash(path);
            if (!path.endsWith("/v1")) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Embedding model config is incomplete");
            }
            return new URI(
                    uri.getScheme() == null ? null : uri.getScheme().toLowerCase(),
                    uri.getUserInfo(),
                    uri.getHost(),
                    uri.getPort(),
                    path,
                    null,
                    null
            ).toString();
        } catch (URISyntaxException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Embedding model config is incomplete");
        }
    }

    private String trimTrailingSlash(String value) {
        String result = value == null ? "" : value.trim();
        while (result.length() > 1 && result.endsWith("/")) {
            result = result.substring(0, result.length() - 1);
        }
        return result;
    }

    private String describeEndpointShape(String baseUrl) {
        try {
            URI uri = new URI(baseUrl);
            String hostState = hasText(uri.getHost()) ? "host-present" : "host-missing";
            String path = trimTrailingSlash(uri.getPath());
            String pathState = path.endsWith("/v1") ? "path-v1-root" : "path-not-v1-root";
            return hostState + "," + pathState;
        } catch (URISyntaxException exception) {
            return "invalid-uri";
        }
    }

    private record EffectiveEmbeddingConfig(String baseUrl, String apiKey, String model) {
    }

    private record EmbeddingRequest(String model, List<String> input) {
    }

    private record EmbeddingResponse(List<EmbeddingData> data) {
    }

    private record EmbeddingData(List<Double> embedding) {
    }
}
