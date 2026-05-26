package com.knowflow.backend.knowledgebase.dto.response;


import com.knowflow.backend.knowledgebase.entity.KnowledgeBaseMember;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.OffsetDateTime;

@Data

public class KnowledgeBaseMemberResponse {
    private Long id;
    private Long userId;
    private String username;
    private String role;
    private OffsetDateTime updatedAt;
    private OffsetDateTime createdAt;

    public KnowledgeBaseMemberResponse(KnowledgeBaseMember member) {
        this.id = member.getId();
        this.userId = member.getUserId();
        this.username = member.getUsername();
        this.role = member.getRole();
        this.createdAt = member.getCreatedAt();
        this.updatedAt = member.getUpdatedAt();
    }
}
