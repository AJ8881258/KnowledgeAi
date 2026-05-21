package com.knowflow.backend.chat.model;

import com.knowflow.backend.config.AiProperties;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;


/**
 * OpenAI 兼容的聊天模型客户端
 */
@Component
public class OpenAiCompatibleChatModelClient implements ChatModelClient {
    private final AiProperties properties; //AI配置
    private final RestClient restClient;// REST客户端

    public OpenAiCompatibleChatModelClient(AiProperties properties) {
        this.properties = properties;
//        给所有请求默认加 Authorization 请求头，值为 Bearer API_KEY
        this.restClient = RestClient.builder().baseUrl(properties.getBaseUrl()).defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + properties.getApiKey()).build();
    }

    @Override
    public String chat(String prompt,double temperature) {
        if (properties.getBaseUrl() == null || properties.getBaseUrl().isBlank() || properties.getModel() == null || properties.getModel().isBlank()) {
            throw new IllegalStateException("AI Model config is incomplete");
        }
        try {
            ChatCompletionResponse response = restClient.post().uri("/chat/completions").body(new ChatCompletionRequest(properties.getModel(), List.of(new ChatCompletionMessage("user", prompt)), temperature)).retrieve().body(ChatCompletionResponse.class);
            if (response == null || response.choices() == null || response.choices().isEmpty()) {
                throw new IllegalStateException("AI Model response is empty");
            }
            return response.choices().getFirst().message().content();
        } catch (RuntimeException exception) {
            throw new IllegalStateException("AI Model call failed", exception);
        }
    }

    private record ChatCompletionRequest(String model, List<ChatCompletionMessage> messages, double temperature) {
    }

    private record ChatCompletionMessage(String role, String content) {
    }

    private record ChatCompletionResponse(List<ChatCompletionChoice> choices) {
    }

    private record ChatCompletionChoice(ChatCompletionMessage message) {
    }
}
