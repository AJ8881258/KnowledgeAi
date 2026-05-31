package com.knowflow.backend.auth.service;

import com.knowflow.backend.auth.dto.request.UpdateCurrentUserRequest;
import com.knowflow.backend.auth.dto.response.UserResponse;
import com.knowflow.backend.auth.avatar.AvatarStorageService;
import com.knowflow.backend.user.entity.User;
import com.knowflow.backend.user.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MultipartFile;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final AvatarStorageService avatarStorageService;

    public AuthService(UserRepository userRepository, AvatarStorageService avatarStorageService) {
        this.userRepository = userRepository;
        this.avatarStorageService = avatarStorageService;
    }

    /**
     * @param userId
     * @return
     * @Desc 获取当前用户信息
     */
    public UserResponse getCurrentUser(Long userId) {
        User user = findCurrentUserOr401(userId);
        return toResponse(user);
    }


    /**
     * @param userId
     * @param request
     * @return
     * @Desc 更新当前用户信息
     */
    @Transactional
    public UserResponse updateCurrentUser(Long userId, UpdateCurrentUserRequest request) {
        findCurrentUserOr401(userId);
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request body is required");
        }
        String email = normalizeEmail(request.getEmail());
        if (email != null && userRepository.existsByEmailForOtherUser(email, userId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is already used");
        }

        int updatedRows = userRepository.updateEmailById(userId, email);
        if (updatedRows != 1) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found");
        }
        return getCurrentUser(userId);
    }


    /**
     * @param userId 用户ID
     * @Desc 删除当前用户账号，
     * 包括所有关联的会话、消息、引用来源、文档和 chunks、知识库
     */
    @Transactional
    public void deleteCurrentUser(Long userId) {
        User user = findCurrentUserOr401(userId);
        avatarStorageService.delete(user.getAvatarObjectKey());

        //删除当前用户的会话、消息、引用来源。
        userRepository.deleteChatSessionsByUserId(userId);
        //删除当前用户的文档和 chunks。
        userRepository.deleteDocumentsByCreatedBy(userId);
        // 功能点：删除当前用户的知识库。
        userRepository.deleteKnowledgeBasesByCreatedBy(userId);

        int deletedRows = userRepository.deleteById(userId);
        if (deletedRows != 1) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Delete account failed");
        }
    }

    /**
     * @param userId 当前 JWT 用户 ID
     * @param file 头像文件，支持 jpeg/png/webp，最大 2MB
     * @return 更新后的用户资料，包含短期签名 avatarUrl
     * @Desc 头像文件上传到 OSS，数据库只保存 object key。旧头像删除为尽力操作，避免用户资料更新被旧对象删除失败阻塞。
     */
    @Transactional
    public UserResponse uploadAvatar(Long userId, MultipartFile file) {
        User user = findCurrentUserOr401(userId);
        String objectKey = avatarStorageService.upload(userId, file);
        int updatedRows = userRepository.updateAvatarObjectKeyById(userId, objectKey);
        if (updatedRows != 1) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found");
        }
        avatarStorageService.delete(user.getAvatarObjectKey());
        return getCurrentUser(userId);
    }

    /**
     * @param userId 当前 JWT 用户 ID
     * @return 清空头像后的用户资料
     * @Desc 删除头像不会向前端暴露 OSS object key；前端只看到 avatarConfigured=false。
     */
    @Transactional
    public UserResponse deleteAvatar(Long userId) {
        User user = findCurrentUserOr401(userId);
        int updatedRows = userRepository.clearAvatarObjectKeyById(userId);
        if (updatedRows != 1) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found");
        }
        avatarStorageService.delete(user.getAvatarObjectKey());
        return getCurrentUser(userId);
    }

    /**
     * @param userId 用户ID
     * @return 用户实体
     * @Desc 查找当前用户，如果用户不存在则抛出401异常
     */
    private User findCurrentUserOr401(Long userId) {
        return userRepository.findById(userId).orElseThrow(
                () -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found")
        );
    }

    /**
     * @param user 用户实体
     * @return UserResponse 用户响应DTO
     * @Desc 输出用户信息
     */
    private UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getRole(),
                user.getEmail(),
                avatarStorageService.createSignedUrl(user.getAvatarObjectKey()),
                user.getAvatarObjectKey() != null && !user.getAvatarObjectKey().isBlank()
        );
    }


    /**
     * 格式化判断邮箱是否有效
     *
     * @param email
     * @return
     */
    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            return null;
        }
        String normalized = email.trim().toLowerCase();
        if (normalized.length() > 254) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is too long");
        }
        if (!normalized.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is invalid");
        }
        return normalized;
    }
}
