package com.knowflow.backend.config;

import java.nio.charset.StandardCharsets;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
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
                // 关闭 CSRF
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
                // 配置接口访问权限
                .authorizeHttpRequests(auth -> auth
                        // 允许所有人访问知识库列表
                        .requestMatchers(HttpMethod.GET, "/api/knowledge-bases").permitAll()
                        // 允许所有人访问知识库详情，例如 /api/knowledge-bases/1
                        .requestMatchers(HttpMethod.GET, "/api/knowledge-bases/*").permitAll()
                        // 允许所有人登录
                        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                        .requestMatchers(HttpMethod.POST,"/api/auth/register").permitAll()
                        .requestMatchers(HttpMethod.POST,"/api/auth/reset-password").permitAll()
                        // 除了上面 接口，其他请求都必须登录
                        .anyRequest().authenticated())
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> {}))
                // 构建 SecurityFilterChain
                .build();
    }

    @Bean
    PasswordEncoder passwordEncoder(){
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }

    @Bean
    JwtEncoder jwtEncoder(JwtProperties jwtProperties) {
        SecretKey secretKey = new SecretKeySpec(
                jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8),
                "HmacSHA256");

        return new NimbusJwtEncoder(new ImmutableSecret<>(secretKey));
    }

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
