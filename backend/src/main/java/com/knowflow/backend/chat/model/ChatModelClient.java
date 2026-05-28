package com.knowflow.backend.chat.model;


/**
 * 聊天模型客户端接口
 */
public interface ChatModelClient {
    String chat(Long userId, String prompt, double temperature);
}
