package com.knowflow.backend.knowledgebase.controller;


import com.knowflow.backend.knowledgebase.dto.request.AddKnowledgeBaseMemberRequest;
import com.knowflow.backend.knowledgebase.dto.request.UpdateKnowledgeBaseMemberRequest;
import com.knowflow.backend.knowledgebase.dto.response.KnowledgeBaseMemberResponse;
import com.knowflow.backend.knowledgebase.entity.KnowledgeBase;
import com.knowflow.backend.knowledgebase.entity.KnowledgeBaseMember;
import com.knowflow.backend.knowledgebase.repository.KnowledgeBaseMemberRepository;
import com.knowflow.backend.knowledgebase.service.KnowledgeBaseAccessService;
import com.knowflow.backend.user.entity.User;
import com.knowflow.backend.user.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static com.knowflow.backend.common.utils.AuthUtils.getCurrentUserId;
import static com.knowflow.backend.common.utils.AuthUtils.normalizeUsername;

@RestController
@RequestMapping("/api/knowledge-bases/{knowledgeBaseId}/members")
public class KnowledgeBaseMemberController {
    private final KnowledgeBaseAccessService accessService;
    private final KnowledgeBaseMemberRepository memberRepository;
    private final UserRepository userRepository;

    public KnowledgeBaseMemberController(
            KnowledgeBaseAccessService accessService,
            KnowledgeBaseMemberRepository memberRepository,
            UserRepository userRepository
    ) {
        this.accessService = accessService;
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
    }

    /**
     * 获取库成员列表
     *
     * @param knowledgeBaseId
     * @param jwt
     * @return
     */
    @GetMapping
    public List<KnowledgeBaseMemberResponse> listMembers(
            @PathVariable Long knowledgeBaseId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        Long userId = getCurrentUserId(jwt);
        accessService.requireOwner(knowledgeBaseId, userId);

        return memberRepository.findAllByKnowledgeBaseId(knowledgeBaseId)
                .stream()
                .map(member -> new KnowledgeBaseMemberResponse(member))
                .toList();
    }

    /**
     * 添加库成员
     * @param knowledgeBaseId
     * @param jwt
     * @param request
     * @return
     */
    @PostMapping
    public KnowledgeBaseMemberResponse addMember(
            @PathVariable Long knowledgeBaseId,
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody AddKnowledgeBaseMemberRequest request
    ) {
        Long currentUserId = getCurrentUserId(jwt);
        KnowledgeBase knowledgeBase = accessService.requireOwner(knowledgeBaseId, currentUserId);

        String username = normalizeUsername(request == null ? null : request.getUsername());
        String role = normalizeAssignableRole(request == null ? null : request.getRole());

        User targetUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "User not found"));

        if(targetUser.getId().equals(knowledgeBase.getCreatedBy())){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Owner already exists");
        }
        if (memberRepository.findByKnowledgeBaseIdAndUserId(knowledgeBaseId, targetUser.getId()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Member already exists");
        }


        KnowledgeBaseMember member = new KnowledgeBaseMember();
        member.setKnowledgeBaseId(knowledgeBaseId);
        member.setUserId(targetUser.getId());
        member.setRole(role);

        int rows = memberRepository.insert(member);
        if (rows != 1) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Add member failed");
        }

        return memberRepository.findByIdAndKnowledgeBaseId(member.getId(), knowledgeBaseId)
                .map(KnowledgeBaseMemberResponse::new)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Member not found"));
    }

    /**
     * 更新库成员角色
     * @param knowledgeBaseId
     * @param memberId
     * @param request
     * @param jwt
     * @return
     */
    @PatchMapping("/{memberId}")
    public KnowledgeBaseMemberResponse updateMemberRole(
            @PathVariable Long knowledgeBaseId,
            @PathVariable Long memberId,
            @RequestBody UpdateKnowledgeBaseMemberRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        Long currentUserId = getCurrentUserId(jwt);
        KnowledgeBase knowledgeBase = accessService.requireOwner(knowledgeBaseId, currentUserId);
        String role = normalizeAssignableRole(request == null ? null : request.getRole());
        KnowledgeBaseMember member = getMemberOr404(knowledgeBaseId, memberId);

        // owner 不能被成员接口降级，避免知识库失去稳定 OWNER。
        if (isOwnerMember(knowledgeBase, member)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Owner cannot be changed");
        }

        int rows = memberRepository.updateRoleByIdAndKnowledgeBaseId(memberId, knowledgeBaseId, role);
        if (rows != 1) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Member not found");
        }

        return memberRepository.findByIdAndKnowledgeBaseId(memberId, knowledgeBaseId)
                .map(KnowledgeBaseMemberResponse::new)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Member not found"));
    }


    /**
     * 移除库成员
     *
     * @param knowledgeBaseId
     * @param memberId
     * @param jwt
     */
    @DeleteMapping("/{memberId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeMember(
            @PathVariable Long knowledgeBaseId,
            @PathVariable Long memberId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        Long currentUserId = getCurrentUserId(jwt);
        KnowledgeBase knowledgeBase = accessService.requireOwner(knowledgeBaseId, currentUserId);
        KnowledgeBaseMember member = getMemberOr404(knowledgeBaseId, memberId);

        if (isOwnerMember(knowledgeBase, member)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Owner cannot be removed");
        }
        int rows = memberRepository.deleteByIdAndKnowledgeBaseId(memberId, knowledgeBaseId);
        if (rows != 1) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Member not found");
        }
    }

    /**
     * 获取库成员
     *
     * @param knowledgeBaseId
     * @param memberId
     * @return
     */
    private KnowledgeBaseMember getMemberOr404(Long knowledgeBaseId, Long memberId) {
        return memberRepository.findByIdAndKnowledgeBaseId(memberId, knowledgeBaseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Member not found"));
    }

    /**
     * 判断用户是否是库的所有者
     *
     * @param knowledgeBase
     * @param member
     * @return
     */
    private boolean isOwnerMember(KnowledgeBase knowledgeBase, KnowledgeBaseMember member) {
        return KnowledgeBaseAccessService.ROLE_OWNER.equals(member.getRole())
                || member.getUserId().equals(knowledgeBase.getCreatedBy());
    }


    /**
     * 角色判断是否有效是否可分配
     *
     * @param role
     * @return
     */
    private String normalizeAssignableRole(String role) {
        if (role == null || role.trim().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "role cannot be blank");
        }
        String normalized = role.trim().toUpperCase();
        if (!KnowledgeBaseAccessService.ROLE_EDITOR.equals(normalized)
                && !KnowledgeBaseAccessService.ROLE_VIEWER.equals(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "role must be EDITOR or VIEWER");
        }
        return normalized;
    }
}
