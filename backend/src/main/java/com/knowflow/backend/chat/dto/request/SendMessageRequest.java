package com.knowflow.backend.chat.dto.request;

import lombok.Data;

/**
 * Chat 发送消息请求。
 *
 * @param content 用户本轮问题正文，不能为空。
 * @param limit 保留兼容字段，当前异步 RAG 生成以用户 Settings 的 topK/maxContextChunks 为准。
 * @param model 可选的本次生成模型 ID；传入时后端会同步保存为当前用户 Settings 的当前模型。
 * @param ragEnabled 可选的 RAG 开关；未传时默认启用，false 时跳过知识库检索，只用当前会话和模型回答。
 */
@Data
public class SendMessageRequest {
    private String content;
    private Integer limit;
    private String model;
    private Boolean ragEnabled;
}
