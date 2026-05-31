package com.knowflow.backend.chat.dto.response;

/**
 * @param message 脱敏后的用户可读错误
 * @Desc SSE error 事件只返回白名单错误文案，不能包含 API Key、Base URL、model 或 Authorization。
 */
public record ChatStreamErrorResponse(String message) {
}
