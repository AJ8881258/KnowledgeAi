package com.knowflow.backend.config;

import java.nio.charset.StandardCharsets;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.web.SecurityFilterChain;

import com.nimbusds.jose.jwk.source.ImmutableSecret;

// 告诉 Spring：这是一个配置类
@Configuration
public class SecurityConfig {
    // 声明一个 Spring Security 的过滤链
    // Spring Security 会用它决定哪些请求能访问，哪些请求要登录
    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                // 关闭 CSRF防护
                // 当前是前后端分离 REST API，先关闭，避免 POST/PUT 请求被 403 拦截
                .csrf(AbstractHttpConfigurer::disable)
                // 关闭 Spring Security 默认表单登录页("/login")
                .formLogin(AbstractHttpConfigurer::disable)
                // 关闭 HTTP Basic 登录
                // 避免浏览器弹出用户名/密码输入框
                .httpBasic(AbstractHttpConfigurer::disable)
                // 关闭默认 /logout
                // 以后 JWT 模式下，前端通常删除 token 就算退出
                .logout(AbstractHttpConfigurer::disable)
                // JWT 不依赖后端 session，每次请求都通过 Authorization 请求头识别身份
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                /**
                 * @Desc Spring Security 在请求到达 Controller 之前就能拦截住的情况，
                 *       跟 GlobalExceptionHandler 不同。
                 */
                .exceptionHandling(
                        /**
                         * @Desc 处理未授权异常未登录用户访问需要认证的接口
                         */
                        exceptions -> exceptions
                                .authenticationEntryPoint((request, response, authException) -> {
                                    response.setStatus(HttpStatus.UNAUTHORIZED.value()); //401
                                    response.setContentType(MediaType.APPLICATION_JSON_VALUE); // 响应内容为 JSON 格式
                                    response.setCharacterEncoding(StandardCharsets.UTF_8.name()); // 编码为 UTF-8
                                    response.getWriter().write("{\"message\":\"Unauthorized\"}"); // 响应体
                                })
                                /**
                                 * @Desc 已登录但权限不足
                                 */
                                .accessDeniedHandler((request, response, exception) -> {
                                    response.setStatus(HttpStatus.FORBIDDEN.value()); //403
                                    response.setContentType(MediaType.APPLICATION_JSON_VALUE); // 响应内容为 JSON 格式
                                    response.setCharacterEncoding(StandardCharsets.UTF_8.name()); // 编码为 UTF-8
                                    response.getWriter().write("{\"message\":\"Forbidden\"}"); // 响应体
                                }))
                // 配置接口访问权限
                .authorizeHttpRequests(auth -> auth
                        // 允许所有人登录
                        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/register").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/reset-password").permitAll()
                        .requestMatchers(HttpMethod.GET,"/api/health").permitAll()
                        // Swagger/OpenAPI is public for local development so the API contract can be inspected before logging in.
                        .requestMatchers(
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html").permitAll()
                        // 除了上面 接口，其他请求都必须登录
                        .anyRequest().authenticated())
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> {
                }))
                // 构建 SecurityFilterChain
                .build();
    }

    /**
     * @Desc 密码加密
     * @return
     */
    @Bean
    PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }

    /**
     * @Desc JWT 编码器
     * @param jwtProperties
     * @return
     */
    @Bean
    JwtEncoder jwtEncoder(JwtProperties jwtProperties) {
        SecretKey secretKey = new SecretKeySpec(
                jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8),
                "HmacSHA256");

        return new NimbusJwtEncoder(new ImmutableSecret<>(secretKey));
    }

    /**
     * @Desc JWT 解码器
     * @param jwtProperties
     * @return
     */
    @Bean
    JwtDecoder jwtDecoder(JwtProperties jwtProperties) {
        SecretKey secretKey = new SecretKeySpec(
                jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8),
                "HmacSHA256");
        return NimbusJwtDecoder.withSecretKey(secretKey)
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
    }
}
