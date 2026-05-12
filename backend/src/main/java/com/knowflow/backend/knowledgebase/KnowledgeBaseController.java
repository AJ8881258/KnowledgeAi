package com.knowflow.backend.knowledgebase;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
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

// @RestController 表示这是 REST API 控制器
// 方法返回的对象会自动转换成 JSON
@RestController
// 这个 Controller 下面所有接口都以 /api/knowledge-bases 开头
@RequestMapping("/api/knowledge-bases")
public class KnowledgeBaseController {

    // 注入 Repository，用它查询数据库
    private final KnowledgeBaseRepository knowledgeBaseRepository;

    // 构造器注入
    // Spring 会自动把 KnowledgeBaseRepository 传进来
    public KnowledgeBaseController(KnowledgeBaseRepository knowledgeBaseRepository) {
        this.knowledgeBaseRepository = knowledgeBaseRepository;
    }

    // 查询用户所有创建的知识库
    @GetMapping
    public List<KnowledgeBase> listKnowledgeBases(@AuthenticationPrincipal Jwt jwt) {
        Long userId = getCurrentUserId(jwt);
        return knowledgeBaseRepository.findAllByCreatedBy(userId);
    }

    // 查询指定 ID 的知识库
    @GetMapping("/{id}")
    public KnowledgeBase getKnowledgeBase(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {
        Long userId = getCurrentUserId(jwt);
        return knowledgeBaseRepository.findByIdAndCreatedBy(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Knowledge base not found"));
    }

    // 创建当前登录用户自己的知识库
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
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
        return knowledgeBaseRepository.findByIdAndCreatedBy(knowledgeBase.getId(), userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.INTERNAL_SERVER_ERROR,
                        "Create knowledge base not found"));
    }

    // 修改知识库
    @PatchMapping("/{id}")
    public KnowledgeBase updateKnowledgeBase(
            @PathVariable Long id,
            @RequestBody UpdateKnowledgeBaseRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        Long userId = getCurrentUserId(jwt);
        String name = getRequiredName(request == null ? null : request.getName());
        String description = normalizedDescription(request == null ? null : request.getDescription());
        Boolean featured = request != null && Boolean.TRUE.equals(request.getFeatured());
        String themeId = normalizedThemeId(request == null ? null : request.getThemeId());

        int rows = knowledgeBaseRepository.updateByIdAndCreatedBy(id, userId, name, description, featured, themeId);
        if (rows != 1) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Knowledge base not found");
        }
        return knowledgeBaseRepository.findByIdAndCreatedBy(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Knowledge base not found"));
    }

    // 删除知识库
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteKnowledgeBase(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {
        Long userId = getCurrentUserId(jwt);
        int rows = knowledgeBaseRepository.deleteByIdAndCreatedBy(id, userId);
        if (rows != 1) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Knowledge base not found");
        }
    }

    private Long getCurrentUserId(Jwt jwt) {
        if (jwt == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing token");
        }
        Number userId = jwt.getClaim("userId");
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing userId claim");
        }
        return userId.longValue();
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
