package com.knowflow.backend.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI 配置类
 * 用于配置 OpenAPI 文档，包括 API 信息、安全要求和 JWT 认证
 */
@Configuration
public class OpenApiConfig {

    private static final String BEARER_AUTH = "bearerAuth";

    /**
     * 配置 OpenAPI 文档
     * 用于生成 OpenAPI 文档，包括 API 信息、安全要求和 JWT 认证
     */
    @Bean
    OpenAPI knowFlowOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("KnowFlow AI API")
                        .version("v1")
                        .description("OpenAPI documentation for the KnowFlow AI backend."))
                // JWT auth is declared once so Swagger UI can send Authorization: Bearer <token> for protected APIs.
                .addSecurityItem(new SecurityRequirement().addList(BEARER_AUTH))
                .schemaRequirement(BEARER_AUTH, new SecurityScheme()
                        .name(BEARER_AUTH)
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT"));
    }
}
