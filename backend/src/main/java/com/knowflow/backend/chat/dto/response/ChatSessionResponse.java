package com.knowflow.backend.chat.dto.response;

import com.knowflow.backend.chat.entity.ChatSession;
import lombok.Data;

import java.time.OffsetDateTime;

/**
 * @class 聊天会话响应实体
 * @id 聊天会话ID
 * @knowledgeBaseId 知识库ID
 * @title 聊天会话标题
 * @createdAt 创建时间
 * @updatedAt 更新时间
 */

@Data
public class ChatSessionResponse {
    private Long id;
    private Long knowledgeBaseId;
    private String title;
    private Boolean pinned;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public ChatSessionResponse(ChatSession chatSession) {
        this.id = chatSession.getId();
        this.knowledgeBaseId = chatSession.getKnowledgeBaseId();
        this.title = chatSession.getTitle();
        this.pinned = chatSession.getPinned();
        this.createdAt = chatSession.getCreatedAt();
        this.updatedAt = chatSession.getUpdatedAt();
    }
}


