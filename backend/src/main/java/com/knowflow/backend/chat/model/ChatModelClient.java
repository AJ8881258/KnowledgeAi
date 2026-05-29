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
}
