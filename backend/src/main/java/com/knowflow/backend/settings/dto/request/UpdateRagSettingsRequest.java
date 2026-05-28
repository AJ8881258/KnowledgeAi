package com.knowflow.backend.settings.dto.request;

import lombok.Data;

/**
 * 更新用户RAG设置请求
 */
@Data
public class UpdateRagSettingsRequest {
    private Integer topK;//控制检索阶段最多取多少个 chunk
    private Integer maxContextChunks;//控制真正进入 prompt 和引用来源保存的 chunk 数量
    private Double temperature;//控制生成文本的随机性
}
