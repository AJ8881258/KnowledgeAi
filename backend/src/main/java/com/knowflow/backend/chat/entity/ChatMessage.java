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
    private OffsetDateTime createdAt;
}
