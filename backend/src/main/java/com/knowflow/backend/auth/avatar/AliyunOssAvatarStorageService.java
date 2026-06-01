package com.knowflow.backend.auth.avatar;

import com.aliyun.oss.OSS;
import com.aliyun.oss.OSSClientBuilder;
import com.aliyun.oss.model.ObjectMetadata;
import com.knowflow.backend.config.OssProperties;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.URL;
import java.time.Instant;
import java.util.Date;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import static com.knowflow.backend.common.utils.Utils.hasText;

@Service
public class AliyunOssAvatarStorageService implements AvatarStorageService {
    private static final String STORAGE_NOT_CONFIGURED_MESSAGE = "头像上传需要先配置 OSS 存储。";
    private static final long MAX_AVATAR_BYTES = 2L * 1024L * 1024L;
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("image/jpeg", "image/png", "image/webp");

    private final OssProperties properties;

    public AliyunOssAvatarStorageService(OssProperties properties) {
        this.properties = properties;
    }

    /**
     * @param userId 当前用户 ID，用于写入独立 OSS 前缀
     * @param file 前端上传的头像文件
     * @return 保存到数据库的 OSS object key
     * @Desc 真实密钥只在后端使用。即使 bucket 和其他项目共用，也通过 avatarPrefix/userId 隔离对象路径。
     */
    @Override
    public String upload(Long userId, MultipartFile file) {
        ensureConfigured();
        validateFile(file);
        String objectKey = buildObjectKey(userId, file.getContentType());
        OSS client = createClient();
        try {
            ObjectMetadata metadata = new ObjectMetadata();
            metadata.setContentLength(file.getSize());
            metadata.setContentType(file.getContentType());
            client.putObject(properties.getBucket(), objectKey, file.getInputStream(), metadata);
            return objectKey;
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Avatar upload failed");
        } finally {
            client.shutdown();
        }
    }

    /**
     * @param objectKey 数据库保存的 OSS object key
     * @Desc 删除头像时尽力删除旧对象。OSS 删除失败不应泄露 bucket、endpoint 或 AccessKey。
     */
    @Override
    public void delete(String objectKey) {
        if (!hasText(objectKey) || !isConfigured()) {
            return;
        }
        OSS client = createClient();
        try {
            client.deleteObject(properties.getBucket(), objectKey);
        } catch (RuntimeException ignored) {
            // Deleting old avatars is best-effort; user-facing state is the DB object key.
        } finally {
            client.shutdown();
        }
    }

    /**
     * @param objectKey 数据库保存的 OSS object key
     * @return 短期签名 URL
     * @Desc 前端只拿临时显示地址。URL 过期后重新请求 /auth/me 即可刷新，不需要保存永久地址。
     */
    @Override
    public String createSignedUrl(String objectKey) {
        if (!hasText(objectKey) || !isConfigured()) {
            return null;
        }
        OSS client = createClient();
        try {
            long ttlSeconds = properties.getSignedUrlTtlSeconds() == null
                    ? 3600L
                    : Math.max(60L, properties.getSignedUrlTtlSeconds());
            Date expiration = Date.from(Instant.now().plusSeconds(ttlSeconds));
            URL url = client.generatePresignedUrl(properties.getBucket(), objectKey, expiration);
            return url == null ? null : url.toString();
        } finally {
            client.shutdown();
        }
    }

    @Override
    public boolean isConfigured() {
        return hasText(properties.getEndpoint())
                && hasText(properties.getBucket())
                && hasText(properties.getAccessKeyId())
                && hasText(properties.getAccessKeySecret());
    }

    private void ensureConfigured() {
        if (!isConfigured()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, STORAGE_NOT_CONFIGURED_MESSAGE);
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "avatar file is required");
        }
        if (file.getSize() > MAX_AVATAR_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "avatar file is too large");
        }
        String contentType = file.getContentType();
        if (!ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "avatar file type is not supported");
        }
        if (!hasMatchingMagicNumber(file, contentType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "avatar file type is not supported");
        }
    }

    /**
     * @param file 前端上传的头像二进制
     * @param contentType 浏览器声明的 MIME 类型
     * @return true 表示 MIME 与文件头一致
     * @Desc Content-Type 可以被伪造，所以后端还要检查 JPEG/PNG/WebP 魔数，避免把非图片内容上传到 OSS 后再通过签名 URL 分发。
     */
    private boolean hasMatchingMagicNumber(MultipartFile file, String contentType) {
        try {
            byte[] header = file.getInputStream().readNBytes(12);
            return switch (contentType) {
                case "image/jpeg" -> header.length >= 3
                        && (header[0] & 0xFF) == 0xFF
                        && (header[1] & 0xFF) == 0xD8
                        && (header[2] & 0xFF) == 0xFF;
                case "image/png" -> header.length >= 8
                        && (header[0] & 0xFF) == 0x89
                        && header[1] == 0x50
                        && header[2] == 0x4E
                        && header[3] == 0x47
                        && header[4] == 0x0D
                        && header[5] == 0x0A
                        && header[6] == 0x1A
                        && header[7] == 0x0A;
                case "image/webp" -> header.length >= 12
                        && header[0] == 0x52
                        && header[1] == 0x49
                        && header[2] == 0x46
                        && header[3] == 0x46
                        && header[8] == 0x57
                        && header[9] == 0x45
                        && header[10] == 0x42
                        && header[11] == 0x50;
                default -> false;
            };
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "avatar file type is not supported");
        }
    }

    private String buildObjectKey(Long userId, String contentType) {
        String extension = switch (contentType == null ? "" : contentType.toLowerCase(Locale.ROOT)) {
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            default -> "jpg";
        };
        String prefix = hasText(properties.getAvatarPrefix()) ? properties.getAvatarPrefix().trim() : "knowflow/avatars";
        while (prefix.endsWith("/")) {
            prefix = prefix.substring(0, prefix.length() - 1);
        }
        return "%s/%d/%s.%s".formatted(prefix, userId, UUID.randomUUID(), extension);
    }

    private OSS createClient() {
        return new OSSClientBuilder().build(
                properties.getEndpoint(),
                properties.getAccessKeyId(),
                properties.getAccessKeySecret()
        );
    }
}
