package com.knowflow.backend.chat.dto.request;


import lombok.Data;

/**
 * @class 创建聊天会话请求实体
 * @title 会话标题
 */

@Data
public class CreateChatSessionRequest {
    private String title;
}
