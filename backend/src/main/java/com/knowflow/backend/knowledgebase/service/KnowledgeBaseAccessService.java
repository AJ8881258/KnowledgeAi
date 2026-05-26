package com.knowflow.backend.knowledgebase.service;

import com.knowflow.backend.knowledgebase.entity.KnowledgeBase;
import com.knowflow.backend.knowledgebase.repository.KnowledgeBaseRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class KnowledgeBaseAccessService {
    public static final String ROLE_OWNER = "OWNER";
    public static final String ROLE_EDITOR = "EDITOR";
    public static final String ROLE_VIEWER = "VIEWER";

    private final KnowledgeBaseRepository knowledgeBaseRepository;

    public KnowledgeBaseAccessService(KnowledgeBaseRepository knowledgeBaseRepository) {
        this.knowledgeBaseRepository = knowledgeBaseRepository;
    }

    public KnowledgeBase requireMember(Long knowledgeBaseId, Long userId) {
        return knowledgeBaseRepository.findAccessibleById(knowledgeBaseId, userId)
                // 阶段 12：非成员统一返回 404，避免通过 ID 探测知识库是否存在。
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Knowledge base not found"));
    }

    public KnowledgeBase requireEditor(Long knowledgeBaseId, Long userId) {
        KnowledgeBase knowledgeBase = requireMember(knowledgeBaseId, userId);
        String role = knowledgeBase.getAccessRole();

        // VIEWER 可以查看、搜索和 Chat，但不能执行写操作。
        if (!ROLE_OWNER.equals(role) && !ROLE_EDITOR.equals(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Permission denied");
        }
        return knowledgeBase;
    }

    public KnowledgeBase requireOwner(Long knowledgeBaseId, Long userId) {
        KnowledgeBase knowledgeBase = requireMember(knowledgeBaseId, userId);

        // 成员存在但不是 OWNER 时返回 403，和非成员 404 区分开。
        if (!ROLE_OWNER.equals(knowledgeBase.getAccessRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Permission denied");
        }
        return knowledgeBase;
    }
}
