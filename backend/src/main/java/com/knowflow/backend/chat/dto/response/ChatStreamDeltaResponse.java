package com.knowflow.backend.chat.dto.response;

/**
 * @param messageId 正在边流边保存的 ASSISTANT 消息 ID
 * @param delta 本次模型返回的新文本片段
 * @param content 后端已保存到 chat_messages.content 的完整当前内容
 * @Desc 前端以 content 为准覆盖同一条助手消息，避免 delta 丢失导致 UI 和数据库不一致。
 */
public record ChatStreamDeltaResponse(Long messageId, String delta, String content) {
}
