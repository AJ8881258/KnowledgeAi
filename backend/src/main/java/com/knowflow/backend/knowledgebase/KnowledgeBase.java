package com.knowflow.backend.knowledgebase;

import java.time.OffsetDateTime;

import lombok.Data;

@Data
public class KnowledgeBase {
    private Long id;
    private String name;
    private String description;
    private String status;
    private Boolean featured;
    private String themeId;
    private Long createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
