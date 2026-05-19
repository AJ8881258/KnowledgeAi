package com.knowflow.backend.chat.dto.response;


import com.knowflow.backend.chat.entity.ChatMessage;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * @class 聊天消息响应实体
 * @sessionId 会话ID
 * @role USER/ASSISTANT 角色
 * @content 消息内容
 * @sources 消息来源列表
 * @createdAt 创建时间
 */

@Data
public class ChatMessageResponse {
    private Long id;
    private Long sessionId;
    private String role;
    private String content;
    private List<ChatSourceResponse> sources;
    private OffsetDateTime createdAt;

    public ChatMessageResponse(ChatMessage chatMessage, List<ChatSourceResponse> sources){
        this.id = chatMessage.getId();
        this.sessionId = chatMessage.getSessionId();
        this.role = chatMessage.getRole();
        this.content = chatMessage.getContent();
        this.sources = sources;
        this.createdAt = chatMessage.getCreatedAt();
    }

}
