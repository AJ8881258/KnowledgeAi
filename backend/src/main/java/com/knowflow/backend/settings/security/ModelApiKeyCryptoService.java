package com.knowflow.backend.settings.security;

import com.knowflow.backend.config.ModelSecurityProperties;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * @Desc 用户模型 API Key 加密服务。API Key 只允许以 AES-GCM 密文落库，明文只在后端调用模型时短暂解密使用。
 */
@Service
public class ModelApiKeyCryptoService {
    private static final String ALGORITHM = "AES";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";

    private static final int IV_BYTES = 12;
    private static final int TAG_BITS = 128;

    private final ModelSecurityProperties properties;
    private final SecureRandom secureRandom = new SecureRandom();

    public ModelApiKeyCryptoService(ModelSecurityProperties properties) {
        this.properties = properties;
    }

    /**
     * @param plaintext 用户输入的 API Key 明文
     * @return 可保存到数据库的密文
     * @Desc API Key 属于敏感配置，只能加密落库，不能原样保存。
     */
    public String encrypt(String plaintext) {
        if (!hasText(plaintext)) {
            return null;
        }
        SecretKeySpec key = secretKeyOrFail();
        try {
            // AES-GCM 每次保存都使用随机 IV，相同 API Key 重复保存也不会得到相同密文。
            byte[] iv = new byte[IV_BYTES];
            secureRandom.nextBytes(iv);
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            byte[] encrypted = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            // 数据库只保存 iv.ciphertext 格式的密文，接口响应只返回配置状态，不返回这里的任何内容。
            return Base64.getEncoder().encodeToString(iv) + "." + Base64.getEncoder().encodeToString(encrypted);
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Model API key encryption failed");
        }
    }

    /**
     * @param encryptedValue 数据库中的 API Key 密文
     * @return 调用模型供应商时使用的 API Key 明文
     * @Desc 明文只在后端调用模型时短暂使用，不返回给前端。
     */
    public String decrypt(String encryptedValue) {
        if (!hasText(encryptedValue)) {
            return null;
        }
        SecretKeySpec key = secretKeyOrFail();
        try {
            String[] parts = encryptedValue.split("\\.", 2);
            byte[] iv = Base64.getDecoder().decode(parts[0]);
            byte[] encrypted = Base64.getDecoder().decode(parts[1]);
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Model API key decrypt failed");
        }
    }

    /**
     * @return AES 密钥对象
     * @Desc 没有配置加密密钥时拒绝保存 API Key，避免把敏感信息明文或不可恢复地写入数据库。
     */
    private SecretKeySpec secretKeyOrFail() {
        if (!hasText(properties.getSecretKey())) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Model API key encryption secret is missing");
        }
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(properties.getSecretKey().getBytes(StandardCharsets.UTF_8));
            return new SecretKeySpec(digest, ALGORITHM);
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Model API key encryption secret is invalid");
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
