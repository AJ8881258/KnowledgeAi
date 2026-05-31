package com.knowflow.backend.chat.model;

/**
 * Chat 模型客户端接口。
 *
 * @param userId 当前 JWT 用户 ID，用于读取该用户自己的 Base URL/API Key/Model 配置。
 * @param prompt 已构造好的 RAG prompt。
 * @param temperature 本次生成温度，来自当前用户 RAG Settings。
 * @param modelOverride 可选的本次请求模型；传入时只覆盖模型 ID，不覆盖当前用户的 Base URL/API Key。
 */
public interface ChatModelClient {
    String chat(Long userId, String prompt, double temperature);

    default String chat(Long userId, String prompt, double temperature, String modelOverride) {
        return chat(userId, prompt, temperature);
    }

    /**
     * @param userId 当前 JWT 用户 ID，用于读取该用户自己的模型配置。
     * @param prompt 已构造好的 RAG prompt。
     * @param temperature 当前用户 RAG Settings 中的温度。
     * @param modelOverride 本次请求选择的模型；只覆盖 model，不覆盖 Base URL/API Key。
     * @param deltaConsumer 每收到一个模型 token/delta 就调用一次。
     * @Desc 阶段 21 的 SSE Chat 使用该方法边读取供应商流式响应、边写入数据库、边推送前端。
     */
    default void stream(Long userId, String prompt, double temperature, String modelOverride, java.util.function.Consumer<String> deltaConsumer) {
        deltaConsumer.accept(chat(userId, prompt, temperature, modelOverride));
    }
}
