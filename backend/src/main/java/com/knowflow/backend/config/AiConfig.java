package com.knowflow.backend.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;


/**
 * AI 配置类
 * 用于启用 AI 配置属性和模型安全配置属性
 */
@Configuration
@EnableConfigurationProperties({AiProperties.class,ModelSecurityProperties.class})
public class AiConfig {
}
