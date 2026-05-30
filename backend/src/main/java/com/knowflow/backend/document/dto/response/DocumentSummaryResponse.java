package com.knowflow.backend.document.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.OffsetDateTime;

/**
 * 文档摘要生成结果。
 *
 * <p>summary 是模型基于当前文档 chunks 生成的文档级说明，只保存到 documents 表，
 * 不写入 chat_message_sources，因此不会被 Chat 当作引用来源。</p>
 */
@Data
@AllArgsConstructor
public class DocumentSummaryResponse {
    private Long documentId;
    private String summary;
    /**
     * 摘要最后生成或覆盖的时间。响应使用通用 updatedAt 字段，便于前端和其他资源更新时间统一处理。
     */
    private OffsetDateTime updatedAt;
}
