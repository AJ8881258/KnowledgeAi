package com.knowflow.backend.settings.dto.request;

import lombok.Data;

@Data
public class TestModelConnectionRequest {
    /** 本次测试临时使用的 OpenAI-compatible Base URL；为空时复用当前用户已保存的 Base URL。 */
    private String baseUrl;

    /** 本次测试临时使用的 API Key；为空时复用当前用户已保存并由后端解密后的 API Key。 */
    private String apiKey;

    /** 本次测试临时使用的模型 ID；为空时复用当前用户已保存的 Model。 */
    private String model;
}
