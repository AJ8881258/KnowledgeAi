package com.knowflow.backend.chat.dto.response;


import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * @class 发送消息响应实体
 * @userMessage 已保存的用户消息
 * @session 当前会话状态
 */

@Data
@NoArgsConstructor
public class SendMessageResponse {
    private ChatMessageResponse userMessage;
    private ChatSessionResponse session;
    private ChatMessageResponse message;

    public SendMessageResponse(ChatMessageResponse message) {
        this.message = message;
    }

    public SendMessageResponse(ChatMessageResponse userMessage, ChatSessionResponse session) {
        this.userMessage = userMessage;
        this.session = session;
    }
}
