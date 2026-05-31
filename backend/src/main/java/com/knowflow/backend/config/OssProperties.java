package com.knowflow.backend.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Aliyun OSS configuration for user avatars.
 *
 * <p>The bucket can be shared with another project safely because KnowFlow writes only under
 * avatarPrefix, defaulting to knowflow/avatars. Access keys are only used server-side and are
 * never returned by any API.</p>
 */
@Data
@ConfigurationProperties(prefix = "knowflow.oss")
public class OssProperties {
    private String endpoint;
    private String bucket;
    private String accessKeyId;
    private String accessKeySecret;
    private String avatarPrefix = "knowflow/avatars";
    private Long signedUrlTtlSeconds = 3600L;
}
