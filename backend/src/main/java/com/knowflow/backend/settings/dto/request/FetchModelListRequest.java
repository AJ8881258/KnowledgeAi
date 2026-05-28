package com.knowflow.backend.settings.dto.request;

import lombok.Data;

@Data
public class FetchModelListRequest {
    /** 本次获取模型列表使用的 OpenAI-compatible Base URL；为空时后端复用当前用户已保存的 Base URL。 */
    private String baseUrl;

    /** 本次获取模型列表使用的临时 API Key；为空时后端复用当前用户已保存并解密后的 API Key。 */
    private String apiKey;
}
