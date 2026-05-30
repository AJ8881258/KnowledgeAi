package com.knowflow.backend.document.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * 文档质量指标响应。
 *
 * <p>这些字段只描述当前已入库 chunks 的可检索文本质量，不改变检索排序。
 * status 和 updatedAt 来自 documents 表，表示当前文档处理状态和最后更新时间；
 * chunkCount 是片段数量，charCount 是所有片段字符数总和，average/min/max
 * 用于帮助用户判断切片是否过短、过长或没有有效内容。</p>
 */
@Data
@AllArgsConstructor
public class DocumentQualityResponse {
    private Long documentId;
    private String status;
    private Long chunkCount;
    private Long charCount;
    private Double averageChunkLength;
    private Integer minChunkLength;
    private Integer maxChunkLength;
    private List<String> qualityWarnings;
    private OffsetDateTime updatedAt;
}
