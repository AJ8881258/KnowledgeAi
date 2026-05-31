package com.knowflow.backend.chat.dto.response;

/**
 * @param message 最终助手消息，包含完整回答和 sources
 * @param session 生成完成后的最新会话状态
 * @Desc 流式 done 事件让前端一次性对齐消息、引用来源和会话状态。
 */
public record ChatStreamDoneResponse(ChatMessageResponse message, ChatSessionResponse session) {
}
