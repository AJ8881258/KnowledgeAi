package com.knowflow.backend.common.model;

import org.springframework.web.server.ResponseStatusException;

import java.util.Set;

/**
 * 模型供应商错误的统一脱敏语义。
 *
 * <p>关键参数 statusCode 表示 OpenAI-compatible 供应商返回的 HTTP 状态码；这里不会解析或返回供应商原始
 * error body，因为 body 里可能包含 API Key、Authorization header、完整 Base URL 或模型名。与旧逻辑只返回
 * “AI model call failed” 不同，本类只对白名单场景给出可读提示，其他异常仍回落到通用脱敏错误。</p>
 */
public final class ModelProviderErrors {
    public static final String MODEL_AUTH_FAILED_MESSAGE = "模型供应商鉴权失败，请检查 API Key 是否有效";
    public static final String MODEL_NOT_AVAILABLE_MESSAGE = "模型不存在或当前 API Key 无权访问该模型";
    public static final String MODEL_CONFIG_INCOMPLETE_MESSAGE = "模型配置不完整，请先在设置中保存 Base URL、API Key 和 Model";
    public static final String MODEL_CALL_FAILED_MESSAGE = "AI model call failed";

    private static final Set<String> SAFE_MODEL_MESSAGES = Set.of(
            MODEL_AUTH_FAILED_MESSAGE,
            MODEL_NOT_AVAILABLE_MESSAGE,
            MODEL_CONFIG_INCOMPLETE_MESSAGE,
            MODEL_CALL_FAILED_MESSAGE
    );

    private ModelProviderErrors() {
    }

    /**
     * @param statusCode 供应商 HTTP 状态码；401/403 表示鉴权失败，404 通常表示模型不存在或 Key 无权限
     * @return 可以写入 lastErrorMessage 或接口响应的脱敏提示
     */
    public static String messageForStatus(int statusCode) {
        if (statusCode == 401 || statusCode == 403) {
            return MODEL_AUTH_FAILED_MESSAGE;
        }
        if (statusCode == 404) {
            return MODEL_NOT_AVAILABLE_MESSAGE;
        }
        return MODEL_CALL_FAILED_MESSAGE;
    }

    /**
     * @param exception 模型调用链路抛出的异常，可能直接是 ResponseStatusException，也可能被事务模板包装
     * @return 白名单内的脱敏错误；如果异常原因不是本类定义的安全文案，则返回通用错误
     * @Desc 后台异步生成失败时只把安全文案落库，避免把供应商原始错误、密钥或完整地址写入 session。
     */
    public static String safeMessage(Throwable exception) {
        Throwable current = exception;
        while (current != null) {
            if (current instanceof ResponseStatusException responseStatusException
                    && isSafeMessage(responseStatusException.getReason())) {
                return responseStatusException.getReason();
            }
            current = current.getCause();
        }
        return MODEL_CALL_FAILED_MESSAGE;
    }

    /**
     * @param message 待判断的错误文案
     * @return true 表示该文案由后端生成且不包含敏感配置，可以返回给前端或写入 last_error_message
     */
    public static boolean isSafeMessage(String message) {
        return message != null && SAFE_MODEL_MESSAGES.contains(message);
    }
}
