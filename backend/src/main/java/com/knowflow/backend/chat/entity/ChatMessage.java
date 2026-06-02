package com.knowflow.backend.chat.entity;

import lombok.Data;

import java.time.OffsetDateTime;

/**
 * @class 聊天消息实体
 * @sessionId 会话ID
 * @role USER/ASSISTANT 角色
 */
@Data
public class ChatMessage {
    private Long  id;
    private Long sessionId;
    private String role;
    private String content;
    /**
     * 流式生成专用的本次生成 ID。普通 USER 消息和非流式 ASSISTANT 消息保持为空；
     * 手动打断时后端用它精确删除当前未完成的 ASSISTANT partial，避免误删历史已完成回答。
     */
    private String generationId;
    private OffsetDateTime createdAt;
}
