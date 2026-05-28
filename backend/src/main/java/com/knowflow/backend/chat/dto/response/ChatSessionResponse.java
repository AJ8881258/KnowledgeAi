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
    private Boolean unread;
    private String status;
    /**
     * 最近一次后台生成失败的脱敏错误。
     * 只在 session.status = FAILED 时给前端展示，不包含 API Key、Authorization、完整 Base URL、model 或供应商原始错误。
     */
    private String lastErrorMessage;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public ChatSessionResponse(ChatSession chatSession) {
        this.id = chatSession.getId();
        this.knowledgeBaseId = chatSession.getKnowledgeBaseId();
        this.title = chatSession.getTitle();
        this.pinned = chatSession.getPinned();
        this.unread = chatSession.getUnread();
        this.status = chatSession.getStatus();
        this.lastErrorMessage = chatSession.getLastErrorMessage();
        this.createdAt = chatSession.getCreatedAt();
        this.updatedAt = chatSession.getUpdatedAt();
    }
}


