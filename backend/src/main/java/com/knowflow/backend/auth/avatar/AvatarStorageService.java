package com.knowflow.backend.auth.avatar;

import org.springframework.web.multipart.MultipartFile;

/**
 * Stores and signs user avatar objects.
 *
 * <p>The database keeps only object keys. Implementations are responsible for upload,
 * best-effort delete and generating short-lived display URLs.</p>
 */
public interface AvatarStorageService {
    String upload(Long userId, MultipartFile file);

    void delete(String objectKey);

    String createSignedUrl(String objectKey);

    boolean isConfigured();
}
