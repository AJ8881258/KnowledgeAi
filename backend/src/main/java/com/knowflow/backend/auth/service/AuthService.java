package com.knowflow.backend.auth.service;

import com.knowflow.backend.auth.dto.request.UpdateCurrentUserRequest;
import com.knowflow.backend.auth.dto.request.UpdateAvatarPresetRequest;
import com.knowflow.backend.auth.dto.response.UserResponse;
import com.knowflow.backend.auth.dto.response.UserResponse.AvatarSource;
import com.knowflow.backend.auth.avatar.AvatarStorageService;
import com.knowflow.backend.user.entity.User;
import com.knowflow.backend.user.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MultipartFile;

import java.util.Set;

@Service
public class AuthService {
    private static final Set<String> ALLOWED_AVATAR_PRESET_IDS = Set.of(
            "blue", "green", "coral", "violet", "mint", "rose", "amber", "slate"
    );
    private static final String PHONE_ALLOWED_PATTERN = "^[0-9+\\-() ]+$";

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
     * Updates editable profile fields for the current JWT user.
     *
     * <p>{@code username}, {@code email} and {@code phone} are optional, but clients must
     * submit at least one editable field. A missing field keeps the current value, while
     * explicit {@code null} or blank email/phone clears that contact field. Username remains
     * the login and collaboration identifier, so it is trimmed, length-limited and checked
     * for conflicts with other users before persistence.</p>
     *
     * @param userId current JWT user id
     * @param request profile patch request
     * @return latest user profile without password hash, OSS object key or secrets
     */
    @Transactional
    public UserResponse updateCurrentUser(Long userId, UpdateCurrentUserRequest request) {
        User user = findCurrentUserOr401(userId);
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request body is required");
        }
        if (!request.isUsernamePresent() && !request.isEmailPresent() && !request.isPhonePresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No profile field to update");
        }
        String username = normalizeUsernameForProfile(
                request.isUsernamePresent() ? request.getUsername() : user.getUsername()
        );
        String email = request.isEmailPresent() ? normalizeEmail(request.getEmail()) : user.getEmail();
        String phone = request.isPhonePresent() ? normalizePhone(request.getPhone()) : user.getPhone();
        if (userRepository.existsByUsernameForOtherUser(username, userId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username is already used");
        }
        if (email != null && userRepository.existsByEmailForOtherUser(email, userId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is already used");
        }

        int updatedRows = userRepository.updateProfileById(userId, username, email, phone);
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
     * @param request 默认头像选择请求，avatarPresetId 必须在固定 allow-list 中
     * @return 更新后的用户资料；avatarSource 为 PRESET，avatarUrl 为空
     * @Desc 默认头像是本地预设，不依赖外部存储。选择预设会清空上传头像 object key，并尽力删除旧 OSS 对象；
     * 与上传头像互斥可以避免 Header/Sidebar 在刷新后同时看到两个头像来源。
     */
    @Transactional
    public UserResponse updateAvatarPreset(Long userId, UpdateAvatarPresetRequest request) {
        User user = findCurrentUserOr401(userId);
        String avatarPresetId = normalizeAvatarPresetId(request == null ? null : request.getAvatarPresetId());
        int updatedRows = userRepository.updateAvatarPresetById(userId, avatarPresetId);
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
        boolean hasUploadedAvatar = hasText(user.getAvatarObjectKey());
        boolean hasPresetAvatar = hasText(user.getAvatarPresetId());
        AvatarSource avatarSource = hasUploadedAvatar
                ? AvatarSource.UPLOAD
                : hasPresetAvatar ? AvatarSource.PRESET : AvatarSource.NONE;
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getRole(),
                user.getEmail(),
                user.getPhone(),
                hasUploadedAvatar ? avatarStorageService.createSignedUrl(user.getAvatarObjectKey()) : null,
                avatarSource != AvatarSource.NONE,
                avatarStorageService.isConfigured(),
                avatarSource,
                avatarSource == AvatarSource.PRESET ? user.getAvatarPresetId() : null
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

    /**
     * Normalizes a submitted profile username before persistence.
     *
     * <p>The username is still used for login and knowledge-base collaboration, so
     * blank values and values over 100 characters are rejected here. Uniqueness is
     * checked by the caller so the current user's own username can be excluded.</p>
     *
     * @param username submitted username from the Settings profile editor
     * @return trimmed username ready for uniqueness checking and persistence
     */
    private String normalizeUsernameForProfile(String username) {
        if (username == null || username.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username is required");
        }
        String normalized = username.trim();
        if (normalized.length() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username is too long");
        }
        return normalized;
    }

    /**
     * Normalizes the optional Settings contact phone.
     *
     * <p>Phone is profile metadata only. It is not unique and not used for login, but the
     * backend still constrains stored values to a small, readable format so random text,
     * secrets or copied Authorization headers are not persisted in the user profile.</p>
     *
     * @param phone submitted phone value; null or blank clears the saved phone
     * @return trimmed phone or null when clearing
     */
    private String normalizePhone(String phone) {
        if (phone == null || phone.isBlank()) {
            return null;
        }
        String normalized = phone.trim();
        if (normalized.length() < 5 || normalized.length() > 32) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phone length must be 5-32 characters");
        }
        if (!normalized.matches(PHONE_ALLOWED_PATTERN)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phone format is invalid");
        }
        long digitCount = normalized.chars().filter(Character::isDigit).count();
        if (digitCount < 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phone must contain at least 5 digits");
        }
        return normalized;
    }

    private String normalizeAvatarPresetId(String avatarPresetId) {
        if (avatarPresetId == null || avatarPresetId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "avatarPresetId is required");
        }
        String normalized = avatarPresetId.trim().toLowerCase();
        if (!ALLOWED_AVATAR_PRESET_IDS.contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "avatarPresetId is invalid");
        }
        return normalized;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
