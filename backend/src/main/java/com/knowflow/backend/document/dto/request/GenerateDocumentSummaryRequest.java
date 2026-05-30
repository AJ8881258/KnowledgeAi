package com.knowflow.backend.document.dto.request;

import lombok.Data;

/**
 * 文档摘要生成请求。
 *
 * <p>maxLength 表示前端希望返回的摘要最大字符数。后端会把它裁剪到安全范围内，
 * 同时在 prompt 中提醒模型控制长度，避免摘要过长撑破文档详情布局。</p>
 */
@Data
public class GenerateDocumentSummaryRequest {
    private Integer maxLength;
}
