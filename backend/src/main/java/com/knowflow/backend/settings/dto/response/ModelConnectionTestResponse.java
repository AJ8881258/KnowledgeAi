package com.knowflow.backend.settings.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ModelConnectionTestResponse {
    /** 测试是否成功；true 表示供应商 chat completions 返回了可解析的 assistant 内容。 */
    private boolean success;

    /** 脱敏后的测试结果说明；失败时也不能包含 API Key、Authorization header、完整 Base URL 或模型名。 */
    private String message;
}
