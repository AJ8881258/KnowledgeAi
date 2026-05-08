package com.knowflow.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;

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
                // 配置接口访问权限
                .authorizeHttpRequests(auth -> auth
                        // 允许所有人访问知识库列表
                        .requestMatchers(HttpMethod.GET, "/api/knowledge-bases").permitAll()
                        // 允许所有人访问知识库详情，例如 /api/knowledge-bases/1
                        .requestMatchers(HttpMethod.GET, "/api/knowledge-bases/*").permitAll()
                        // 允许所有人登录
                        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                        // 除了上面两个 GET 接口，其他请求都必须登录
                        .anyRequest().authenticated())
                // 构建 SecurityFilterChain
                .build();
    }
}
