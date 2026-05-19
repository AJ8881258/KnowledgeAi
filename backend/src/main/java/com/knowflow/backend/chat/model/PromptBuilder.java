package com.knowflow.backend.chat.model;

import com.knowflow.backend.document.SearchResultResponse;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class PromptBuilder {
    public String build(String question, List<SearchResultResponse> chunks) {
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
                不要编造没有出现在资料里的事实。
                
                资料：
                %s
                
                问题：
                %s
                """.formatted(context, question);
    }

}
