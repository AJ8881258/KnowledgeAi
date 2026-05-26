package com.knowflow.backend.knowledgebase.controller;

import com.knowflow.backend.knowledgebase.dto.request.CreateKnowledgeBaseRequest;
import com.knowflow.backend.knowledgebase.dto.request.UpdateKnowledgeBaseRequest;
import com.knowflow.backend.knowledgebase.entity.KnowledgeBase;
import com.knowflow.backend.knowledgebase.entity.KnowledgeBaseMember;
import com.knowflow.backend.knowledgebase.repository.KnowledgeBaseMemberRepository;
import com.knowflow.backend.knowledgebase.repository.KnowledgeBaseRepository;
import com.knowflow.backend.knowledgebase.service.KnowledgeBaseAccessService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static com.knowflow.backend.common.utils.AuthUtils.getCurrentUserId;

@RestController
@RequestMapping("/api/knowledge-bases")
public class KnowledgeBaseController {

    private final KnowledgeBaseRepository knowledgeBaseRepository;
    private final KnowledgeBaseMemberRepository memberRepository;
    private final KnowledgeBaseAccessService accessService;

    public KnowledgeBaseController(
            KnowledgeBaseRepository knowledgeBaseRepository,
            KnowledgeBaseMemberRepository memberRepository,
            KnowledgeBaseAccessService accessService) {
        this.knowledgeBaseRepository = knowledgeBaseRepository;
        this.memberRepository = memberRepository;
        this.accessService = accessService;
    }

    @GetMapping
    public List<KnowledgeBase> listKnowledgeBases(@AuthenticationPrincipal Jwt jwt) {
        Long userId = getCurrentUserId(jwt);
        return knowledgeBaseRepository.findAllAccessibleByUserId(userId);
    }

    @GetMapping("/{id}")
    public KnowledgeBase getKnowledgeBase(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {
        Long userId = getCurrentUserId(jwt);
        return accessService.requireMember(id, userId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public KnowledgeBase createKnowledgeBase(
            @RequestBody CreateKnowledgeBaseRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        Long userId = getCurrentUserId(jwt);
        String name = getRequiredName(request == null ? null : request.getName());
        String description = normalizedDescription(request == null ? null : request.getDescription());
        Boolean featured = request != null && Boolean.TRUE.equals(request.getFeatured());
        String themeId = normalizedThemeId(request == null ? null : request.getThemeId());

        KnowledgeBase knowledgeBase = new KnowledgeBase();
        knowledgeBase.setName(name);
        knowledgeBase.setDescription(description);
        knowledgeBase.setStatus("ACTIVE");
        knowledgeBase.setCreatedBy(userId);
        knowledgeBase.setFeatured(featured);
        knowledgeBase.setThemeId(themeId);

        int rows = knowledgeBaseRepository.insert(knowledgeBase);
        if (rows != 1) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Create knowledge base failed");
        }

        KnowledgeBaseMember ownerMember = new KnowledgeBaseMember();
        ownerMember.setKnowledgeBaseId(knowledgeBase.getId());
        ownerMember.setUserId(userId);
        ownerMember.setRole(KnowledgeBaseAccessService.ROLE_OWNER);

        // 阶段 12：创建者不再只靠 created_by 表示权限，同时写入 OWNER 成员记录。
        int memberRows = memberRepository.insert(ownerMember);
        if (memberRows != 1) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Create owner membership failed");
        }

        return knowledgeBaseRepository.findAccessibleById(knowledgeBase.getId(), userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.INTERNAL_SERVER_ERROR,
                        "Create knowledge base not found"));
    }

    @PatchMapping("/{id}")
    public KnowledgeBase updateKnowledgeBase(
            @PathVariable Long id,
            @RequestBody UpdateKnowledgeBaseRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        Long userId = getCurrentUserId(jwt);

        // OWNER / EDITOR 可以编辑；VIEWER 是成员但权限不足，返回 403。
        accessService.requireEditor(id, userId);

        String name = getRequiredName(request == null ? null : request.getName());
        String description = normalizedDescription(request == null ? null : request.getDescription());
        Boolean featured = request != null && Boolean.TRUE.equals(request.getFeatured());
        String themeId = normalizedThemeId(request == null ? null : request.getThemeId());

        int rows = knowledgeBaseRepository.updateById(id, name, description, featured, themeId);
        if (rows != 1) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Knowledge base not found");
        }

        return knowledgeBaseRepository.findAccessibleById(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Knowledge base not found"));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteKnowledgeBase(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {
        Long userId = getCurrentUserId(jwt);

        // 删除知识库会影响所有成员和文档，阶段 12 只允许 OWNER。
        accessService.requireOwner(id, userId);

        int rows = knowledgeBaseRepository.deleteById(id);
        if (rows != 1) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Knowledge base not found");
        }
    }

    private String getRequiredName(String name) {
        if (name == null || name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Knowledge base name is required");
        }
        return name.trim();
    }

    private String normalizedDescription(String description) {
        if (description == null) {
            return null;
        }
        String trimmed = description.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizedThemeId(String themeId) {
        if (themeId == null) {
            return "blue";
        }
        String trimmed = themeId.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
