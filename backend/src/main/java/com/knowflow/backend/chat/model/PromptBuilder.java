package com.knowflow.backend.chat.model;

import com.knowflow.backend.chat.entity.ChatMessage;
import com.knowflow.backend.document.dto.response.SearchResultResponse;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class PromptBuilder {

    /**
     * 构建聊天模型的 prompt
     * @param question
     * @param chunks
     * @return
     */
    public String build(
            String question, List<SearchResultResponse> chunks
    ) {
        return build(question, chunks, List.of());
    }


    /**
     * 构建聊天模型的 prompt
     * @param question
     * @param chunks
     * @param historyMessages
     * @return
     */
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

    /**
     * @param question        用户刚发送的问题
     * @param historyMessages 当前用户当前会话中允许进入 prompt 的历史消息
     * @return 没有可引用知识库片段时使用的 prompt
     * @Desc 空检索不再跳过模型。与旧逻辑直接保存固定降级文案不同，这里仍调用当前用户自己的模型配置，
     * 但明确告诉模型 sources 为空，回答里要说明“当前没有可引用的知识库片段”，不能伪造资料来源。
     */
    public String buildWithoutSources(String question, List<ChatMessage> historyMessages) {
        String history = historyMessages.stream().map(this::formatHistoryMessage).collect(Collectors.joining("\n"));
        return """
                你是 KnowFlow AI 的知识库问答助手。
                当前没有可引用的知识库片段，最终响应的 sources 会是空数组。
                请先明确说明“当前没有可引用的知识库片段”，再基于用户问题和当前会话历史给出尽量有帮助的回答。
                不要声称回答来自知识库资料，不要编造引用来源、文件名、chunk 或文档内容。
                历史对话（仅限当前用户当前会话的最近消息）：
                %s
                问题：
                %s
                """.formatted(history.isBlank() ? "（无）" : history, question);
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
