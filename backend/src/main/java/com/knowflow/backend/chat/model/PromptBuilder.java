package com.knowflow.backend.chat.model;

import com.knowflow.backend.chat.entity.ChatMessage;
import com.knowflow.backend.document.dto.response.SearchResultResponse;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class PromptBuilder {

    public String build(
            String question, List<SearchResultResponse> chunks
    ) {
        return build(question, chunks, List.of());
    }


    public String build(String question, List<SearchResultResponse> chunks, List<ChatMessage> historyMessages) {
        String history = historyMessages.stream().map(this::formatHistoryMessage).collect(Collectors.joining("\n"));

        String context = chunks.stream().map(chunk ->
                "[来源: %s #%d]\n%s"
                        .formatted(
                                chunk.getDocumentName(),
                                chunk.getChunkIndex(),
                                chunk.getContent()
                        )).collect(Collectors.joining("\n\n"));
        return """
                你是 KnowFlow AI 的知识库问答助手。
                只能根据给定资料回答问题；资料不足时，请明确说“无法从当前资料确认”。
                不要编造没有出现在资料里或当前会话历史里的事实。
                历史对话（仅限当前用户当前会话的最近消息）：
                %s
                资料：
                %s
                问题：
                %s
                """.formatted(history.isBlank() ? "（无）" : history, context, question);
    }

    private String formatHistoryMessage(ChatMessage message) {
        String role = switch (message.getRole()) {
            case "USER" -> "用户";
            case "ASSISTANT" -> "助手";
            default -> message.getRole();
        };
        return "%s：%s".formatted(role, message.getContent());
    }

}
