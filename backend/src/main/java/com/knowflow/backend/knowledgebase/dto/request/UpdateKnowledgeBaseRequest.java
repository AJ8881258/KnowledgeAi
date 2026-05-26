package com.knowflow.backend.knowledgebase.dto.request;

import lombok.Data;

@Data
public class UpdateKnowledgeBaseRequest {

    private String name;
    private String description;
    private Boolean featured;
    private String themeId;
}
