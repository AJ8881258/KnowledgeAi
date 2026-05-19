package com.knowflow.backend.chat.dto.response;


import lombok.Data;

/**
 * @class 发送消息响应实体
 * @message 聊天消息响应实体
 */

@Data
public class SendMessageResponse {
    private ChatMessageResponse message;

    public SendMessageResponse(ChatMessageResponse message) {
        this.message = message;
    }
}
